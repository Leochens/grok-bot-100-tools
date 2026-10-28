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
  calculateSourdough,
  resolveSourdough,
  SOURDOUGH_SAMPLE,
  SOURDOUGH_CONVENTION,
  sourdoughPercentInput,
  sourdoughRowName,
  sourdoughText,
  sourdoughCsv,
  type SourdoughInput,
  type SourdoughReport,
  type SourdoughScale,
} from "@/lib/engines/sourdough";

const initial: SourdoughInput & {
  scaleMode: SourdoughScale["mode"];
  targetGrams: number;
} = {
  mode: "grams",
  flours: [{ name: "Flour", amount: 0 }],
  water: 0,
  salt: 0,
  starter: 0,
  starterHydrationPct: 100,
  others: [],
  anchor: "totalFlour",
  anchorGrams: 500,
  scaleMode: "none",
  targetGrams: 1000,
};
const display = (n: number) =>
  Number(n.toFixed(3)).toLocaleString("en-US", { maximumFractionDigits: 3 });
export function SourdoughWorkbench() {
  const { t, language } = useLanguage();
  const {
    state: s,
    set,
    reset,
    ready,
    stored,
  } = useLocalDraft("one-hundred:sourdough:v1", initial, {
    flours: { name: "", amount: 0 },
    others: { name: "", amount: 0 },
  });
  let report: SourdoughReport | undefined;
  let error = "";
  let baseValid = false;
  try {
    resolveSourdough(s);
    baseValid = true;
  } catch {
    /* Main calculation reports validation below. */
  }
  try {
    report = calculateSourdough(s, {
      mode: s.scaleMode,
      targetGrams: s.targetGrams,
    });
  } catch (e) {
    error = (e as Error).message;
  }
  const errors: Record<string, string> = {
    amount: t(
      "Use finite, nonnegative amounts: at most 1,000,000 g per row, 10,000% per input, and 10,000,000 g of dough. Reduce the target if a scaled row exceeds the limit.",
      "请输入有效的非负用量：每行最多 1,000,000 克，每项最多 10,000%，面团总重最多 10,000,000 克。缩放后单项超限时请减小目标。",
    ),
    flour: t(
      "Total flour including starter flour must be at least 0.001 g and at most 10,000,000 g.",
      "含酵种面粉的总面粉量需在 0.001–10,000,000 克之间。",
    ),
    hydration: t(
      "Starter hydration must be a finite percentage from 1 to 1,000 (water ÷ flour × 100).",
      "酵种含水量需为 1–1,000% 的有效数值（水÷面粉×100）。",
    ),
    count: t(
      "Use 1–20 flour rows and at most 20 other ingredients.",
      "面粉需有 1–20 行，其他食材最多 20 行。",
    ),
    name: t(
      "Give every row a name of 1–100 characters, without line breaks or control characters.",
      "请为每行填写 1–100 字的名称，不含换行或控制字符。",
    ),
    balance: t(
      "Flour percentages plus starter % ÷ (1 + starter hydration ÷ 100) must equal 100%. Adjust the flour rows or starter percentage together.",
      "面粉各行百分比之和 + 酵种百分比÷（1 + 酵种含水量÷100）必须等于 100%。请配合调整面粉或酵种比例。",
    ),
    anchor: t(
      "Choose a flour or dough anchor greater than zero and at most 10,000,000 g.",
      "请选择面粉或面团基准重量，需大于零且不超过 10,000,000 克。",
    ),
    target: t(
      "The scale target must be greater than zero and at most 10,000,000 g.",
      "缩放目标需大于零，且不超过 10,000,000 克。",
    ),
    factor: t(
      "Scale factor must be between 0.000001 and 1,000,000.",
      "缩放倍数需在 0.000001–1,000,000 之间。",
    ),
  };
  const unit = s.mode === "grams" ? "g" : "%";
  const valid = ready && !!report;
  const editRows = (key: "flours" | "others") => (
    <>
      {s[key].map((row, i) => {
        const label =
          key === "flours"
            ? t("Flour", "面粉")
            : t("Other ingredient", "其他食材");
        const patch = (p: Partial<typeof row>) =>
          set({ [key]: s[key].map((r, j) => (i === j ? { ...r, ...p } : r)) });
        return (
          <div key={`${key}-${i}`}>
            <div className="wb-fields">
              <Field label={`${label} ${i + 1} ${t("name", "名称")}`}>
                <input
                  value={row.name}
                  maxLength={100}
                  onChange={(e) => patch({ name: e.target.value })}
                />
              </Field>
              <NumberField
                label={`${label} ${i + 1} (${unit})`}
                value={row.amount}
                min={0}
                max={s.mode === "grams" ? 1e6 : 1e4}
                onChange={(amount) => patch({ amount })}
              />
            </div>
            <button
              className="button"
              disabled={key === "flours" && s.flours.length === 1}
              onClick={() => set({ [key]: s[key].filter((_, j) => i !== j) })}
            >
              {t("Remove", "移除")} {label} {i + 1}
            </button>
          </div>
        );
      })}
      <button
        className="button"
        disabled={s[key].length >= 20}
        onClick={() => set({ [key]: [...s[key], { name: "", amount: 0 }] })}
      >
        {key === "flours"
          ? t("Add flour", "添加面粉")
          : t("Add other ingredient", "添加其他食材")}
      </button>
    </>
  );
  return (
    <ToolShell
      tool={tools.find((x) => x.day === 17)!}
      onSample={() => set({ ...initial, ...SOURDOUGH_SAMPLE })}
      onReset={reset}
    >
      <div className="wb-layout">
        <section className="wb-panel">
          <h2>{t("1. Enter your formula", "1. 输入配方")}</h2>
          <p>
            {t(
              "Enter bowl additions separately from the starter. Use grams only; no cup-to-mass conversions.",
              "分别输入直接加入碗内的食材与酵种用量。仅用克，不把杯数换算成重量。",
            )}
          </p>
          <Field label={t("Input mode", "输入方式")}>
            <select
              value={s.mode}
              disabled={!baseValid}
              onChange={(e) => {
                if (e.target.value === "percent") set(sourdoughPercentInput(s));
                else set({ ...resolveSourdough(s), mode: "grams" });
              }}
            >
              <option value="grams">{t("Edit grams", "编辑克数")}</option>
              <option value="percent">
                {t("Edit baker’s percentages", "编辑烘焙百分比")}
              </option>
            </select>
          </Field>
          {!baseValid && (
            <p className="muted">
              {t(
                "Correct the formula before switching input modes. You can also load the sample to start.",
                "修正配方后即可切换输入方式，也可以先加载示例。",
              )}
            </p>
          )}
          {s.mode === "percent" && (
            <>
              <p>
                {t(
                  "Every input is % of total flour including starter flour. Flour rows plus the flour hidden in starter must total 100%. Changing water, salt or other ingredients does not change that flour balance.",
                  "每项输入均为占总面粉（含酵种面粉）的百分比。面粉各行加上酵种中的面粉必须合计 100%。修改水、盐或其他食材不会改变面粉合计。",
                )}
              </p>
              <Field label={t("Percentage anchor", "百分比基准")}>
                <select
                  value={s.anchor}
                  onChange={(e) =>
                    set({ anchor: e.target.value as SourdoughInput["anchor"] })
                  }
                >
                  <option value="totalFlour">
                    {t("Total flour including starter", "总面粉（含酵种面粉）")}
                  </option>
                  <option value="dough">
                    {t("Total dough weight", "面团总重")}
                  </option>
                </select>
              </Field>
              <NumberField
                label={t("Anchor weight (g)", "基准重量（克）")}
                value={s.anchorGrams}
                min={0.001}
                max={1e7}
                onChange={(anchorGrams) => set({ anchorGrams })}
              />
            </>
          )}
          <h3>
            {t("Bowl flour (excludes starter)", "直接加入的面粉（不含酵种）")}
          </h3>
          {editRows("flours")}
          <div className="wb-fields">
            <NumberField
              label={`${t("Added water", "另加水量")} (${unit})`}
              value={s.water}
              min={0}
              onChange={(water) => set({ water })}
            />
            <NumberField
              label={`${t("Salt", "盐")} (${unit})`}
              value={s.salt}
              min={0}
              onChange={(salt) => set({ salt })}
            />
            <NumberField
              label={`${t("Starter", "酵种")} (${unit})`}
              value={s.starter}
              min={0}
              onChange={(starter) => set({ starter })}
            />
            <NumberField
              label={t("Starter hydration (%)", "酵种含水量（%）")}
              value={s.starterHydrationPct}
              min={1}
              max={1000}
              onChange={(starterHydrationPct) => set({ starterHydrationPct })}
            />
          </div>
          <h3>
            {t("Other ingredients (weight only)", "其他食材（只计重量）")}
          </h3>
          {editRows("others")}
          <h2>{t("2. Scale the formula", "2. 缩放配方")}</h2>
          <Field label={t("Scale mode", "缩放方式")}>
            <select
              value={s.scaleMode}
              onChange={(e) =>
                set({ scaleMode: e.target.value as SourdoughScale["mode"] })
              }
            >
              <option value="none">
                {t("Keep input weights", "保留输入重量")}
              </option>
              <option value="dough">
                {t("Target total dough weight", "按目标面团总重")}
              </option>
              <option value="totalFlour">
                {t(
                  "Target total flour (includes starter flour)",
                  "按目标总面粉（含酵种面粉）",
                )}
              </option>
            </select>
          </Field>
          {s.scaleMode !== "none" && (
            <NumberField
              label={t("Target weight (g)", "目标重量（克）")}
              value={s.targetGrams}
              min={0.001}
              max={1e7}
              onChange={(targetGrams) => set({ targetGrams })}
            />
          )}
          <p className="muted">
            {t(
              "Scaling multiplies every added ingredient equally. The flour target includes starter flour; starter hydration stays fixed.",
              "缩放时所有投料乘以相同倍数。目标总面粉包含酵种里的面粉；酵种含水量保持不变。",
            )}
          </p>
          {error && (
            <p role="alert" className="wb-error">
              {errors[error] ||
                t("Check the input and scale modes.", "请检查输入和缩放方式。")}
            </p>
          )}
          <LocalStatus stored={stored} />
        </section>
        <section className="wb-panel">
          <h2>{t("3. True formula & exports", "3. 真实配方与导出")}</h2>
          {report ? (
            <>
              <p className="wb-calculation" role="status">
                {t("True hydration", "真实含水量")}:{" "}
                {report.trueHydrationPct.toFixed(3)}% ·{" "}
                {t("Scale factor", "缩放倍数")}: ×{display(report.factor)}
              </p>
              <div className="wb-stats">
                <span>
                  {t("Dough weight", "面团总重")}: {display(report.doughWeight)}{" "}
                  g
                </span>
                <span>
                  {t("Total flour", "总面粉")}: {display(report.totalFlour)} g
                </span>
                <span>
                  {t("Total water", "总水量")}: {display(report.totalWater)} g
                </span>
                <span>
                  {t("Starter / total flour", "酵种占总面粉")}:{" "}
                  {display(report.starterPct)}%
                </span>
                <span>
                  {t("Prefermented flour", "预发酵面粉占比")}:{" "}
                  {display(report.prefermentedFlourPct)}%
                </span>
              </div>
              {!!report.warnings.length && (
                <ul role="alert" className="wb-issues">
                  {report.warnings.map((w) => (
                    <li key={w.code}>{t(w.en, w.zh)}</li>
                  ))}
                </ul>
              )}
              <h3>
                {t(
                  "Added ingredients — weigh these once",
                  "投料表：按此称重，每项只加一次",
                )}
              </h3>
              <div className="wb-table-scroll">
                <table className="wb-table">
                  <thead>
                    <tr>
                      <th>{t("Ingredient", "食材")}</th>
                      <th>{t("Scaled grams", "缩放后克数")}</th>
                      <th>
                        {t(
                          "Baker’s % (total flour)",
                          "烘焙百分比（总面粉基准）",
                        )}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((r, i) => (
                      <tr key={i}>
                        <td style={{ overflowWrap: "anywhere" }}>
                          {sourdoughRowName(r, language)}
                        </td>
                        <td>{display(r.grams)}</td>
                        <td>{display(r.bakersPct)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <h3>
                {t(
                  "Flour & water contributions (already included)",
                  "面粉和水的来源（已计入，勿重复添加）",
                )}
              </h3>
              <div className="wb-table-scroll">
                <table className="wb-table">
                  <thead>
                    <tr>
                      <th>{t("Contribution", "来源")}</th>
                      <th>{t("Bowl additions (g)", "直接加入（克）")}</th>
                      <th>{t("Inside starter (g)", "酵种内含（克）")}</th>
                      <th>{t("Total (g)", "合计（克）")}</th>
                      <th>{t("Baker’s %", "烘焙百分比")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{t("Flour", "面粉")}</td>
                      <td>{display(report.bowlFlour)}</td>
                      <td>{display(report.starterSplit.flour)}</td>
                      <td>{display(report.totalFlour)}</td>
                      <td>100%</td>
                    </tr>
                    <tr>
                      <td>{t("Water", "水")}</td>
                      <td>{display(report.scaled.water)}</td>
                      <td>{display(report.starterSplit.water)}</td>
                      <td>{display(report.totalWater)}</td>
                      <td>{display(report.trueHydrationPct)}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                {t("Added-row percentage sum", "投料行百分比之和")}:{" "}
                {display(report.rowsBakersPctSum)}%
              </p>
            </>
          ) : (
            <p>
              {t(
                "Enter flour and water or load the sample to calculate.",
                "输入面粉和水，或加载示例开始计算。",
              )}
            </p>
          )}
          <p className="muted">{SOURDOUGH_CONVENTION[language]}</p>
          <p className="muted">
            {t(
              "Tables round to 0.001 g / percentage point. JSON and CSV keep unrounded numeric results; text keeps 12 significant digits. Ingredient names are your text and remain unchanged when switching languages.",
              "表格显示到 0.001 克或百分点。JSON、CSV 保留未取整数值，文本保留 12 位有效数字。食材名称是你的输入，切换语言时保持原样。",
            )}
          </p>
          <ExportBar
            name="sourdough-formula.txt"
            content={valid ? sourdoughText(report!, language) : ""}
            disabled={!valid}
          />
          <ExportBar
            name="sourdough-report.json"
            content={valid ? JSON.stringify(report, null, 2) : ""}
            mime="application/json"
            disabled={!valid}
          />
          <ExportBar
            name="sourdough-ingredients.csv"
            content={valid ? sourdoughCsv(report!, language) : ""}
            mime="text/csv;charset=utf-8"
            disabled={!valid}
          />
        </section>
      </div>
    </ToolShell>
  );
}
