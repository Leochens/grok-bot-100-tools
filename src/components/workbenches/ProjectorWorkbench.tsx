"use client";
import { tools } from "@/data/tools";
import { ToolShell } from "../ToolShell";
import { useLanguage } from "../LanguageProvider";
import {
  ExportBar,
  Field,
  LocalStatus,
  NumberField,
  useLocalDraft,
} from "./shared";
import {
  PROJECTOR_ZONES,
  analyzeProjector,
  projectorAdvice,
  projectorCsv,
  projectorGrid,
  toMillimeters,
  type ProjectorReading,
  type ProjectorReport,
  type ProjectorUnit,
} from "@/lib/engines/projector";

const blank = PROJECTOR_ZONES.map((z) => ({
  zone: z.id,
  width: "",
  height: "",
}));
const initial = {
  unit: "cm",
  target: 5,
  widthMm: 600,
  heightMm: 450,
  tolerancePct: 0.5,
  readings: blank,
};
const sample = {
  ...initial,
  readings: PROJECTOR_ZONES.map((z) => ({
    zone: z.id,
    width: (5.05 + z.row * 0.04).toFixed(2),
    height: (5 + z.col * 0.02).toFixed(2),
  })),
};
const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
export function ProjectorWorkbench() {
  const { t } = useLanguage();
  const {
    state: s,
    set,
    reset,
    ready,
    stored,
  } = useLocalDraft("one-hundred:projector:v1", initial, {
    readings: blank[0],
  });
  let chart = "",
    chartError = "",
    measurementError = "";
  let report: ProjectorReport | undefined;
  const readings: ProjectorReading[] = [];
  let squareMm = NaN;
  try {
    squareMm = toMillimeters(s.target, s.unit as ProjectorUnit);
    chart = projectorGrid({
      widthMm: s.widthMm,
      heightMm: s.heightMm,
      squareMm,
    });
  } catch {
    chartError = t(
      "Use a 5–500 mm square and a chart at least three squares + 40 mm in each direction (maximum 3000 mm).",
      "方格需为 5–500 mm；图表宽高均需至少三个方格加 40 mm，最大 3000 mm。",
    );
  }
  try {
    for (const row of s.readings) {
      if (!row.width.trim() && !row.height.trim()) continue;
      readings.push({
        zone: row.zone,
        widthMm: toMillimeters(Number(row.width), s.unit as ProjectorUnit),
        heightMm: toMillimeters(Number(row.height), s.unit as ProjectorUnit),
      });
    }
    if (readings.length)
      report = analyzeProjector(squareMm, readings, s.tolerancePct);
    else if (
      !Number.isFinite(s.tolerancePct) ||
      s.tolerancePct < 0 ||
      s.tolerancePct > 10
    )
      throw new Error("tolerance");
  } catch {
    measurementError = t(
      "Complete both dimensions of each measured square with positive numbers (up to 10000 mm). Tolerance must be 0–10%. Leave both fields blank for an unmeasured zone.",
      "每个已测方格的宽高都需填写正数（不超过 10000 mm）；容差需为 0–10%。未测区域请将宽高均留空。",
    );
  }
  const updateReading = (
    index: number,
    patch: Partial<(typeof blank)[number]>,
  ) =>
    set((state) => ({
      ...state,
      readings: state.readings.map((r, i) =>
        i === index ? { ...r, ...patch } : r,
      ),
    }));
  const validReport = !!report && !measurementError && !chartError;
  const json = validReport
    ? JSON.stringify(
        {
          version: 1,
          units: "mm",
          chart: { widthMm: s.widthMm, heightMm: s.heightMm, squareMm },
          readings,
          report,
          recommendations: projectorAdvice(report!),
        },
        null,
        2,
      )
    : "";
  return (
    <ToolShell
      tool={tools.find((x) => x.day === 15)!}
      onSample={() => set(sample)}
      onReset={reset}
    >
      <div className="wb-layout">
        <section className="wb-panel">
          <h2>{t("1. Set up the test chart", "1. 设置校准图")}</h2>
          <p>
            {t(
              "Project the SVG onto a flat cutting mat using your sewing setup. Measure the line centers of the nine labeled squares with a ruler. A1 is top left as seen on the chart.",
              "用实际缝纫投影设置将 SVG 投到平整裁剪垫上。用尺测量九个标记方格的线条中心间距。图中 A1 为左上角。",
            )}
          </p>
          <Field label={t("Measurement unit", "测量单位")}>
            <select
              value={s.unit}
              onChange={(e) => {
                const unit = e.target.value as ProjectorUnit;
                const factor =
                  { mm: 1, cm: 10, in: 25.4 }[s.unit as ProjectorUnit] /
                  { mm: 1, cm: 10, in: 25.4 }[unit];
                const convert = (value: string) =>
                  value.trim() && Number.isFinite(Number(value))
                    ? String(Number((Number(value) * factor).toPrecision(12)))
                    : value;
                set({
                  unit,
                  target: Number((s.target * factor).toPrecision(12)),
                  readings: s.readings.map((r) => ({
                    ...r,
                    width: convert(r.width),
                    height: convert(r.height),
                  })),
                });
              }}
            >
              <option value="mm">mm</option>
              <option value="cm">cm</option>
              <option value="in">{t("inches", "英寸")}</option>
            </select>
          </Field>
          <NumberField
            label={t(
              `Target square side (${s.unit})`,
              `目标方格边长（${s.unit}）`,
            )}
            value={s.target}
            min={0}
            onChange={(target) => set({ target })}
          />
          <div className="wb-fields">
            <NumberField
              label={t("Chart width (mm)", "图表宽度（mm）")}
              value={s.widthMm}
              onChange={(widthMm) => set({ widthMm })}
            />
            <NumberField
              label={t("Chart height (mm)", "图表高度（mm）")}
              value={s.heightMm}
              onChange={(heightMm) => set({ heightMm })}
            />
          </div>
          <NumberField
            label={t("Allowed error (%)", "允许误差（%）")}
            value={s.tolerancePct}
            min={0}
            max={10}
            onChange={(tolerancePct) => set({ tolerancePct })}
          />
          {chartError && (
            <p role="alert" className="wb-error">
              {chartError}
            </p>
          )}
          {chart && (
            <div
              className="wb-svg-preview"
              role="img"
              aria-label={t(
                "Calibration chart preview — display size is not physical scale",
                "校准图预览，显示大小并非实际比例",
              )}
              dangerouslySetInnerHTML={{ __html: chart }}
            />
          )}
          <p className="muted">
            {t(
              "SVG coordinates and physical dimensions are in millimeters. This preview fits the screen. Project the downloaded chart, adjust zoom against a ruler, then lock zoom and orientation. Screen pixels and browser 100% zoom do not guarantee physical size.",
              "SVG 坐标及物理尺寸均为毫米。此预览适配屏幕。请投影下载的图表，用尺校准缩放后锁定缩放和方向；屏幕像素和浏览器 100% 缩放不保证物理尺寸。",
            )}
          </p>
          <ExportBar
            name="projector-grid.svg"
            content={chart}
            mime="image/svg+xml"
            disabled={!ready || !chart}
          />
        </section>
        <section className="wb-panel">
          <h2>{t("2. Measure across the mat", "2. 测量垫面各区")}</h2>
          <p>
            {t(
              "Leave unmeasured zones blank. Changing units converts the readings; changing the target or chart requires new physical measurements.",
              "未测区域留空。切换单位会换算读数；改变目标边长或图表后需重新实测。",
            )}
          </p>
          <div className="wb-table-scroll">
            <table className="wb-table">
              <thead>
                <tr>
                  <th>{t("Zone", "区域")}</th>
                  <th>{t(`Width (${s.unit})`, `宽（${s.unit}）`)}</th>
                  <th>{t(`Height (${s.unit})`, `高（${s.unit}）`)}</th>
                </tr>
              </thead>
              <tbody>
                {s.readings.map((r, i) => {
                  const z = PROJECTOR_ZONES.find((z) => z.id === r.zone);
                  if (!z) return null;
                  return (
                    <tr key={i}>
                      <th scope="row">
                        {z.code} · {t(z.en, z.zh)}
                      </th>
                      {(["width", "height"] as const).map((axis) => (
                        <td key={axis}>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            aria-label={t(
                              `${z.en} ${axis} (${s.unit})`,
                              `${z.zh}${axis === "width" ? "宽" : "高"}（${s.unit}）`,
                            )}
                            value={r[axis]}
                            onChange={(e) =>
                              updateReading(i, { [axis]: e.target.value })
                            }
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {measurementError && (
            <p role="alert" className="wb-error">
              {measurementError}
            </p>
          )}
          <h2>{t("3. Live error report", "3. 实时误差报告")}</h2>
          {!readings.length && !measurementError && (
            <p>
              {t(
                "Enter a measured width and height to start. No measurements have been assumed.",
                "填写实测宽高开始分析。工具不会假定测量值。",
              )}
            </p>
          )}
          {validReport && (
            <>
              <p role="status" className="wb-calculation">
                {report!.status === "adjust"
                  ? t("Adjustment needed", "需要调整")
                  : report!.status === "incomplete"
                    ? t(
                        "Measured zones within tolerance; coverage incomplete",
                        "已测区域在容差内，覆盖尚不完整",
                      )
                    : t(
                        "All nine zones within tolerance",
                        "九个区域均在容差内",
                      )}{" "}
                · {report!.measuredZones}/9 {t("zones measured", "区域已测")}
              </p>
              <div className="wb-stats" aria-live="polite">
                <div>
                  {t("Mean linear scale error", "平均线性比例误差")}
                  <strong>{pct(report!.scaleErrorPct)}</strong>
                </div>
                <div>
                  {t("Horizontal error", "横向误差")}
                  <strong>{pct(report!.xErrorPct)}</strong>
                </div>
                <div>
                  {t("Vertical error", "纵向误差")}
                  <strong>{pct(report!.yErrorPct)}</strong>
                </div>
                <div>
                  {t("Aspect stretch (X/Y − 1)", "宽高拉伸（X/Y − 1）")}
                  <strong>{pct(report!.aspectStretchPct)}</strong>
                </div>
                <div>
                  {t("Worst measured deviation", "最大实测偏差")}
                  <strong>{report!.maxErrorPct.toFixed(2)}%</strong>
                </div>
              </div>
              <p>
                {t(
                  "Multiply current X / Y scale by",
                  "当前横向 / 纵向缩放乘以",
                )}{" "}
                <strong>
                  {report!.correctionX.toFixed(5)} /{" "}
                  {report!.correctionY.toFixed(5)}
                </strong>
                .{" "}
                {t(
                  "Average corrections are starting points; fix edge differences before final scale calibration.",
                  "平均补偿仅作起点；最终比例校准前先修正边缘差异。",
                )}
              </p>
              <p>
                {t(
                  "Vertical keystone indicator (bottom − top width)",
                  "垂直梯形指示（下边宽 − 上边宽）",
                )}
                :{" "}
                <strong>
                  {report!.verticalKeystone.differencePct === null
                    ? t("Need opposite edges", "需测相对两边")
                    : pct(report!.verticalKeystone.differencePct)}
                </strong>{" "}
                · {report!.verticalKeystone.pairs}/3{" "}
                {t("matched pairs", "对应组")}
              </p>
              <p>
                {t(
                  "Horizontal keystone indicator (right − left height)",
                  "水平梯形指示（右边高 − 左边高）",
                )}
                :{" "}
                <strong>
                  {report!.horizontalKeystone.differencePct === null
                    ? t("Need opposite edges", "需测相对两边")
                    : pct(report!.horizontalKeystone.differencePct)}
                </strong>{" "}
                · {report!.horizontalKeystone.pairs}/3{" "}
                {t("matched pairs", "对应组")}
              </p>
              <p className="muted">
                {t(
                  "Edge indicators are differences as a percentage of the target side, not tilt angles. Positive errors mean oversized squares. Mean error can cancel; use worst deviation and every zone before cutting.",
                  "边缘指示为差值占目标边长的百分比，并非倾斜角度。正误差表示方格偏大。平均误差可能抵消；裁剪前请检查最大偏差和每个区域。",
                )}
              </p>
              <div className="wb-table-scroll">
                <table className="wb-table">
                  <thead>
                    <tr>
                      <th>{t("Zone", "区域")}</th>
                      <th>{t("X deviation", "横向偏差")}</th>
                      <th>{t("Y deviation", "纵向偏差")}</th>
                      <th>{t("Tolerance", "容差")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report!.zones.map((z) => (
                      <tr key={z.id}>
                        <th scope="row">
                          {z.code} · {t(z.en, z.zh)}
                        </th>
                        <td>{pct(z.xErrorPct)}</td>
                        <td>{pct(z.yErrorPct)}</td>
                        <td>
                          {z.withinTolerance
                            ? t("Within", "范围内")
                            : t("Outside", "超出")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <h3>{t("Adjustment directions", "调整方向")}</h3>
              <ul className="wb-issues">
                {projectorAdvice(report!).map((a, i) => (
                  <li key={i}>{t(a.en, a.zh)}</li>
                ))}
              </ul>
            </>
          )}
          <ExportBar
            name="projector-calibration.json"
            content={json}
            mime="application/json"
            disabled={!ready || !validReport}
          />
          <ExportBar
            name="projector-measurements.csv"
            content={validReport ? projectorCsv(readings, report!) : ""}
            mime="text/csv;charset=utf-8"
            disabled={!ready || !validReport}
          />
          <LocalStatus stored={stored} />
        </section>
      </div>
    </ToolShell>
  );
}
