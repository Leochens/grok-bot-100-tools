export const STRUCTURES = {
  stockinette: 1,
  rib1: 1.18,
  rib2: 1.14,
  fisherman: 1.35,
  cable: 1.3,
} as const;
export type KnitSection = {
  name: string;
  width: number;
  length: number;
  count: number;
  repeat: number;
  offset: number;
  structure: keyof typeof STRUCTURES;
  ratio: number;
};
export type KnitSettings = {
  patternSts: number;
  patternRows: number;
  swatchSts: number;
  swatchRows: number;
  unblockedWidth: number;
  unblockedLength: number;
  blockedWidth: number;
  blockedLength: number;
  swatchGrams: number;
  skeinGrams: number;
  skeinMeters: number;
  waste: number;
  sections: KnitSection[];
};
export const KNIT_DEFAULT: KnitSettings = {
  patternSts: 20,
  patternRows: 28,
  swatchSts: 24,
  swatchRows: 32,
  unblockedWidth: 10,
  unblockedLength: 10,
  blockedWidth: 11,
  blockedLength: 12,
  swatchGrams: 6,
  skeinGrams: 50,
  skeinMeters: 125,
  waste: 10,
  sections: [
    {
      name: "Body",
      width: 100,
      length: 50,
      count: 1,
      repeat: 4,
      offset: 2,
      structure: "stockinette",
      ratio: 1,
    },
    {
      name: "Sleeves",
      width: 32,
      length: 42,
      count: 2,
      repeat: 4,
      offset: 2,
      structure: "stockinette",
      ratio: 1,
    },
    {
      name: "Hem / cuffs",
      width: 100,
      length: 6,
      count: 1,
      repeat: 4,
      offset: 2,
      structure: "rib2",
      ratio: 1.14,
    },
  ],
};
export function repeatRound(n: number, multiple: number, offset: number) {
  if (
    !Number.isInteger(multiple) ||
    multiple < 1 ||
    !Number.isInteger(offset) ||
    offset < 0 ||
    offset >= multiple
  )
    throw new Error("repeat");
  return Math.max(
    offset || multiple,
    Math.round((n - offset) / multiple) * multiple + offset,
  );
}
export function calculateKnit(s: KnitSettings) {
  const positive = [
    s.patternSts,
    s.patternRows,
    s.swatchSts,
    s.swatchRows,
    s.unblockedWidth,
    s.unblockedLength,
    s.blockedWidth,
    s.blockedLength,
    s.swatchGrams,
    s.skeinGrams,
    s.skeinMeters,
  ];
  if (
    positive.some((n) => !Number.isFinite(n) || n <= 0) ||
    !Number.isFinite(s.waste) ||
    s.waste < 0 ||
    s.waste > 100 ||
    !s.sections.length
  )
    throw new Error("positive");
  if (![s.swatchSts, s.swatchRows].every(Number.isInteger))
    throw new Error("counts");
  const stsPerCm = s.swatchSts / s.blockedWidth,
    rowsPerCm = s.swatchRows / s.blockedLength;
  const rows = s.sections.map((section) => {
    if (
      ![section.width, section.length, section.count, section.ratio].every(
        (n) => Number.isFinite(n) && n > 0,
      ) ||
      !Number.isInteger(section.count)
    )
      throw new Error("section");
    const stitches = repeatRound(
      section.width * stsPerCm,
      section.repeat,
      section.offset,
    );
    const rowCount = Math.max(1, Math.round(section.length * rowsPerCm));
    const grams =
      ((stitches * rowCount * section.count * s.swatchGrams) /
        (s.swatchSts * s.swatchRows)) *
      section.ratio;
    return {
      ...section,
      patternStitches: repeatRound(
        (section.width * s.patternSts) / 10,
        section.repeat,
        section.offset,
      ),
      patternRowCount: Math.max(
        1,
        Math.round((section.length * s.patternRows) / 10),
      ),
      stitches,
      rows: rowCount,
      finishedWidth: stitches / stsPerCm,
      finishedLength: rowCount / rowsPerCm,
      preWashLength:
        ((rowCount / rowsPerCm) * s.unblockedLength) / s.blockedLength,
      grams,
      meters: (grams / s.skeinGrams) * s.skeinMeters,
    };
  });
  const grams = rows.reduce((sum, r) => sum + r.grams, 0) * (1 + s.waste / 100),
    meters = (grams / s.skeinGrams) * s.skeinMeters;
  return {
    rows,
    grams,
    meters,
    skeins: Math.ceil(grams / s.skeinGrams),
    stsPerCm,
    rowsPerCm,
    widthChange: (s.blockedWidth / s.unblockedWidth - 1) * 100,
    lengthChange: (s.blockedLength / s.unblockedLength - 1) * 100,
  };
}
