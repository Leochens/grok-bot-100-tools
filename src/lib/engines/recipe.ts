/** Local recipe arithmetic. US customary volume; avoirdupois mass. No density assumptions. */
export const RECIPE_SAMPLE = `For the stew:
1 1/2 cups vegetable stock
2 tbsp olive oil
500 g potatoes, diced
3/4 tsp smoked paprika
2 carrots

For the sauce:
½ cup yogurt
1 pinch salt
salt to taste`;

const vulgar: Record<string, number> = {
  "¼": 1 / 4,
  "½": 1 / 2,
  "¾": 3 / 4,
  "⅐": 1 / 7,
  "⅑": 1 / 9,
  "⅒": 1 / 10,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "⅕": 1 / 5,
  "⅖": 2 / 5,
  "⅗": 3 / 5,
  "⅘": 4 / 5,
  "⅙": 1 / 6,
  "⅚": 5 / 6,
  "⅛": 1 / 8,
  "⅜": 3 / 8,
  "⅝": 5 / 8,
  "⅞": 7 / 8,
};
const glyphs = Object.keys(vulgar).join("");
const quantityPattern = new RegExp(
  `^(?:\\d+[ -]+\\d+\\s*[/⁄]\\s*\\d+|\\d+\\s*[${glyphs}]|\\d+\\s*[/⁄]\\s*\\d+|[${glyphs}]|(?:\\d+(?:\\.\\d+)?|\\.\\d+))`,
);

/** Entire string must be one nonnegative quantity, never a partially consumed range. */
export function parseRecipeQuantity(raw: string): number {
  const text = raw.trim().replace(/⁄/g, "/");
  let value: number;
  const mixed = text.match(/^(\d+)[ -]+(\d+)\s*\/\s*(\d+)$/);
  const fraction = text.match(/^(\d+)\s*\/\s*(\d+)$/);
  const unicode = text.match(new RegExp(`^(\\d+)?\\s*([${glyphs}])$`));
  if (mixed) {
    if (+mixed[3] === 0 || +mixed[2] >= +mixed[3]) throw new Error("quantity");
    value = +mixed[1] + +mixed[2] / +mixed[3];
  } else if (fraction) {
    if (+fraction[2] === 0) throw new Error("quantity");
    value = +fraction[1] / +fraction[2];
  } else if (unicode) {
    value = +(unicode[1] || 0) + vulgar[unicode[2]];
  } else if (/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(text)) {
    value = Number(text);
  } else throw new Error("quantity");
  if (!Number.isFinite(value) || value < 0 || value > 1e9)
    throw new Error("quantity");
  return value;
}

export type RecipeUnit =
  | "tsp"
  | "tbsp"
  | "cup"
  | "ml"
  | "L"
  | "fl oz"
  | "g"
  | "kg"
  | "oz"
  | "lb"
  | "pinch"
  | "dash";
export type RecipeFamily = "volume" | "mass" | "symbolic" | "count";
export const RECIPE_UNITS: Record<
  RecipeUnit,
  { family: RecipeFamily; base: number; aliases: string[] }
> = {
  tsp: {
    family: "volume",
    base: 4.92892159375,
    aliases: ["tsp", "teaspoon", "teaspoons"],
  },
  tbsp: {
    family: "volume",
    base: 14.78676478125,
    aliases: ["tbsp", "tablespoon", "tablespoons"],
  },
  cup: { family: "volume", base: 236.5882365, aliases: ["cup", "cups"] },
  ml: { family: "volume", base: 1, aliases: ["ml"] },
  L: {
    family: "volume",
    base: 1000,
    aliases: ["l", "liter", "liters", "litre", "litres"],
  },
  "fl oz": {
    family: "volume",
    base: 29.5735295625,
    aliases: ["fl oz", "fluid ounce", "fluid ounces"],
  },
  g: { family: "mass", base: 1, aliases: ["g", "gram", "grams"] },
  kg: { family: "mass", base: 1000, aliases: ["kg", "kilogram", "kilograms"] },
  oz: {
    family: "mass",
    base: 28.349523125,
    aliases: ["oz", "ounce", "ounces"],
  },
  lb: {
    family: "mass",
    base: 453.59237,
    aliases: ["lb", "lbs", "pound", "pounds"],
  },
  pinch: { family: "symbolic", base: 1, aliases: ["pinch", "pinches"] },
  dash: { family: "symbolic", base: 1, aliases: ["dash", "dashes"] },
};
const aliases = Object.entries(RECIPE_UNITS).flatMap(([unit, spec]) =>
  spec.aliases.map((alias) => ({ unit: unit as RecipeUnit, alias })),
);
const unitPattern = new RegExp(
  `^(${aliases
    .map((x) => x.alias)
    .sort((a, b) => b.length - a.length)
    .join("|")})(?=$|\\s|[.,])\\.?\\s*`,
  "i",
);
export type RecipeRow = {
  line: number;
  raw: string;
  kind: "quantity" | "header" | "note" | "blank" | "unparsed";
  name: string;
  amount: number | null;
  unit: RecipeUnit | null;
  family: RecipeFamily | null;
};
export type RecipeWarning = {
  line: number;
  code: "unparsed" | "symbolic";
  en: string;
  zh: string;
};
const warning = (row: RecipeRow): RecipeWarning[] =>
  row.kind === "unparsed"
    ? [
        {
          line: row.line,
          code: "unparsed",
          en: "Quantity could not be parsed; preserved unchanged. Correct this line before cooking.",
          zh: "数量无法解析，已原样保留。烹饪前请修正这一行。",
        },
      ]
    : row.family === "symbolic"
      ? [
          {
            line: row.line,
            code: "symbolic",
            en: "Pinch/dash is scaled as a symbolic count; no volume conversion.",
            zh: "撮或少许按次数缩放，不换算为体积。",
          },
        ]
      : [];

export function parseRecipe(raw: string): RecipeRow[] {
  if (raw.length > 200000 || raw.split(/\r\n|\n|\r/).length > 2000)
    throw new Error("limit");
  return raw.split(/\r\n|\n|\r/).map((source, index) => {
    const text = source.trim().replace(/^(?:[•*]\s*|-\s+(?=[\d.¼-⅞]))/, "");
    const row: RecipeRow = {
      line: index + 1,
      raw: source,
      kind: "note",
      name: text,
      amount: null,
      unit: null,
      family: null,
    };
    if (!text) return { ...row, kind: "blank" };
    if (!new RegExp(`^[+−\\-\\d.,/⁄${glyphs}]`).test(text))
      return { ...row, kind: text.endsWith(":") ? "header" : "note" };
    try {
      const match = text.match(quantityPattern);
      if (!match) throw new Error("quantity");
      const amount = parseRecipeQuantity(match[0]);
      let rest = text.slice(match[0].length);
      // Ranges, repeated punctuation, scientific notation and compound quantities need review.
      if (
        /^[\d.,/⁄+−–—-]/.test(rest) ||
        /^e[+-]?\d/i.test(rest) ||
        new RegExp(`^\\s*(?:[\\d${glyphs}]|to\\b|[-–—+/⁄])`, "i").test(rest)
      )
        throw new Error("quantity");
      rest = rest.trim();
      const unitMatch = rest.match(unitPattern);
      const unit = unitMatch
        ? aliases.find((x) => x.alias === unitMatch[1].toLowerCase())!.unit
        : null;
      if (unitMatch) rest = rest.slice(unitMatch[0].length).trim();
      if (!rest || /^(?:\d|[+\/])/.test(rest)) throw new Error("name");
      return {
        ...row,
        kind: "quantity",
        name: rest,
        amount,
        unit,
        family: unit ? RECIPE_UNITS[unit].family : "count",
      };
    } catch {
      return { ...row, kind: "unparsed" };
    }
  });
}

export function recipeUnitsFor(unit: RecipeUnit | null): (RecipeUnit | "")[] {
  if (!unit) return [""];
  if (RECIPE_UNITS[unit].family === "symbolic") return [unit];
  return (Object.keys(RECIPE_UNITS) as RecipeUnit[]).filter(
    (u) => RECIPE_UNITS[u].family === RECIPE_UNITS[unit].family,
  );
}
export function convertRecipeAmount(
  amount: number,
  from: RecipeUnit | null,
  to: RecipeUnit | null,
): number {
  if (
    !Number.isFinite(amount) ||
    amount < 0 ||
    !recipeUnitsFor(from).includes(to ?? "")
  )
    throw new Error("family");
  return from && to
    ? amount * (RECIPE_UNITS[from].base / RECIPE_UNITS[to].base)
    : amount;
}

/** Display only. Reports retain the unrounded numeric result in the input unit. */
export function formatRecipeAmount(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) throw new Error("quantity");
  const whole = Math.floor(amount),
    fraction = amount - whole;
  for (const denominator of [1, 2, 3, 4, 8]) {
    const numerator = Math.round(fraction * denominator);
    if (
      Math.abs(fraction - numerator / denominator) < 1e-6 &&
      (amount === 0 || whole + numerator / denominator > 0)
    ) {
      if (!numerator) return String(whole);
      if (numerator === denominator) return String(whole + 1);
      return `${whole ? whole + " " : ""}${numerator}/${denominator}`;
    }
  }
  return new Intl.NumberFormat("en-US", {
    useGrouping: false,
    maximumSignificantDigits: 8,
  }).format(amount);
}
export function normalizeRecipeAmount(amount: number, unit: RecipeUnit | null) {
  let outputUnit = unit;
  if (unit && amount > 0) {
    if (["tsp", "tbsp", "cup", "fl oz"].includes(unit)) {
      outputUnit =
        (["cup", "tbsp", "tsp"] as RecipeUnit[]).find(
          (candidate) =>
            convertRecipeAmount(amount, unit, candidate) >= 1 - 1e-10,
        ) ?? "tsp";
    } else if (unit === "ml" || unit === "L" || unit === "g" || unit === "kg") {
      const small: RecipeUnit = unit === "ml" || unit === "L" ? "ml" : "g";
      const big: RecipeUnit = small === "ml" ? "L" : "kg";
      const value = convertRecipeAmount(amount, unit, big);
      outputUnit =
        value >= 1 && Math.abs(value * 1000 - Math.round(value * 1000)) < 1e-8
          ? big
          : small;
    } else if (unit === "oz" || unit === "lb") {
      outputUnit = convertRecipeAmount(amount, unit, "lb") >= 1 ? "lb" : "oz";
    }
  }
  const outputAmount = convertRecipeAmount(amount, unit, outputUnit);
  return {
    amount: outputAmount,
    unit: outputUnit,
    display: `${formatRecipeAmount(outputAmount)}${outputUnit ? " " + outputUnit : ""}`,
  };
}

export type RecipeScaleInputs =
  | {
      raw: string;
      mode: "servings";
      originalServings: number;
      targetServings: number;
    }
  | {
      raw: string;
      mode: "pivot";
      pivotLine: number;
      desiredAmount: string;
      desiredUnit: RecipeUnit | null;
    };
export type ScaledRecipeRow = RecipeRow & {
  scaledAmount: number | null;
  normalizedAmount: number | null;
  normalizedUnit: RecipeUnit | null;
  display: string;
};
export type RecipeReport = {
  version: 1;
  inputs: RecipeScaleInputs;
  factor: number;
  rows: ScaledRecipeRow[];
  warnings: RecipeWarning[];
  convention: string;
};
export function scaleRecipe(inputs: RecipeScaleInputs): RecipeReport {
  const rows = parseRecipe(inputs.raw);
  let factor: number;
  if (inputs.mode === "servings") {
    if (
      ![inputs.originalServings, inputs.targetServings].every(
        (n) => Number.isFinite(n) && n >= 0.05 && n <= 100,
      )
    )
      throw new Error("servings");
    factor = inputs.targetServings / inputs.originalServings;
  } else if (inputs.mode === "pivot") {
    const pivot = rows.find(
      (r) => r.line === inputs.pivotLine && r.kind === "quantity",
    );
    if (!pivot || !pivot.amount) throw new Error("pivot");
    const desired = parseRecipeQuantity(inputs.desiredAmount);
    factor =
      convertRecipeAmount(desired, inputs.desiredUnit, pivot.unit) /
      pivot.amount;
  } else throw new Error("mode");
  if (!Number.isFinite(factor) || factor < 0.000001 || factor > 1000000)
    throw new Error("factor");
  const scaled = rows.map((row): ScaledRecipeRow => {
    if (row.kind !== "quantity")
      return {
        ...row,
        scaledAmount: null,
        normalizedAmount: null,
        normalizedUnit: null,
        display: row.raw,
      };
    const scaledAmount = row.amount! * factor;
    if (!Number.isFinite(scaledAmount) || scaledAmount > 1e12)
      throw new Error("amount");
    const normalized = normalizeRecipeAmount(scaledAmount, row.unit);
    return {
      ...row,
      scaledAmount,
      normalizedAmount: normalized.amount,
      normalizedUnit: normalized.unit,
      display: `${normalized.display} ${row.name}`,
    };
  });
  return {
    version: 1,
    inputs: { ...inputs },
    factor,
    rows: scaled,
    warnings: rows.flatMap(warning),
    convention:
      "US customary volume (1 cup = 48 tsp = 236.5882365 ml); avoirdupois mass. No mass/volume conversion. Pinch/dash are symbolic counts. Display rounded to 8 significant digits or common fractions within 0.000001; numeric scaledAmount retains JS precision in the original unit. Non-leading quantities and package descriptions are unchanged.",
  };
}

export function recipeText(
  report: RecipeReport,
  language: "en" | "zh" = "en",
): string {
  const zh = language === "zh";
  return [
    `${zh ? "食谱缩放倍数" : "Recipe scale factor"}: ${report.factor}`,
    report.inputs.mode === "servings"
      ? `${zh ? "份量" : "Servings"}: ${report.inputs.originalServings} → ${report.inputs.targetServings}`
      : zh
        ? "按食材余量缩放"
        : "Scaled by pivot ingredient",
    "",
    ...report.rows.map((r) =>
      r.kind === "unparsed"
        ? `[${zh ? "未解析，未缩放" : "UNPARSED — NOT SCALED"}] ${r.raw}`
        : r.display,
    ),
    "",
    zh
      ? "换算约定：美制杯勺；体积和重量分开换算；撮/少许按次数缩放。只缩放行首数量，包装说明和步骤中的数字保持原样。"
      : report.convention,
    ...report.warnings.map(
      (w) =>
        `${zh ? "警告，行" : "Warning, line"} ${w.line}: ${zh ? w.zh : w.en}`,
    ),
  ].join("\n");
}
export function recipeCsv(report: RecipeReport): string {
  const records: (string | number | null)[][] = [
    [
      "line",
      "kind",
      "raw",
      "ingredient",
      "original_amount",
      "original_unit",
      "scaled_amount_original_unit",
      "normalized_amount",
      "normalized_unit",
      "display",
      "warnings",
    ],
  ];
  for (const r of report.rows)
    records.push([
      r.line,
      r.kind,
      r.raw,
      r.name,
      r.amount,
      r.unit,
      r.scaledAmount,
      r.normalizedAmount,
      r.normalizedUnit,
      r.display,
      report.warnings
        .filter((w) => w.line === r.line)
        .map((w) => w.en)
        .join("; "),
    ]);
  return records
    .map((row) =>
      row.map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`).join(","),
    )
    .join("\r\n");
}
