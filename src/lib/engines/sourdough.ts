import { csvOutput } from "./bom.ts";

export type SourdoughIngredient = { name: string; amount: number };
/** In percent mode EVERY amount is a percentage of total flour, including starter flour. */
export type SourdoughInput = {
  mode: "grams" | "percent";
  flours: SourdoughIngredient[];
  water: number;
  salt: number;
  starter: number;
  starterHydrationPct: number;
  others: SourdoughIngredient[];
  anchor: "totalFlour" | "dough";
  anchorGrams: number;
};
export type SourdoughScale = {
  mode: "none" | "totalFlour" | "dough";
  targetGrams: number;
};
export type SourdoughFormula = {
  flours: SourdoughIngredient[];
  water: number;
  salt: number;
  starter: number;
  starterHydrationPct: number;
  others: SourdoughIngredient[];
};
export const SOURDOUGH_SAMPLE: SourdoughInput = {
  mode: "grams",
  flours: [
    { name: "Bread flour", amount: 450 },
    { name: "Whole wheat flour", amount: 50 },
  ],
  water: 375,
  salt: 10,
  starter: 100,
  starterHydrationPct: 100,
  others: [],
  anchor: "totalFlour",
  anchorGrams: 550,
};
export const SOURDOUGH_CONVENTION = {
  en: "All baker’s percentages use total flour including starter flour. Added rows sum to dough/total flour × 100, not 100%. Starter is counted once; its flour/water split is informational. Only added water and starter water count toward hydration; other ingredients (including milk, eggs and oil) contribute weight only. Grams only. Results are estimates for process planning; flour absorption and dough feel still need baker judgment.",
  zh: "所有烘焙百分比均以含酵种面粉的总面粉为基准。投料行百分比之和等于面团重÷总面粉重×100，并非 100%。酵种只计一次，拆出的面粉和水仅供核对。含水量只计算另加的水与酵种水；牛奶、鸡蛋、油等其他食材只计重量。仅用克。结果供制作规划参考，面粉吸水性和面团手感仍需烘焙者判断。",
};
const MAX_GRAMS = 1_000_000;
const MAX_TOTAL = 10_000_000;
function bounded(n: number, max: number, code: string, positive = false) {
  if (!Number.isFinite(n) || n < 0 || (positive && n === 0) || n > max)
    throw new Error(code);
}
export function splitStarter(grams: number, hydrationPct: number) {
  bounded(grams, MAX_GRAMS, "amount");
  if (!Number.isFinite(hydrationPct) || hydrationPct < 1 || hydrationPct > 1000)
    throw new Error("hydration");
  const flour = grams / (1 + hydrationPct / 100);
  return { flour, water: grams - flour };
}
function checkIngredients(
  flours: SourdoughIngredient[],
  others: SourdoughIngredient[],
  max: number,
) {
  if (
    !Array.isArray(flours) ||
    !Array.isArray(others) ||
    flours.length < 1 ||
    flours.length > 20 ||
    others.length > 20
  )
    throw new Error("count");
  for (const row of [...flours, ...others]) {
    if (
      !row ||
      typeof row.name !== "string" ||
      !row.name.trim() ||
      row.name.length > 100 ||
      /[\r\n\u0000-\u001f]/.test(row.name)
    )
      throw new Error("name");
    bounded(row.amount, max, "amount");
  }
}
export function resolveSourdough(input: SourdoughInput): SourdoughFormula {
  if (!["grams", "percent"].includes(input.mode)) throw new Error("mode");
  splitStarter(0, input.starterHydrationPct);
  const max = input.mode === "grams" ? MAX_GRAMS : 10_000;
  checkIngredients(input.flours, input.others, max);
  [input.water, input.salt, input.starter].forEach((n) =>
    bounded(n, max, "amount"),
  );
  let unit = 1;
  if (input.mode === "percent") {
    if (!["totalFlour", "dough"].includes(input.anchor))
      throw new Error("anchor");
    bounded(input.anchorGrams, MAX_TOTAL, "anchor", true);
    const flourPct =
      input.flours.reduce((sum, row) => sum + row.amount, 0) +
      input.starter / (1 + input.starterHydrationPct / 100);
    // Rounded human input may differ by at most one millionth of a percentage point.
    if (Math.abs(flourPct - 100) > 1e-6) throw new Error("balance");
    const doughPct =
      input.flours.reduce((sum, row) => sum + row.amount, 0) +
      input.water +
      input.salt +
      input.starter +
      input.others.reduce((sum, row) => sum + row.amount, 0);
    unit =
      input.anchor === "totalFlour"
        ? input.anchorGrams / flourPct
        : input.anchorGrams / doughPct;
  }
  const formula = {
    flours: input.flours.map((row) => ({ ...row, amount: row.amount * unit })),
    water: input.water * unit,
    salt: input.salt * unit,
    starter: input.starter * unit,
    starterHydrationPct: input.starterHydrationPct,
    others: input.others.map((row) => ({ ...row, amount: row.amount * unit })),
  };
  validateFormula(formula);
  return formula;
}
function validateFormula(f: SourdoughFormula) {
  checkIngredients(f.flours, f.others, MAX_GRAMS);
  [f.water, f.salt, f.starter].forEach((n) => bounded(n, MAX_GRAMS, "amount"));
  const split = splitStarter(f.starter, f.starterHydrationPct);
  const totalFlour =
    f.flours.reduce((sum, row) => sum + row.amount, 0) + split.flour;
  bounded(totalFlour, MAX_TOTAL, "flour", true);
  if (totalFlour < 0.001) throw new Error("flour");
  const dough =
    f.flours.reduce((sum, row) => sum + row.amount, 0) +
    f.water +
    f.salt +
    f.starter +
    f.others.reduce((sum, row) => sum + row.amount, 0);
  bounded(dough, MAX_TOTAL, "amount", true);
}
export function calculateSourdough(
  input: SourdoughInput,
  scale: SourdoughScale = { mode: "none", targetGrams: 1 },
) {
  const base = resolveSourdough(input);
  const baseSplit = splitStarter(base.starter, base.starterHydrationPct);
  const baseFlour =
    base.flours.reduce((sum, row) => sum + row.amount, 0) + baseSplit.flour;
  const baseDough =
    base.flours.reduce((sum, row) => sum + row.amount, 0) +
    base.water +
    base.salt +
    base.starter +
    base.others.reduce((sum, row) => sum + row.amount, 0);
  if (!["none", "dough", "totalFlour"].includes(scale.mode))
    throw new Error("scale");
  if (scale.mode !== "none")
    bounded(scale.targetGrams, MAX_TOTAL, "target", true);
  const factor =
    scale.mode === "none"
      ? 1
      : scale.targetGrams / (scale.mode === "dough" ? baseDough : baseFlour);
  if (!Number.isFinite(factor) || factor < 1e-6 || factor > 1e6)
    throw new Error("factor");
  const scaled: SourdoughFormula = {
    ...base,
    flours: base.flours.map((row) => ({ ...row, amount: row.amount * factor })),
    water: base.water * factor,
    salt: base.salt * factor,
    starter: base.starter * factor,
    others: base.others.map((row) => ({ ...row, amount: row.amount * factor })),
  };
  validateFormula(scaled);
  const starterSplit = splitStarter(scaled.starter, scaled.starterHydrationPct);
  const bowlFlour = scaled.flours.reduce((sum, row) => sum + row.amount, 0);
  const totalFlour = bowlFlour + starterSplit.flour;
  const totalWater = scaled.water + starterSplit.water;
  const pct = (grams: number) => (grams / totalFlour) * 100;
  const row = (
    kind: "flour" | "water" | "salt" | "starter" | "other",
    name: string,
    grams: number,
  ) => ({ kind, name, grams, bakersPct: pct(grams) });
  const rows = [
    ...scaled.flours.map((f) => row("flour", f.name, f.amount)),
    row("water", "Water", scaled.water),
    row("salt", "Salt", scaled.salt),
    row("starter", "Starter", scaled.starter),
    ...scaled.others.map((f) => row("other", f.name, f.amount)),
  ];
  const doughWeight = rows.reduce((sum, r) => sum + r.grams, 0);
  const starterPct = pct(scaled.starter);
  const warnings: { code: string; en: string; zh: string }[] = [];
  if (scaled.starterHydrationPct < 50 || scaled.starterHydrationPct > 150)
    warnings.push({
      code: "extreme-hydration",
      en: "Starter hydration is outside 50–150%. Confirm your feeding ratio.",
      zh: "酵种含水量超出 50–150%，请确认喂养比例。",
    });
  if (starterPct < 5 || starterPct > 40)
    warnings.push({
      code: "inoculation",
      en: "Starter is below 5% or above 40% of total flour. Check your fermentation plan; these are advisory thresholds.",
      zh: "酵种用量低于总面粉的 5% 或高于 40%。请核对发酵安排；这只是提醒范围。",
    });
  return {
    inputs: input,
    scale,
    base,
    scaled,
    factor,
    rows,
    starterSplit,
    bowlFlour,
    totalFlour,
    totalWater,
    doughWeight,
    trueHydrationPct: pct(totalWater),
    starterPct,
    prefermentedFlourPct: pct(starterSplit.flour),
    rowsBakersPctSum: rows.reduce((sum, r) => sum + r.bakersPct, 0),
    warnings,
    convention: SOURDOUGH_CONVENTION,
  };
}
export type SourdoughReport = ReturnType<typeof calculateSourdough>;
/** Convert validated grams to editable percentages without rounding any ratios. */
export function sourdoughPercentInput(input: SourdoughInput): SourdoughInput {
  const r = calculateSourdough(input);
  const pct = (grams: number) => (grams / r.totalFlour) * 100;
  return {
    ...input,
    mode: "percent",
    anchor: "totalFlour",
    anchorGrams: r.totalFlour,
    flours: r.base.flours.map((row) => ({ ...row, amount: pct(row.amount) })),
    water: pct(r.base.water),
    salt: pct(r.base.salt),
    starter: pct(r.base.starter),
    others: r.base.others.map((row) => ({ ...row, amount: pct(row.amount) })),
  };
}
export function sourdoughRowName(
  row: SourdoughReport["rows"][number],
  language: "en" | "zh",
) {
  return language === "en" || row.kind === "flour" || row.kind === "other"
    ? row.name
    : { water: "水", salt: "盐", starter: "酵种" }[row.kind];
}
export function sourdoughText(
  r: SourdoughReport,
  language: "en" | "zh" = "en",
) {
  const zh = language === "zh";
  const n = (v: number) => Number(v.toPrecision(12));
  return [
    zh ? "酸面包含水量和配方换算" : "Sourdough baker’s formula",
    `${zh ? "缩放倍数" : "Scale factor"}: ${n(r.factor)}`,
    ...r.rows.map(
      (row) =>
        `${sourdoughRowName(row, language)}: ${n(row.grams)} g · ${n(row.bakersPct)}%`,
    ),
    `${zh ? "酵种拆分（已计入，勿重复添加）" : "Starter split (already included; do not add again)"}: ${n(r.starterSplit.flour)} g ${zh ? "面粉" : "flour"} + ${n(r.starterSplit.water)} g ${zh ? "水" : "water"}`,
    `${zh ? "碗内面粉 / 总面粉 / 总水量 / 面团重" : "Bowl flour / total flour / total water / dough weight"}: ${[r.bowlFlour, r.totalFlour, r.totalWater, r.doughWeight].map(n).join(" / ")} g`,
    `${zh ? "真实含水量" : "True hydration"}: ${n(r.trueHydrationPct)}%`,
    `${zh ? "酵种 / 预发酵面粉（占总面粉）" : "Starter / prefermented flour (% of total flour)"}: ${n(r.starterPct)}% / ${n(r.prefermentedFlourPct)}%`,
    `${zh ? "投料行百分比之和" : "Added-row percentage sum"}: ${n(r.rowsBakersPctSum)}%`,
    SOURDOUGH_CONVENTION[language],
    ...r.warnings.map((w) => `${zh ? "提醒" : "Warning"}: ${w[language]}`),
  ].join("\n");
}
export function sourdoughCsv(r: SourdoughReport, language: "en" | "zh" = "en") {
  return csvOutput([
    [
      "kind",
      "ingredient",
      "grams",
      "bakers_pct_total_flour",
      "hydration_water_grams",
      "total_flour_grams",
      "starter_hydration_pct",
    ],
    ...r.rows.map((row) => [
      row.kind,
      sourdoughRowName(row, language),
      row.grams,
      row.bakersPct,
      row.kind === "water"
        ? row.grams
        : row.kind === "starter"
          ? r.starterSplit.water
          : 0,
      r.totalFlour,
      r.scaled.starterHydrationPct,
    ]),
  ]);
}
