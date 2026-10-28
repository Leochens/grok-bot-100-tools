export const DENSITIES = {
  PLA: 1.24,
  PETG: 1.27,
  ABS: 1.04,
  ASA: 1.07,
  TPU: 1.21,
} as const;
// Approximate examples: packaging revisions differ. Always allow measured tare override.
export const TARE_PRESETS = {
  "Bambu reusable (approx.)": 250,
  "Prusament (approx.)": 201,
  "eSUN plastic (approx.)": 250,
  "Overture cardboard (approx.)": 140,
};
export type Spool = {
  name: string;
  grossWeightG: number;
  emptySpoolTareG: number;
  diameter: number;
  material: keyof typeof DENSITIES;
  reserve: number;
};
export function gramsPerMeter(diameter: number, density: number) {
  if (![diameter, density].every((n) => Number.isFinite(n) && n > 0))
    throw new Error("dimensions");
  return Math.PI * (diameter / 2) ** 2 * density;
}
export function spoolBudget(
  spool: Spool,
  jobs: { name: string; grams: number; copies: number }[],
) {
  const { grossWeightG: gross, emptySpoolTareG: tare, reserve } = spool;
  if (
    ![gross, tare, reserve].every(Number.isFinite) ||
    tare < 0 ||
    gross < tare ||
    reserve < 0 ||
    reserve >= 100 ||
    !DENSITIES[spool.material]
  )
    throw new Error("spool");
  const net = gross - tare,
    perMeter = gramsPerMeter(spool.diameter, DENSITIES[spool.material]);
  const available = net * (1 - reserve / 100);
  let used = 0;
  const queue = jobs.map((job) => {
    if (
      !Number.isFinite(job.grams) ||
      job.grams < 0 ||
      !Number.isInteger(job.copies) ||
      job.copies < 1
    )
      throw new Error("jobs");
    used += job.grams * job.copies;
    return {
      ...job,
      cumulativeG: used,
      remainingG: available - used,
      fits: used <= available + 1e-8,
    };
  });
  return {
    net,
    meters: net / perMeter,
    available,
    required: used,
    fits: used <= available + 1e-8,
    queue,
  };
}
/** Slicer totals take precedence over motion fallback; totals from different units are never added. */
export function parseGcode(raw: string, diameter = 1.75, density = 1.24) {
  const perMeter = gramsPerMeter(diameter, density);
  const totals: { grams?: number; mm?: number } = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(
      /^\s*;\s*(?:total\s+)?filament\s+(?:used|weight)\s*(?:\[(g|mm|m)\])?\s*[:=]\s*([\d.,;\s]+)(g|mm|m)?\s*$/i,
    );
    if (!m) continue;
    const unit = (m[1] || m[3] || "").toLowerCase();
    const values = m[2]
      .trim()
      .split(/[,;\s]+/)
      .map(Number);
    if (!values.length || values.some((n) => !Number.isFinite(n) || n < 0))
      continue;
    const sum = values.reduce((a, b) => a + b, 0);
    if (unit === "g") totals.grams = sum;
    if (unit === "mm" || unit === "m")
      totals.mm = sum * (unit === "m" ? 1000 : 1);
  }
  if (totals.grams !== undefined)
    return {
      grams: totals.grams,
      meters:
        totals.mm === undefined ? totals.grams / perMeter : totals.mm / 1000,
      method: "slicer-grams" as const,
      warnings: [] as string[],
    };
  if (totals.mm !== undefined)
    return {
      grams: (totals.mm / 1000) * perMeter,
      meters: totals.mm / 1000,
      method: "slicer-length" as const,
      warnings: [] as string[],
    };
  let relative = false,
    unit = 1,
    tool = 0,
    total = 0,
    moves = 0,
    volumetric = false,
    flow = 1;
  const axes = new Map<number, { e: number; debt: number }>();
  for (const line of raw.split(/\r?\n/)) {
    const code = line
      .split(";")[0]
      .replace(/\([^)]*\)/g, "")
      .replace(/^\s*N\d+\s*/i, "")
      .trim()
      .toUpperCase();
    const cmd = code.match(/^([GMT])\s*(\d+)/);
    if (!cmd) continue;
    const command = cmd[1] + Number(cmd[2]);
    const params = new Map(
      [
        ...code
          .slice(cmd[0].length)
          .matchAll(/([A-Z])\s*([-+]?(?:\d+\.?\d*|\.\d+))/g),
      ].map((m) => [m[1], +m[2]]),
    );
    if (cmd[1] === "T") {
      tool = +cmd[2];
      continue;
    }
    if (command === "M82") relative = false;
    if (command === "M83") relative = true;
    if (command === "G90") relative = false;
    if (command === "G91") relative = true;
    if (command === "G20") unit = 25.4;
    if (command === "G21") unit = 1;
    if (command === "M200") volumetric = (params.get("D") ?? 0) > 0;
    if (command === "M221") flow = (params.get("S") ?? 100) / 100;
    const axis = axes.get(tool) ?? { e: 0, debt: 0 };
    axes.set(tool, axis);
    const e = params.get("E");
    if (e === undefined) continue;
    if (command === "G92") {
      axis.e = e * unit;
      continue;
    }
    if (!["G0", "G1", "G2", "G3"].includes(command)) continue;
    if (volumetric) throw new Error("volumetric");
    if (!Number.isFinite(flow) || flow < 0) throw new Error("flow");
    const delta = relative ? e * unit : e * unit - axis.e;
    axis.e = relative ? axis.e + e * unit : e * unit;
    if (delta < 0) axis.debt -= delta;
    else {
      const recovered = Math.min(delta, axis.debt);
      axis.debt -= recovered;
      total += (delta - recovered) * flow;
    }
    moves++;
  }
  if (!moves) throw new Error("gcode");
  if (!Number.isFinite(total) || total < 0) throw new Error("gcode");
  return {
    grams: (total / 1000) * perMeter,
    meters: total / 1000,
    method: "extrusion-moves" as const,
    warnings: [
      "Fallback assumes each tool uses the selected diameter and material; firmware macros, purge and volumetric extrusion require slicer totals.",
    ],
  };
}
export const GCODE_SAMPLE =
  "; generated by PrusaSlicer\n; filament used [mm] = 14800\n; filament used [g] = 44.14\nM82\nG92 E0\nG1 X10 Y10 E4\n";
