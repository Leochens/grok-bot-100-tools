import { parseCsv } from "./bom.ts";
export type CutPart = {
  name: string;
  length: number;
  width: number;
  quantity: number;
  grain: boolean;
};
export type CutStock = {
  name: string;
  length: number;
  width: number;
  quantity: number;
};
export type Rect = { x: number; y: number; w: number; h: number };
export type Placement = Rect & { name: string; rotated: boolean; id: number };
export type SawCut = {
  axis: "rip" | "crosscut";
  coordinate: number;
  from: number;
  to: number;
  kerf: number;
  part: string;
};
export type StockLayout = {
  name: string;
  length: number;
  width: number;
  parts: Placement[];
  offcuts: Rect[];
  waste: Rect[];
  cuts: SawCut[];
};
export type CutPlan = {
  mode: "1d" | "2d";
  kerf: number;
  layouts: StockLayout[];
  unplaced: string[];
  utilization: number;
};
export function parseCutTable(raw: string, stock = false): CutPart[] {
  const delimiter = raw
    .split(/\r?\n/)
    .find((line) => line.trim())
    ?.includes("\t")
    ? "\t"
    : ",";
  return parseCsv(raw, delimiter).map((row, i) => {
    const cells = row.map((cell) => cell.trim());
    if (cells.length < 4 || cells.length > 5 || !cells[0])
      throw new Error("table");
    const [name, l, w, q, g] = cells,
      length = Number(l),
      width = Number(w),
      quantity = Number(q);
    if (
      ![length, width].every(
        (n) => Number.isFinite(n) && n > 0 && n <= 100000,
      ) ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 1000 ||
      (!stock &&
        g &&
        !["yes", "no", "true", "false", "1", "0"].includes(g.toLowerCase()))
    )
      throw new Error("table");
    return {
      name: name || String(i + 1),
      length,
      width,
      quantity,
      grain: ["yes", "true", "1"].includes(g?.toLowerCase()),
    };
  });
}
export function solveCuts(
  parts: CutPart[],
  stocks: CutStock[],
  mode: "1d" | "2d",
  kerf: number,
): CutPlan {
  if (
    !["1d", "2d"].includes(mode) ||
    !Number.isFinite(kerf) ||
    kerf < 0 ||
    kerf > 100
  )
    throw new Error("kerf");
  if (parts.some((p) => !p.name || typeof p.grain !== "boolean"))
    throw new Error("table");
  for (const row of [...parts, ...stocks])
    if (
      ![row.length, row.width].every(
        (n) => Number.isFinite(n) && n > 0 && n <= 100000,
      ) ||
      !Number.isInteger(row.quantity) ||
      row.quantity < 1
    )
      throw new Error("table");
  const partCount = parts.reduce((s, p) => s + p.quantity, 0),
    stockCount = stocks.reduce((s, p) => s + p.quantity, 0);
  if (partCount > 2000 || stockCount > 1000) throw new Error("limit");
  const pieces = parts
    .flatMap((p, index) =>
      Array.from({ length: p.quantity }, (_, copy) => ({
        ...p,
        id: index * 10000 + copy,
        width: mode === "1d" ? 1 : p.width,
      })),
    )
    .sort(
      (a, b) =>
        (mode === "1d"
          ? b.length - a.length
          : b.length * b.width - a.length * a.width) ||
        b.length - a.length ||
        a.id - b.id,
    );
  const available = stocks.flatMap((s) =>
    Array.from({ length: s.quantity }, (_, i) => ({
      name: `${s.name} #${i + 1}`,
      length: s.length,
      width: mode === "1d" ? 1 : s.width,
    })),
  );
  const layouts: StockLayout[] = [],
    unplaced: string[] = [];
  const fits = (p: (typeof pieces)[number], r: Rect) =>
    p.length <= r.w + 1e-8 && p.width <= r.h + 1e-8;
  for (const piece of pieces) {
    let selected:
      { layout: StockLayout; index: number; rotated: boolean } | undefined;
    for (const layout of layouts) {
      const index = layout.offcuts.findIndex(
        (r) =>
          fits(piece, r) ||
          (mode === "2d" &&
            !piece.grain &&
            fits({ ...piece, length: piece.width, width: piece.length }, r)),
      );
      if (index >= 0) {
        selected = {
          layout,
          index,
          rotated: !fits(piece, layout.offcuts[index]),
        };
        break;
      }
    }
    if (!selected) {
      const si = available.findIndex(
        (s) =>
          fits(piece, { x: 0, y: 0, w: s.length, h: s.width }) ||
          (mode === "2d" &&
            !piece.grain &&
            fits(
              { ...piece, length: piece.width, width: piece.length },
              { x: 0, y: 0, w: s.length, h: s.width },
            )),
      );
      if (si >= 0) {
        const s = available.splice(si, 1)[0],
          layout: StockLayout = {
            ...s,
            parts: [],
            offcuts: [{ x: 0, y: 0, w: s.length, h: s.width }],
            waste: [],
            cuts: [],
          };
        layouts.push(layout);
        selected = {
          layout,
          index: 0,
          rotated: !fits(piece, layout.offcuts[0]),
        };
      }
    }
    if (!selected) {
      unplaced.push(piece.name);
      continue;
    }
    const { layout, index, rotated } = selected,
      r = layout.offcuts.splice(index, 1)[0],
      w = rotated ? piece.width : piece.length,
      h = rotated ? piece.length : piece.width;
    layout.parts.push({
      x: r.x,
      y: r.y,
      w,
      h,
      name: piece.name,
      id: piece.id,
      rotated,
    });
    const dx = Math.max(0, r.w - w),
      dy = Math.max(0, r.h - h),
      kx = Math.min(kerf, dx),
      ky = Math.min(kerf, dy);
    // Cut the full parent rectangle vertically, then crosscut only its left child.
    if (dx > 1e-8) {
      layout.cuts.push({
        axis: mode === "1d" ? "crosscut" : "rip",
        coordinate: r.x + w,
        from: r.y,
        to: r.y + r.h,
        kerf: kx,
        part: piece.name,
      });
      if (kx) layout.waste.push({ x: r.x + w, y: r.y, w: kx, h: r.h });
    }
    if (dy > 1e-8) {
      layout.cuts.push({
        axis: "crosscut",
        coordinate: r.y + h,
        from: r.x,
        to: r.x + w,
        kerf: ky,
        part: piece.name,
      });
      if (ky) layout.waste.push({ x: r.x, y: r.y + h, w, h: ky });
    }
    if (dx - kx > 1e-8)
      layout.offcuts.push({ x: r.x + w + kx, y: r.y, w: dx - kx, h: r.h });
    if (dy - ky > 1e-8)
      layout.offcuts.push({ x: r.x, y: r.y + h + ky, w, h: dy - ky });
    layout.offcuts.sort((a, b) => a.y - b.y || a.x - b.x);
  }
  const area = layouts.reduce((s, l) => s + l.length * l.width, 0),
    used = layouts.reduce(
      (s, l) => s + l.parts.reduce((a, p) => a + p.w * p.h, 0),
      0,
    );
  return { mode, kerf, layouts, unplaced, utilization: area ? used / area : 0 };
}
export function xmlText(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
}
export function cutLayoutSvg(layout: StockLayout, mode: "1d" | "2d") {
  const displayHeight =
      mode === "1d" ? Math.max(40, layout.length / 20) : layout.width,
    scaleY = displayHeight / layout.width,
    font = Math.max(2, Math.min(layout.length, displayHeight) / 25);
  const rect = (r: Rect, fill: string, label: string) =>
    `<g><rect x="${r.x}" y="${r.y * scaleY}" width="${r.w}" height="${r.h * scaleY}" fill="${fill}" stroke="#28364a" stroke-width="0.4"/><title>${xmlText(label)}</title>${r.w > font * 3 ? `<text x="${r.x + 2}" y="${r.y * scaleY + font * 1.4}" font-size="${font}" fill="#111827">${xmlText(label)}</text>` : ""}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.length}mm" height="${displayHeight}mm" viewBox="0 0 ${layout.length} ${displayHeight}"><title>${xmlText(layout.name)}; dimensions mm${mode === "1d" ? "; board height exaggerated for readability" : ""}</title>${layout.parts.map((p) => rect(p, "#a5d8ff", `${p.name}: ${p.w} × ${p.h} @ ${p.x},${p.y}`)).join("")}${layout.offcuts.map((r, i) => rect(r, "#bbf7d0", `Offcut ${i + 1}: ${r.w.toFixed(2)} × ${r.h.toFixed(2)}`)).join("")}${layout.waste.map((r) => rect(r, "#f87171", "Kerf")).join("")}</svg>`;
}
export function cutListCsv(plan: CutPlan) {
  const rows = [
    ["Stock", "Part", "X_mm", "Y_mm", "Length_mm", "Width_mm", "Rotated"],
    ...plan.layouts.flatMap((l) =>
      l.parts.map((p) => [
        l.name,
        p.name,
        p.x,
        p.y,
        p.w,
        p.h,
        p.rotated ? "yes" : "no",
      ]),
    ),
  ];
  return (
    rows
      .map((r) =>
        r.map((c) => '"' + String(c).replaceAll('"', '""') + '"').join(","),
      )
      .join("\r\n") + "\r\n"
  );
}
export function cutSchedule(plan: CutPlan) {
  return plan.layouts
    .map(
      (l) =>
        `## ${l.name} (${l.length} × ${l.width} mm)\n${l.cuts.map((c, i) => `${i + 1}. ${c.axis}: ${c.axis === "rip" || plan.mode === "1d" ? "x" : "y"}=${c.coordinate.toFixed(2)} mm; span ${c.from.toFixed(2)}–${c.to.toFixed(2)} mm; kerf ${c.kerf.toFixed(2)} mm; ${c.part}`).join("\n")}\n${l.offcuts.map((r, i) => `Offcut ${i + 1}: ${r.w.toFixed(2)} × ${r.h.toFixed(2)} mm at (${r.x.toFixed(2)}, ${r.y.toFixed(2)})`).join("\n")}`,
    )
    .join("\n\n");
}
export const CUT_PARTS_SAMPLE =
  "Side,720,300,2,yes\nShelf,540,280,3,yes\nBrace,300,80,4,no";
export const CUT_STOCK_SAMPLE = "Plywood,2440,1220,1";
