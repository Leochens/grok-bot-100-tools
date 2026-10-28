"use client";
import { tools } from "@/data/tools";
import {
  CUT_PARTS_SAMPLE,
  CUT_STOCK_SAMPLE,
  cutLayoutSvg,
  cutListCsv,
  cutSchedule,
  parseCutTable,
  solveCuts,
  type CutPlan,
  type Rect,
} from "@/lib/engines/cut-planner";
import { zipFiles } from "@/lib/engines/zip";
import { ToolShell } from "../ToolShell";
import { useLanguage } from "../LanguageProvider";
import {
  download,
  ExportBar,
  Field,
  LocalStatus,
  NumberField,
  TextImport,
  useLocalDraft,
} from "./shared";
import { BatchError } from "./batch-shared";
const initial = {
  mode: "2d" as "1d" | "2d",
  parts: "",
  stocks: "",
  kerf: 3.2,
  step: 1,
  selected: "",
  stockIndex: 0,
};
export function CutPlannerWorkbench() {
  const { t } = useLanguage(),
    {
      state: s,
      set,
      reset,
      stored,
    } = useLocalDraft("one-hundred:cut-planner:v1", initial);
  let error = "",
    plan: CutPlan | undefined;
  try {
    if (s.parts.trim() && s.stocks.trim())
      plan = solveCuts(
        parseCutTable(s.parts),
        parseCutTable(s.stocks, true),
        s.mode,
        s.kerf,
      );
  } catch (e) {
    error = (e as Error).message;
  }
  const layout = plan?.layouts[s.stockIndex] || plan?.layouts[0];
  return (
    <ToolShell
      tool={tools.find((x) => x.day === 14)!}
      onSample={() =>
        set({ ...initial, parts: CUT_PARTS_SAMPLE, stocks: CUT_STOCK_SAMPLE })
      }
      onReset={reset}
    >
      <nav className="wb-steps" aria-label={t("Planning steps", "规划步骤")}>
        {[
          t("1. Stock & parts", "1. 原料与零件"),
          t("2. Cut layouts", "2. 下料布局"),
          t("3. Shop schedule & export", "3. 切割顺序与导出"),
        ].map((label, i) => (
          <button
            key={i}
            className={"button " + (s.step === i + 1 ? "primary" : "")}
            aria-current={s.step === i + 1 ? "step" : undefined}
            onClick={() => set({ step: i + 1 })}
          >
            {label}
          </button>
        ))}
      </nav>
      <BatchError code={error} />
      {s.step === 1 && (
        <div className="wb-layout">
          <section className="wb-panel">
            <h2>{t("Parts required", "所需零件")}</h2>
            <Field label={t("Planning mode", "规划模式")}>
              <select
                value={s.mode}
                onChange={(e) =>
                  set({
                    mode: e.target.value as typeof s.mode,
                    selected: "",
                    stockIndex: 0,
                  })
                }
              >
                <option value="1d">
                  {t(
                    "1D linear stock — boards / extrusion",
                    "一维条材：木板 / 型材",
                  )}
                </option>
                <option value="2d">
                  {t(
                    "2D sheet goods — plywood / MDF",
                    "二维板材：胶合板 / 密度板",
                  )}
                </option>
              </select>
            </Field>
            <TextImport
              label={t(
                "Parts CSV: name,length_mm,width_mm,quantity,grain_locked (yes/no)",
                "零件 CSV：名称,长mm,宽mm,数量,锁定纹理（yes/no）",
              )}
              accept=".csv,.tsv,.txt"
              value={s.parts}
              onChange={(parts) => set({ parts, selected: "" })}
            />
            <p>
              {t(
                "No header row. Grain runs along the length axis. Locked parts cannot rotate. In 1D mode width is ignored; group matching material and cross-section in separate plans.",
                "不含标题行。纹理沿长度方向，锁定纹理的零件不能旋转。一维模式忽略宽度，请按相同材料和截面分别规划。",
              )}
            </p>
            <NumberField
              label={t("Blade kerf (mm)", "锯缝宽度（mm）")}
              value={s.kerf}
              min={0}
              max={100}
              onChange={(kerf) => set({ kerf })}
            />
          </section>
          <section className="wb-panel">
            <h2>{t("Available stock", "可用原料")}</h2>
            <TextImport
              label={t(
                "Stock CSV: name,length_mm,width_mm,quantity",
                "原料 CSV：名称,长mm,宽mm,数量",
              )}
              accept=".csv,.tsv,.txt"
              value={s.stocks}
              onChange={(stocks) => set({ stocks, stockIndex: 0 })}
            />
            <p>
              {t(
                "All dimensions are millimeters. Plans assume square factory edges and matching thickness/material. Subtract edge-trim allowance from usable stock dimensions first. The deterministic first-fit decreasing guillotine heuristic does not guarantee the minimum stock count.",
                "所有尺寸均为毫米。假定原料边缘方正且材质、厚度一致；请先从可用原料尺寸中扣除修边余量。确定性的降序首次适应直切算法不保证原料数量最少。",
              )}
            </p>
            <button
              className="button primary"
              disabled={!plan || !plan.layouts.length}
              onClick={() => set({ step: 2 })}
            >
              {t("Calculate & review layouts", "计算并查看布局")}
            </button>
          </section>
        </div>
      )}
      {plan && (
        <section className="wb-panel" aria-live="polite">
          <p>
            {t("Stock used", "已用原料")}: {plan.layouts.length} ·{" "}
            {t("Material utilization", "材料利用率")}:{" "}
            {(plan.utilization * 100).toFixed(2)}% ·{" "}
            {t("Unplaced parts", "未放置零件")}: {plan.unplaced.length}
          </p>
          {!!plan.unplaced.length && (
            <p className="wb-error" role="alert">
              {t(
                "Incomplete plan — add stock or revise dimensions: ",
                "方案不完整，请增加原料或修改尺寸：",
              )}
              {plan.unplaced.join(", ")}
            </p>
          )}
        </section>
      )}
      {s.step === 2 && (
        <section className="wb-panel">
          <h2>{t("Interactive cut layouts", "交互下料图")}</h2>
          <p>
            {t(
              "Select a part or offcut to inspect its exact coordinates. Blue: parts. Green: reusable offcuts. Red: kerf waste.",
              "选择零件或余料可查看精确坐标。蓝色为零件，绿色为可复用余料，红色为锯缝损耗。",
            )}
          </p>
          {s.mode === "1d" && (
            <p>
              {t(
                "Board height is exaggerated for readability; x coordinates and lengths are exact.",
                "条材显示高度经过放大，x 坐标与长度均为实际尺寸。",
              )}
            </p>
          )}
          {plan?.layouts.map((l, li) => {
            const height =
                s.mode === "1d" ? Math.max(40, l.length / 20) : l.width,
              scale = height / l.width;
            const showRect = (
              r: Rect,
              fill: string,
              label: string,
              key: string,
            ) => {
              const selected = s.selected === key;
              const select = () => set({ selected: key, stockIndex: li });
              return (
                <g
                  key={key}
                  role="button"
                  tabIndex={0}
                  aria-label={label}
                  aria-pressed={selected}
                  onClick={select}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      select();
                    }
                  }}
                >
                  <title>{label}</title>
                  <rect
                    x={r.x}
                    y={r.y * scale}
                    width={r.w}
                    height={r.h * scale}
                    fill={fill}
                    stroke={selected ? "#000" : "#334155"}
                    strokeWidth={selected ? 3 : 0.6}
                  />
                  {r.w > l.length / 18 && (
                    <text
                      x={r.x + 3}
                      y={r.y * scale + Math.min(height / 12, (r.h * scale) / 2)}
                      fontSize={Math.max(2, Math.min(l.length, height) / 25)}
                    >
                      {label.split(" · ")[0]}
                    </text>
                  )}
                </g>
              );
            };
            return (
              <article className="wb-cut-layout" key={li}>
                <h3>
                  {l.name} · {l.length} × {l.width} mm
                </h3>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox={`0 0 ${l.length} ${height}`}
                  aria-label={t(`Cut layout for ${l.name}`, `${l.name} 下料图`)}
                >
                  {l.parts.map((p) =>
                    showRect(
                      p,
                      "#a5d8ff",
                      `${p.name} · ${p.w} × ${p.h} mm @ (${p.x}, ${p.y})${p.rotated ? " ↻" : ""}`,
                      `${li}:part:${p.id}`,
                    ),
                  )}
                  {l.offcuts.map((r, i) =>
                    showRect(
                      r,
                      "#bbf7d0",
                      `${t("Offcut", "余料")} ${i + 1} · ${r.w.toFixed(2)} × ${r.h.toFixed(2)} mm @ (${r.x.toFixed(2)}, ${r.y.toFixed(2)})`,
                      `${li}:offcut:${i}`,
                    ),
                  )}
                  {l.waste.map((r, i) => (
                    <rect
                      key={i}
                      x={r.x}
                      y={r.y * scale}
                      width={r.w}
                      height={r.h * scale}
                      fill="#f87171"
                    >
                      <title>
                        {t("Kerf waste", "锯缝损耗")} {r.w} × {r.h} mm
                      </title>
                    </rect>
                  ))}
                </svg>
                <ExportBar
                  name={`cut-layout-${li + 1}.svg`}
                  content={cutLayoutSvg(l, s.mode)}
                  mime="image/svg+xml"
                />
              </article>
            );
          })}
          {s.selected && layout && (
            <div className="wb-selection" role="status">
              {(() => {
                const [, kind, id] = s.selected.split(":");
                const r =
                  kind === "part"
                    ? layout.parts.find((p) => p.id === Number(id))
                    : layout.offcuts[Number(id)];
                return r
                  ? `${t("Selection", "当前选择")}: x=${r.x.toFixed(2)}, y=${r.y.toFixed(2)}, ${r.w.toFixed(2)} × ${r.h.toFixed(2)} mm`
                  : "";
              })()}
            </div>
          )}
          <button className="button primary" onClick={() => set({ step: 3 })}>
            {t("Review cut sequence →", "查看切割顺序 →")}
          </button>
        </section>
      )}
      {s.step === 3 && (
        <section className="wb-panel">
          <h2>{t("Rip / crosscut schedule", "纵切 / 横切顺序")}</h2>
          <p>
            {t(
              "Follow the listed parent-rectangle cuts in order. Coordinates use the stock’s upper-left origin; kerf is removed on the positive coordinate side. Offcuts are labeled by exact usable size.",
              "按顺序切割每个父矩形。坐标原点在原料左上角，锯缝位于坐标正向一侧。余料标注为实际可用尺寸。",
            )}
          </p>
          {plan?.layouts.map((l, i) => (
            <article key={i}>
              <h3>{l.name}</h3>
              <ol>
                {l.cuts.map((c, j) => (
                  <li key={j}>
                    {t(
                      c.axis === "rip" ? "Rip" : "Crosscut",
                      c.axis === "rip" ? "纵切" : "横切",
                    )}{" "}
                    {s.mode === "1d" || c.axis === "rip" ? "x" : "y"}=
                    {c.coordinate.toFixed(2)} mm · {t("span", "范围")}{" "}
                    {c.from.toFixed(2)}–{c.to.toFixed(2)} mm ·{" "}
                    {t("kerf", "锯缝")} {c.kerf.toFixed(2)} mm · {c.part}
                  </li>
                ))}
              </ol>
              <ul>
                {l.offcuts.map((r, j) => (
                  <li key={j}>
                    {t("Reusable offcut", "可复用余料")} {j + 1}:{" "}
                    {r.w.toFixed(2)} × {r.h.toFixed(2)} mm @ ({r.x.toFixed(2)},{" "}
                    {r.y.toFixed(2)})
                  </li>
                ))}
              </ul>
            </article>
          ))}
          {plan && (
            <>
              <ExportBar
                name="cut-list.csv"
                content={cutListCsv(plan)}
                disabled={!plan.layouts.length}
              />
              <ExportBar
                name="shop-schedule.md"
                content={
                  "# Shop cut schedule\n\n" +
                  (plan.unplaced.length
                    ? "UNPLACED: " + plan.unplaced.join(", ") + "\n\n"
                    : "") +
                  cutSchedule(plan)
                }
                disabled={!plan.layouts.length}
              />
              <ExportBar
                name="cut-plan.json"
                content={JSON.stringify({ inputs: s, plan }, null, 2)}
                disabled={!plan.layouts.length}
              />
              <button
                className="button primary"
                disabled={!plan.layouts.length}
                onClick={() =>
                  download(
                    "shop-diagrams.zip",
                    zipFiles(
                      plan.layouts.map((l, i) => ({
                        name: `stock-${i + 1}.svg`,
                        content: cutLayoutSvg(l, s.mode),
                      })),
                    ),
                    "application/zip",
                  )
                }
              >
                {t(
                  "Download all shop diagrams (SVG ZIP)",
                  "下载全部车间图纸（SVG ZIP）",
                )}
              </button>
            </>
          )}
        </section>
      )}
      <LocalStatus stored={stored} />
    </ToolShell>
  );
}
