import svgpath from "svgpath";
export type Bounds = { minX: number; minY: number; maxX: number; maxY: number };
const tau = Math.PI * 2;
export function pathBounds(d: string): Bounds {
  const path = svgpath(d).abs().unshort();
  if ((path as unknown as { err: string }).err) throw new Error("path");
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity,
    sx = 0,
    sy = 0;
  const point = (x: number, y: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };
  const roots = (a: number, b: number, c: number) => {
    if (Math.abs(a) < 1e-12) return Math.abs(b) < 1e-12 ? [] : [-c / b];
    const disc = b * b - 4 * a * c;
    return disc < 0
      ? []
      : [(-b + Math.sqrt(disc)) / (2 * a), (-b - Math.sqrt(disc)) / (2 * a)];
  };
  path.iterate((segment, _i, x, y) => {
    const v = segment.slice(1) as number[];
    const command = segment[0];
    if (command === "M") {
      sx = v[0];
      sy = v[1];
      return;
    }
    point(x, y);
    if (command === "L") point(v[0], v[1]);
    else if (command === "H") point(v[0], y);
    else if (command === "V") point(x, v[0]);
    else if (command === "Z" || command === "z") point(sx, sy);
    else if (command === "C") {
      point(v[4], v[5]);
      const evaluate = (t: number) => {
        const u = 1 - t;
        point(
          u * u * u * x +
            3 * u * u * t * v[0] +
            3 * u * t * t * v[2] +
            t * t * t * v[4],
          u * u * u * y +
            3 * u * u * t * v[1] +
            3 * u * t * t * v[3] +
            t * t * t * v[5],
        );
      };
      for (let axis = 0; axis < 2; axis++) {
        const a = axis ? y : x,
          b = v[axis],
          c = v[axis + 2],
          e = v[axis + 4];
        for (const t of roots(
          -a + 3 * b - 3 * c + e,
          2 * (a - 2 * b + c),
          b - a,
        ))
          if (t > 0 && t < 1) evaluate(t);
      }
    } else if (command === "Q") {
      point(v[2], v[3]);
      for (let axis = 0; axis < 2; axis++) {
        const a = axis ? y : x,
          b = v[axis],
          c = v[axis + 2],
          den = a - 2 * b + c,
          t = (a - b) / den;
        if (t > 0 && t < 1) {
          const u = 1 - t;
          point(
            u * u * x + 2 * u * t * v[0] + t * t * v[2],
            u * u * y + 2 * u * t * v[1] + t * t * v[3],
          );
        }
      }
    } else if (command === "A") {
      let [rx, ry] = v.map(Math.abs);
      const phi = (v[2] * Math.PI) / 180,
        large = v[3],
        sweep = v[4],
        ex = v[5],
        ey = v[6];
      point(ex, ey);
      if (!rx || !ry || (x === ex && y === ey)) return;
      const cos = Math.cos(phi),
        sin = Math.sin(phi),
        xp = (cos * (x - ex)) / 2 + (sin * (y - ey)) / 2,
        yp = (-sin * (x - ex)) / 2 + (cos * (y - ey)) / 2;
      const correction = (xp * xp) / (rx * rx) + (yp * yp) / (ry * ry);
      if (correction > 1) {
        rx *= Math.sqrt(correction);
        ry *= Math.sqrt(correction);
      }
      const factor =
        (large === sweep ? -1 : 1) *
        Math.sqrt(
          Math.max(
            0,
            (rx * rx * ry * ry - rx * rx * yp * yp - ry * ry * xp * xp) /
              (rx * rx * yp * yp + ry * ry * xp * xp),
          ),
        );
      const cxp = (factor * rx * yp) / ry,
        cyp = (-factor * ry * xp) / rx,
        cx = cos * cxp - sin * cyp + (x + ex) / 2,
        cy = sin * cxp + cos * cyp + (y + ey) / 2;
      const start = Math.atan2((yp - cyp) / ry, (xp - cxp) / rx),
        end = Math.atan2((-yp - cyp) / ry, (-xp - cxp) / rx);
      let delta = end - start;
      if (sweep && delta < 0) delta += tau;
      if (!sweep && delta > 0) delta -= tau;
      const wrap = (a: number) => ((a % tau) + tau) % tau;
      const onArc = (a: number) =>
        sweep
          ? wrap(a - start) <= delta + 1e-10
          : wrap(start - a) <= -delta + 1e-10;
      const ax = Math.atan2(-ry * sin, rx * cos),
        ay = Math.atan2(ry * cos, rx * sin);
      for (const a of [ax, ax + Math.PI, ay, ay + Math.PI])
        if (onArc(a))
          point(
            cx + rx * cos * Math.cos(a) - ry * sin * Math.sin(a),
            cy + rx * sin * Math.cos(a) + ry * cos * Math.sin(a),
          );
    }
  });
  if (![minX, minY, maxX, maxY].every(Number.isFinite))
    throw new Error("empty");
  return { minX, minY, maxX, maxY };
}
export function validateTransform(value: string) {
  const command = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
  const number = /[+-]?(?:\d*\.\d+|\d+\.?\d*)(?:e[+-]?\d+)?/gi;
  let count = 0;
  const rest = value.replace(command, (_text, name: string, args: string) => {
    const numbers = args.match(number) ?? [];
    const allowed: Record<string, number[]> = {
      matrix: [6],
      translate: [1, 2],
      scale: [1, 2],
      rotate: [1, 3],
      skewX: [1],
      skewY: [1],
    };
    if (
      !allowed[name].includes(numbers.length) ||
      numbers.some((n) => !Number.isFinite(Number(n))) ||
      args.replace(number, "").replace(/[\s,]/g, "")
    )
      throw new Error("transform");
    count++;
    return "";
  });
  if (!count || rest.replace(/[\s,]/g, "")) throw new Error("transform");
}
export type GlyphPath = { d: string; fillRule: "evenodd" | "nonzero" };
export type Glyph = {
  name: string;
  paths: GlyphPath[];
  bounds: Bounds;
  centroid: { x: number; y: number };
};
function numberAttr(el: Element, key: string, defaultValue = 0) {
  const raw = el.getAttribute(key);
  if (raw === null) return defaultValue;
  if (!/^[+-]?(?:\d*\.)?\d+(?:e[+-]?\d+)?$/i.test(raw.trim()))
    throw new Error("units");
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error("units");
  return n;
}
function shapePath(el: Element): string {
  const n = (key: string, fallback = 0) => numberAttr(el, key, fallback),
    tag = el.localName;
  if (tag === "path") return el.getAttribute("d") ?? "";
  if (tag === "rect") {
    const x = n("x"),
      y = n("y"),
      w = n("width"),
      h = n("height"),
      rx = Math.min(n("rx", n("ry")), w / 2),
      ry = Math.min(n("ry", n("rx")), h / 2);
    if (w <= 0 || h <= 0 || rx < 0 || ry < 0) throw new Error("shape");
    if (rx && ry)
      return `M${x + rx},${y}H${x + w - rx}A${rx},${ry} 0 0 1 ${x + w},${y + ry}V${y + h - ry}A${rx},${ry} 0 0 1 ${x + w - rx},${y + h}H${x + rx}A${rx},${ry} 0 0 1 ${x},${y + h - ry}V${y + ry}A${rx},${ry} 0 0 1 ${x + rx},${y}Z`;
    return `M${x},${y}h${w}v${h}h${-w}Z`;
  }
  if (tag === "circle" || tag === "ellipse") {
    const x = n("cx"),
      y = n("cy"),
      rx = tag === "circle" ? n("r") : n("rx"),
      ry = tag === "circle" ? rx : n("ry");
    if (rx <= 0 || ry <= 0) throw new Error("shape");
    return `M${x - rx},${y}A${rx},${ry} 0 1 0 ${x + rx},${y}A${rx},${ry} 0 1 0 ${x - rx},${y}Z`;
  }
  if (tag === "polygon" || tag === "polyline") {
    const text = el.getAttribute("points") ?? "";
    if (/[^\deE+.,\s-]/.test(text)) throw new Error("shape");
    const v = text
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    if (v.length < 6 || v.length % 2 || !v.every(Number.isFinite))
      throw new Error("shape");
    return (
      `M${v[0]},${v[1]}` +
      v.slice(2).reduce((s, v, i) => s + (i % 2 ? "," : "L") + v, "") +
      (tag === "polygon" ? "Z" : "")
    );
  }
  throw new Error("unsupported");
}
export function opticalCentroid(paths: GlyphPath[], b: Bounds) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvas");
  const scale = 508 / Math.max(b.maxX - b.minX, b.maxY - b.minY);
  ctx.setTransform(scale, 0, 0, scale, 2 - b.minX * scale, 2 - b.minY * scale);
  ctx.fillStyle = "#000";
  for (const p of paths) ctx.fill(new Path2D(p.d), p.fillRule);
  const data = ctx.getImageData(0, 0, 512, 512).data;
  let sum = 0,
    x = 0,
    y = 0;
  for (let i = 3; i < data.length; i += 4) {
    const a = data[i];
    sum += a;
    x += ((((i - 3) / 4) % 512) + 0.5) * a;
    y += (Math.floor((i - 3) / 4 / 512) + 0.5) * a;
  }
  if (!sum) throw new Error("empty");
  return {
    x: (x / sum - 2) / scale + b.minX,
    y: (y / sum - 2) / scale + b.minY,
  };
}
export function parseGlyphs(raw: string): Glyph[] {
  if (!raw.trim()) return [];
  if (/<!DOCTYPE|<!ENTITY/i.test(raw)) throw new Error("unsupported");
  const clean = raw.replace(/<\?xml[^?]*\?>/g, "");
  const xml = new DOMParser().parseFromString(
    `<collection xmlns="http://www.w3.org/2000/svg">${clean}</collection>`,
    "application/xml",
  );
  if (xml.querySelector("parsererror")) throw new Error("xml");
  const root = xml.documentElement;
  const svgs = [...root.children].filter((el) => el.localName === "svg");
  const groups = svgs.length ? svgs : [root];
  if (svgs.length && svgs.length !== root.children.length)
    throw new Error("mixed");
  const names = new Set<string>();
  return groups.map((group, i) => {
    const paths: GlyphPath[] = [];
    function walk(
      el: Element,
      transforms: string[],
      rule: "evenodd" | "nonzero",
      fill: string,
      stroke: string,
    ) {
      const tag = el.localName;
      if (tag === "svg" && el !== group) throw new Error("unsupported");
      if (
        ["opacity", "fill-opacity"].some(
          (key) => el.hasAttribute(key) && el.getAttribute(key) !== "1",
        ) ||
        ["display", "visibility"].some((key) => el.hasAttribute(key))
      )
        throw new Error("unsupported");
      if (["title", "desc", "metadata"].includes(tag)) return;
      if (
        ![
          "collection",
          "svg",
          "g",
          "path",
          "rect",
          "circle",
          "ellipse",
          "polygon",
          "polyline",
        ].includes(tag) ||
        el.hasAttribute("style") ||
        el.hasAttribute("class") ||
        el.hasAttribute("clip-path") ||
        el.hasAttribute("mask") ||
        el.hasAttribute("filter")
      )
        throw new Error("unsupported");
      for (const attr of el.attributes)
        if (attr.name.startsWith("on") || attr.name.includes("href"))
          throw new Error("unsupported");
      const transform = el.getAttribute("transform");
      if (transform) validateTransform(transform);
      const next = transform ? [...transforms, transform] : transforms;
      const localRule = el.getAttribute("fill-rule");
      const r =
        localRule === "evenodd"
          ? "evenodd"
          : localRule === "nonzero"
            ? "nonzero"
            : rule;
      const f = el.getAttribute("fill") ?? fill,
        st = el.getAttribute("stroke") ?? stroke;
      if (/url\(|var\(|transparent/i.test(f)) throw new Error("unsupported");
      if (st !== "none") throw new Error("stroke");
      if (["collection", "svg", "g"].includes(tag)) {
        for (const child of el.children) walk(child, next, r, f, st);
        return;
      }
      if (f === "none") return;
      const original = svgpath(shapePath(el));
      if ((original as unknown as { err: string }).err) throw new Error("path");
      const d = original.transform(next.join(" ")).abs().unshort().toString();
      pathBounds(d);
      paths.push({ d, fillRule: r });
    }
    walk(group, [], "nonzero", "#000", "none");
    if (!paths.length) throw new Error("empty");
    const boxes = paths.map((p) => pathBounds(p.d));
    const bounds = {
      minX: Math.min(...boxes.map((b) => b.minX)),
      minY: Math.min(...boxes.map((b) => b.minY)),
      maxX: Math.max(...boxes.map((b) => b.maxX)),
      maxY: Math.max(...boxes.map((b) => b.maxY)),
    };
    if (bounds.maxX <= bounds.minX || bounds.maxY <= bounds.minY)
      throw new Error("empty");
    let name = (
      group.getAttribute("data-name") ||
      group.id ||
      `glyph-${i + 1}`
    ).replace(/[^\p{L}\p{N}_-]/gu, "-");
    while (names.has(name)) name += "-2";
    names.add(name);
    return { name, paths, bounds, centroid: opticalCentroid(paths, bounds) };
  });
}
export type GlyphSettings = {
  em: number;
  capHeight: number;
  baseline: number;
  padding: number;
  overshoot: number;
  optical: boolean;
};
export function normalizeGlyph(
  g: Glyph,
  s: GlyphSettings,
  kind: "flat" | "round" | "pointed",
) {
  if (
    ![s.em, s.capHeight, s.baseline, s.padding, s.overshoot].every(
      Number.isFinite,
    ) ||
    s.em <= 0 ||
    s.capHeight <= 0 ||
    s.capHeight > s.em ||
    s.baseline < s.capHeight ||
    s.baseline > s.em ||
    s.padding < 0 ||
    s.padding * 2 >= s.em ||
    s.overshoot < 0
  )
    throw new Error("settings");
  const over =
    kind === "flat" ? 0 : s.overshoot * (kind === "pointed" ? 1.5 : 1);
  if (s.baseline + over > s.em || s.baseline - s.capHeight - over < 0)
    throw new Error("overshoot");
  const b = g.bounds,
    w = b.maxX - b.minX,
    h = b.maxY - b.minY,
    scale = Math.min((s.capHeight + 2 * over) / h, (s.em - 2 * s.padding) / w);
  const center = s.optical ? g.centroid.x : (b.minX + b.maxX) / 2;
  let x = s.em / 2 - center * scale;
  x = Math.max(
    s.padding - b.minX * scale,
    Math.min(s.em - s.padding - b.maxX * scale, x),
  );
  const y = s.baseline + over - b.maxY * scale;
  const paths = g.paths.map((p) => ({
    ...p,
    d: svgpath(p.d).matrix([scale, 0, 0, scale, x, y]).round(6).toString(),
  }));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s.em} ${s.em}">${paths.map((p) => `<path fill="#000" fill-rule="${p.fillRule}" d="${p.d}"/>`).join("")}</svg>`;
  return {
    ...g,
    paths,
    svg,
    scale,
    kind,
    normalizedBounds: {
      minX: b.minX * scale + x,
      minY: b.minY * scale + y,
      maxX: b.maxX * scale + x,
      maxY: b.maxY * scale + y,
    },
  };
}
export const SVG_SAMPLE =
  '<svg id="A" viewBox="0 0 100 100"><path fill-rule="evenodd" d="M5 90 L40 10 L60 10 L95 90 L74 90 L66 70 L34 70 L26 90 Z M42 50 L58 50 L50 28 Z"/></svg>\n<svg id="O" viewBox="0 0 100 100"><path fill-rule="evenodd" d="M50 5 A45 45 0 1 1 50 95 A45 45 0 1 1 50 5 Z M50 25 A25 25 0 1 0 50 75 A25 25 0 1 0 50 25 Z"/></svg>\n<svg id="H" viewBox="0 0 100 100"><rect x="5" y="10" width="20" height="80"/><rect x="75" y="10" width="20" height="80"/><rect x="20" y="42" width="60" height="16"/></svg>';
