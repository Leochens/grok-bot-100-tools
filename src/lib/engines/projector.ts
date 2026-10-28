export const PROJECTOR_ZONES = [
  { id: "top-left", code: "A1", en: "Top left", zh: "左上", row: 0, col: 0 },
  { id: "top", code: "A2", en: "Top edge", zh: "上边", row: 0, col: 1 },
  { id: "top-right", code: "A3", en: "Top right", zh: "右上", row: 0, col: 2 },
  { id: "left", code: "B1", en: "Left edge", zh: "左边", row: 1, col: 0 },
  { id: "center", code: "B2", en: "Center", zh: "中心", row: 1, col: 1 },
  { id: "right", code: "B3", en: "Right edge", zh: "右边", row: 1, col: 2 },
  {
    id: "bottom-left",
    code: "C1",
    en: "Bottom left",
    zh: "左下",
    row: 2,
    col: 0,
  },
  { id: "bottom", code: "C2", en: "Bottom edge", zh: "下边", row: 2, col: 1 },
  {
    id: "bottom-right",
    code: "C3",
    en: "Bottom right",
    zh: "右下",
    row: 2,
    col: 2,
  },
] as const;
export type ProjectorZone = (typeof PROJECTOR_ZONES)[number]["id"];
export type ProjectorReading = {
  zone: ProjectorZone;
  widthMm: number;
  heightMm: number;
};
export type ProjectorChart = {
  widthMm: number;
  heightMm: number;
  squareMm: number;
};
export type ProjectorUnit = "mm" | "cm" | "in";
export function toMillimeters(value: number, unit: ProjectorUnit) {
  if (
    !Number.isFinite(value) ||
    value <= 0 ||
    !["mm", "cm", "in"].includes(unit)
  )
    throw new Error("measurement");
  return value * { mm: 1, cm: 10, in: 25.4 }[unit];
}
const mean = (values: number[]) =>
  values.reduce((a, b) => a + b, 0) / values.length;
const errorPct = (measured: number, target: number) =>
  (measured / target - 1) * 100;

/** Equal weight per zone; repeats within a zone are averaged first. All dimensions are mm. */
export function analyzeProjector(
  squareMm: number,
  readings: ProjectorReading[],
  tolerancePct = 0.5,
) {
  if (!Number.isFinite(squareMm) || squareMm < 5 || squareMm > 500)
    throw new Error("square");
  if (!Number.isFinite(tolerancePct) || tolerancePct < 0 || tolerancePct > 10)
    throw new Error("tolerance");
  if (!readings.length || readings.length > 180) throw new Error("readings");
  for (const r of readings) {
    if (
      !PROJECTOR_ZONES.some((z) => z.id === r.zone) ||
      ![r.widthMm, r.heightMm].every(
        (v) => Number.isFinite(v) && v > 0 && v <= 10000,
      )
    )
      throw new Error("measurement");
  }
  const zones = PROJECTOR_ZONES.flatMap((zone) => {
    const items = readings.filter((r) => r.zone === zone.id);
    if (!items.length) return [];
    const widthMm = mean(items.map((r) => r.widthMm));
    const heightMm = mean(items.map((r) => r.heightMm));
    const xErrorPct = errorPct(widthMm, squareMm),
      yErrorPct = errorPct(heightMm, squareMm);
    // Check every reading, so averaging repeats cannot hide an outlier.
    const maxErrorPct = Math.max(
      ...items.flatMap((r) => [
        Math.abs(errorPct(r.widthMm, squareMm)),
        Math.abs(errorPct(r.heightMm, squareMm)),
      ]),
    );
    return [
      {
        ...zone,
        count: items.length,
        widthMm,
        heightMm,
        xErrorPct,
        yErrorPct,
        maxErrorPct,
        withinTolerance: maxErrorPct <= tolerancePct + 1e-9,
      },
    ];
  });
  const xScale = mean(zones.map((z) => z.widthMm)) / squareMm;
  const yScale = mean(zones.map((z) => z.heightMm)) / squareMm;
  // Compare opposite edges at matching row/column positions to avoid sampling bias.
  function edgeDifference(axis: "vertical" | "horizontal") {
    const pairs: number[] = [];
    for (let i = 0; i < 3; i++) {
      const a = zones.find((z) =>
        axis === "vertical"
          ? z.row === 0 && z.col === i
          : z.col === 0 && z.row === i,
      );
      const b = zones.find((z) =>
        axis === "vertical"
          ? z.row === 2 && z.col === i
          : z.col === 2 && z.row === i,
      );
      if (a && b)
        pairs.push(
          axis === "vertical"
            ? ((b.widthMm - a.widthMm) / squareMm) * 100
            : ((b.heightMm - a.heightMm) / squareMm) * 100,
        );
    }
    return {
      differencePct: pairs.length ? mean(pairs) : null,
      pairs: pairs.length,
    };
  }
  const verticalKeystone = edgeDifference("vertical");
  const horizontalKeystone = edgeDifference("horizontal");
  const maxErrorPct = Math.max(...zones.map((z) => z.maxErrorPct));
  return {
    squareMm,
    tolerancePct,
    zones,
    measuredZones: zones.length,
    scaleErrorPct: ((xScale + yScale) / 2 - 1) * 100,
    xErrorPct: (xScale - 1) * 100,
    yErrorPct: (yScale - 1) * 100,
    aspectStretchPct: (xScale / yScale - 1) * 100,
    correctionX: 1 / xScale,
    correctionY: 1 / yScale,
    verticalKeystone,
    horizontalKeystone,
    maxErrorPct,
    status:
      maxErrorPct > tolerancePct + 1e-9
        ? "adjust"
        : zones.length === 9
          ? "within-tolerance"
          : "incomplete",
  };
}
export type ProjectorReport = ReturnType<typeof analyzeProjector>;
export function projectorAdvice(report: ProjectorReport) {
  const advice: { en: string; zh: string }[] = [];
  const threshold = Math.max(0.05, report.tolerancePct);
  const { scaleErrorPct: scale, aspectStretchPct: aspect } = report;
  if (Math.abs(scale) > threshold) {
    advice.push(
      scale > 0
        ? {
            en: "Squares are too large on average. Reduce image zoom or shorten the lens-to-mat throw; for a perpendicular overhead projector, lower it toward the mat. Recheck focus and all zones.",
            zh: "方格平均偏大。缩小图像，或缩短镜头到裁剪垫的投射距离；垂直顶投时可降低投影仪，使其靠近垫面。重新对焦并复测各区。",
          }
        : {
            en: "Squares are too small on average. Increase image zoom or lengthen the lens-to-mat throw; for a perpendicular overhead projector, raise it away from the mat. Recheck focus and all zones.",
            zh: "方格平均偏小。放大图像，或增加镜头到裁剪垫的投射距离；垂直顶投时可升高投影仪，使其远离垫面。重新对焦并复测各区。",
          },
    );
  }
  if (Math.abs(aspect) > threshold)
    advice.push(
      aspect > 0
        ? {
            en: "Horizontal scale is larger than vertical scale. Reduce horizontal stretch relative to vertical; check the source and projector aspect-ratio settings before changing uniform zoom.",
            zh: "横向比例大于纵向比例。相对缩小横向拉伸；调整统一缩放前，先检查信号源和投影仪的宽高比设置。",
          }
        : {
            en: "Vertical scale is larger than horizontal scale. Reduce vertical stretch relative to horizontal; check the source and projector aspect-ratio settings before changing uniform zoom.",
            zh: "纵向比例大于横向比例。相对缩小纵向拉伸；调整统一缩放前，先检查信号源和投影仪的宽高比设置。",
          },
    );
  for (const axis of ["vertical", "horizontal"] as const) {
    const result =
      axis === "vertical" ? report.verticalKeystone : report.horizontalKeystone;
    if (
      result.differencePct === null ||
      Math.abs(result.differencePct) <= threshold
    )
      continue;
    const positive = result.differencePct > 0;
    const side =
      axis === "vertical"
        ? positive
          ? "bottom"
          : "top"
        : positive
          ? "right"
          : "left";
    const sideZh =
      axis === "vertical" ? (positive ? "下" : "上") : positive ? "右" : "左";
    advice.push({
      en: `${axis === "vertical" ? "Vertical" : "Horizontal"} keystone indicator: the ${side} edge has larger squares. Align the projector to the mat first. If digital correction is still needed, use ${axis} keystone to compress the ${side} edge relative to the opposite edge; dial signs vary by model. Remeasure after each small change.`,
      zh: `${axis === "vertical" ? "垂直" : "水平"}梯形失真指示：${sideZh}边方格较大。先调整投影仪与垫面的对齐。仍需数字校正时，用${axis === "vertical" ? "垂直" : "水平"}梯形校正相对压缩${sideZh}边；不同型号的正负方向不同。每次微调后重新测量。`,
    });
  }
  if (report.measuredZones < 9)
    advice.push({
      en: "Coverage is incomplete. Measure the center, all four corners and all four edges before judging the whole cutting area.",
      zh: "测量覆盖不完整。请测中心、四角和四边，再判断整个裁剪区域。",
    });
  advice.push({
    en: "These are measurement-based indicators, not a recovered optical model. Keep the mat flat; use the intended source, orientation and zoom. For short/ultra-short throw units follow the installation geometry. Verify a long ruler span as well as the small squares, and remeasure after panning, casting or changing zoom.",
    zh: "这些是基于测量的指示，不能反推完整光学模型。保持垫面平整，使用实际裁剪时的信号源、方向及缩放。短焦和超短焦机型应遵循安装几何要求。除小方格外还应核对长距离刻度；平移、投屏或改变缩放后均需复测。",
  });
  return advice;
}

/** Nominal test chart: calibration reports never distort its geometry. */
export function projectorGrid(chart: ProjectorChart) {
  const { widthMm: w, heightMm: h, squareMm: s } = chart;
  if (
    ![w, h, s].every(Number.isFinite) ||
    s < 5 ||
    s > 500 ||
    w > 3000 ||
    h > 3000 ||
    w < s * 3 + 40 ||
    h < s * 3 + 40
  )
    throw new Error("chart");
  const cols = Math.floor((w - 40) / s),
    rows = Math.floor((h - 40) / s);
  const x0 = (w - cols * s) / 2,
    y0 = (h - rows * s) / 2;
  const lines: string[] = [];
  for (let i = 0; i <= cols; i++)
    lines.push(`<path d="M${x0 + i * s} ${y0}v${rows * s}"/>`);
  for (let i = 0; i <= rows; i++)
    lines.push(`<path d="M${x0} ${y0 + i * s}h${cols * s}"/>`);
  const cells = PROJECTOR_ZONES.map((z) => {
    const col = [0, Math.floor((cols - 1) / 2), cols - 1][z.col];
    const row = [0, Math.floor((rows - 1) / 2), rows - 1][z.row];
    const x = x0 + col * s,
      y = y0 + row * s;
    return `<g id="${z.id}"><rect x="${x}" y="${y}" width="${s}" height="${s}"/><text fill="black" stroke="none" x="${x + s / 2}" y="${y + s / 2}" font-size="${Math.min(5, s / 4)}">${z.code}</text></g>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}"><title>Projector calibration grid / 缝纫投影校准网格</title><desc>All coordinates in mm. Measure line centers. Each cell ${s} mm square. A1 top left; B2 center; C3 bottom right. Grid span ${cols * s} by ${rows * s} mm.</desc><rect width="${w}" height="${h}" fill="white"/><g fill="none" stroke="#888" stroke-width="0.15">${lines.join("")}</g><g fill="none" stroke="black" stroke-width="0.3" font-family="sans-serif" text-anchor="middle">${cells}</g><g fill="black" font-family="sans-serif" font-size="3" text-anchor="middle"><text x="${w / 2}" y="8">TOP / 上 — ${s} mm squares / 方格</text><text x="${w / 2}" y="14">Measure line centers / 测线条中心 · A1 → A3 · C1 → C3</text><text x="${w / 2}" y="${h - 8}">Grid span / 网格跨度: ${cols * s} × ${rows * s} mm · Verify with a ruler / 用尺核验</text></g></svg>`;
}
export function projectorCsv(
  readings: ProjectorReading[],
  report: ProjectorReport,
) {
  return [
    "zone,reading,width_mm,height_mm,target_mm,x_error_pct,y_error_pct,within_tolerance",
    ...readings.map((r, i) =>
      [
        r.zone,
        i + 1,
        r.widthMm,
        r.heightMm,
        report.squareMm,
        errorPct(r.widthMm, report.squareMm),
        errorPct(r.heightMm, report.squareMm),
        Math.max(
          Math.abs(errorPct(r.widthMm, report.squareMm)),
          Math.abs(errorPct(r.heightMm, report.squareMm)),
        ) <=
          report.tolerancePct + 1e-9,
      ].join(","),
    ),
  ].join("\r\n");
}
