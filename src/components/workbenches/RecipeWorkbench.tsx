"use client";
import { useMemo } from "react";
import { tools } from "@/data/tools";
import { ToolShell } from "../ToolShell";
import { useLanguage } from "../LanguageProvider";
import {
  ExportBar,
  Field,
  LocalStatus,
  NumberField,
  TextImport,
  useLocalDraft,
} from "./shared";
import {
  RECIPE_SAMPLE,
  parseRecipe,
  recipeCsv,
  recipeText,
  recipeUnitsFor,
  scaleRecipe,
  type RecipeReport,
  type RecipeUnit,
} from "@/lib/engines/recipe";

const initial = {
  raw: "",
  mode: "servings",
  originalServings: 4,
  targetServings: 4,
  pivotLine: 2,
  desiredAmount: "1",
  desiredUnit: "cup",
};
const sample = { ...initial, raw: RECIPE_SAMPLE, desiredAmount: "1 1/2" };

export function RecipeWorkbench() {
  const { t, language } = useLanguage();
  const {
    state: s,
    set,
    reset,
    ready,
    stored,
  } = useLocalDraft("one-hundred:recipe:v1", initial);
  const calculation = useMemo(() => {
    try {
      const rows = parseRecipe(s.raw);
      const report = scaleRecipe(
        s.mode === "pivot"
          ? {
              raw: s.raw,
              mode: "pivot",
              pivotLine: s.pivotLine,
              desiredAmount: s.desiredAmount,
              desiredUnit: (s.desiredUnit || null) as RecipeUnit | null,
            }
          : {
              raw: s.raw,
              mode: "servings",
              originalServings: s.originalServings,
              targetServings: s.targetServings,
            },
      );
      return { rows, report, error: "" };
    } catch (error) {
      let rows: ReturnType<typeof parseRecipe> = [];
      try {
        rows = parseRecipe(s.raw);
      } catch {
        /* The size error is displayed below. */
      }
      return {
        rows,
        report: undefined as RecipeReport | undefined,
        error: (error as Error).message,
      };
    }
  }, [s]);
  const { rows, report } = calculation;
  const errors: Record<string, string> = {
    limit: t(
      "Use at most 200,000 characters and 2,000 lines.",
      "最多输入 200,000 个字符、2,000 行。",
    ),
    servings: t(
      "Original and target servings must each be between 0.05 and 100.",
      "原份量和目标份量均需在 0.05–100 份之间。",
    ),
    pivot: t(
      "Choose a parsed ingredient with an amount greater than zero.",
      "请选择数量大于零且已解析的食材。",
    ),
    quantity: t(
      "Enter a positive desired amount: a decimal, fraction or mixed number.",
      "请输入正数作为目标用量，可用小数、分数或带分数。",
    ),
    family: t(
      "Choose a desired unit in the pivot ingredient’s family. Volume and mass cannot be mixed.",
      "目标单位需与基准食材同类，体积和重量不能混算。",
    ),
    factor: t(
      "The scale factor must be between 0.000001 and 1,000,000; desired amounts must be positive.",
      "缩放倍数需在 0.000001–1,000,000 之间；目标用量需大于零。",
    ),
    amount: t(
      "A scaled amount exceeds the limit of 1 trillion. Reduce the factor.",
      "缩放后的用量超过一万亿，请减小倍数。",
    ),
  };
  const kinds = {
    quantity: t("Ingredient", "食材"),
    header: t("Section", "分区"),
    note: t("Unscaled note", "原样备注"),
    blank: t("Blank line", "空行"),
    unparsed: t("Unparsed — not scaled", "未解析，未缩放"),
  };
  const quantities = rows.filter((r) => r.kind === "quantity");
  const pivot = quantities.find((r) => r.line === s.pivotLine);
  const valid = ready && !!report && quantities.length > 0;
  return (
    <ToolShell
      tool={tools.find((x) => x.day === 16)!}
      onSample={() => set(sample)}
      onReset={reset}
    >
      <div className="wb-layout">
        <section className="wb-panel">
          <h2>{t("1. Paste your ingredients", "1. 粘贴食材表")}</h2>
          <p>
            {t(
              "One ingredient per line, starting with its amount. Fractions such as 1/2, 1 1/2, 2-1/2 and ½ work. Section headings and notes stay in place.",
              "每行一味食材，以用量开头。支持 1/2、1 1/2、2-1/2、½ 等分数；分区标题和备注会保留。",
            )}
          </p>
          <TextImport
            label={t("Ingredient list", "食材表")}
            value={s.raw}
            onChange={(raw) => set({ raw })}
            maxBytes={200000}
          />
          <h2>{t("2. Choose how to scale", "2. 选择缩放方式")}</h2>
          <Field label={t("Scale mode", "缩放方式")}>
            <select
              value={s.mode}
              onChange={(e) => {
                const first = quantities.find((r) => r.amount! > 0);
                set({
                  mode: e.target.value,
                  ...(first
                    ? {
                        pivotLine: first.line,
                        desiredUnit: first.unit ?? "",
                        desiredAmount: String(first.amount),
                      }
                    : {}),
                });
              }}
            >
              <option value="servings">{t("By servings", "按份量")}</option>
              <option value="pivot">
                {t("By available ingredient", "按手头食材量")}
              </option>
            </select>
          </Field>
          {s.mode === "pivot" ? (
            <>
              <Field label={t("Pivot ingredient", "基准食材")}>
                <select
                  value={s.pivotLine}
                  onChange={(e) => {
                    const row = quantities.find(
                      (r) => r.line === Number(e.target.value),
                    );
                    if (row)
                      set({
                        pivotLine: row.line,
                        desiredUnit: row.unit ?? "",
                        desiredAmount: String(row.amount),
                      });
                  }}
                >
                  <option value={0}>
                    {t("Choose an ingredient", "选择食材")}
                  </option>
                  {quantities
                    .filter((r) => r.amount! > 0)
                    .map((r) => (
                      <option key={r.line} value={r.line}>
                        {r.line}. {r.raw}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label={t("Desired amount", "目标用量")}>
                <input
                  value={s.desiredAmount}
                  onChange={(e) => set({ desiredAmount: e.target.value })}
                  placeholder={t("e.g. 1 1/2", "例如 1 1/2")}
                />
              </Field>
              <Field label={t("Desired unit", "目标单位")}>
                <select
                  value={s.desiredUnit}
                  onChange={(e) => set({ desiredUnit: e.target.value })}
                >
                  {recipeUnitsFor(pivot?.unit ?? null).map((unit) => (
                    <option key={unit} value={unit}>
                      {unit || t("count (no unit)", "数量（无单位）")}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          ) : (
            <div className="wb-fields">
              <NumberField
                label={t("Original servings", "原份量")}
                value={s.originalServings}
                min={0.05}
                max={100}
                onChange={(originalServings) => set({ originalServings })}
              />
              <NumberField
                label={t("Target servings", "目标份量")}
                value={s.targetServings}
                min={0.05}
                max={100}
                onChange={(targetServings) => set({ targetServings })}
              />
            </div>
          )}
          {calculation.error && (
            <p role="alert" className="wb-error">
              {errors[calculation.error] ||
                t("Check the scale inputs.", "请检查缩放设置。")}
            </p>
          )}
          <p className="muted">
            {t(
              "Uses US cups/spoons (1 cup = 16 tbsp = 48 tsp = 236.5882365 ml), and avoirdupois oz/lb. Metric units stay metric. No volume ↔ mass conversion. Pinch/dash scale as symbolic counts. Unrecognized units remain part of the ingredient name.",
              "采用美制杯勺（1 cup = 16 tbsp = 48 tsp = 236.5882365 ml）和常衡 oz/lb。公制用量仍用公制；不跨体积与重量换算。撮/少许按次数缩放。未知单位作为食材名称的一部分保留。",
            )}
          </p>
          <p className="muted">
            {t(
              "Only the leading amount changes. Package descriptions, preparation notes and cooking times stay unchanged. Review fractional counts such as eggs yourself.",
              "仅改变行首用量。包装说明、操作备注和烹饪时间保持原样。鸡蛋等食材出现非整数时，请自行决定如何取用。",
            )}
          </p>
          <LocalStatus stored={stored} />
        </section>
        <section className="wb-panel">
          <h2>{t("3. Scaled recipe", "3. 缩放后的食谱")}</h2>
          {report && quantities.length > 0 ? (
            <p className="wb-calculation" role="status">
              {t("Scale factor", "缩放倍数")}: ×
              {Number(report.factor.toPrecision(10))} · {quantities.length}{" "}
              {t("ingredient rows", "行食材")}
            </p>
          ) : (
            <p>
              {t(
                "Paste ingredients or load sample data to start.",
                "粘贴食材表或加载示例即可开始。",
              )}
            </p>
          )}
          {!!report?.warnings.length && (
            <ul className="wb-issues" role="alert">
              {report.warnings.map((w) => (
                <li key={`${w.line}-${w.code}`}>
                  {t("Line", "行")} {w.line}: {t(w.en, w.zh)}
                </li>
              ))}
            </ul>
          )}
          <div className="wb-table-scroll">
            <table className="wb-table">
              <thead>
                <tr>
                  <th>{t("Kind", "类型")}</th>
                  <th>{t("Original", "原文")}</th>
                  <th>{t("Scaled", "缩放结果")}</th>
                  <th>
                    {t(
                      "Unrounded amount (original unit)",
                      "未取整用量（原单位）",
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.line}>
                    <td>{kinds[r.kind]}</td>
                    <td
                      style={{
                        whiteSpace: "pre-wrap",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {r.raw || "—"}
                    </td>
                    <td style={{ overflowWrap: "anywhere" }}>
                      {report?.rows[i].display || "—"}
                    </td>
                    <td>
                      {report?.rows[i].scaledAmount ?? "—"} {r.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted">
            {t(
              "Display uses common mixed fractions when within 0.000001, otherwise up to 8 significant digits. JSON/CSV retain numeric results in the original unit. Unparsed quantity lines are preserved and marked in exports; fix them before cooking.",
              "显示值接近常用分数（误差小于 0.000001）时使用带分数，否则保留最多 8 位有效数字。JSON/CSV 保留原单位下的未取整数值。无法解析的数量行会原样保留并标记；烹饪前请修正。",
            )}
          </p>
          <ExportBar
            name="scaled-recipe.txt"
            content={valid ? recipeText(report!, language) : ""}
            disabled={!valid}
          />
          <ExportBar
            name="recipe-report.json"
            content={valid ? JSON.stringify(report, null, 2) : ""}
            mime="application/json"
            disabled={!valid}
          />
          <ExportBar
            name="recipe-ingredients.csv"
            content={valid ? recipeCsv(report!) : ""}
            mime="text/csv;charset=utf-8"
            disabled={!valid}
          />
        </section>
      </div>
    </ToolShell>
  );
}
