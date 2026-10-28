import postcss from "postcss";
const palette = (s: string) => s.split(" ").map((c) => "#" + c.toLowerCase());
export const PALETTES = {
  cga1high: {
    name: "CGA Palette 1 · High",
    colors: palette("000000 55FFFF FF55FF FFFFFF"),
  },
  cga1low: {
    name: "CGA Palette 1 · Low",
    colors: palette("000000 00AAAA AA00AA AAAAAA"),
  },
  cga0high: {
    name: "CGA Palette 0 · High",
    colors: palette("000000 55FF55 FF5555 FFFF55"),
  },
  cga0low: {
    name: "CGA Palette 0 · Low",
    colors: palette("000000 00AA00 AA0000 AA5500"),
  },
  dmg: {
    name: "Game Boy DMG-01",
    colors: palette("0F380F 306230 8BAC0F 9BBC0F"),
  },
  pico8: {
    name: "PICO-8 · 16",
    colors: palette(
      "000000 1D2B53 7E2553 008751 AB5236 5F574F C2C3C7 FFF1E8 FF004D FFA300 FFEC27 00E436 29ADFF 83769C FF77A8 FFCCAA",
    ),
  },
  nes: {
    name: "NES 2C02 · 64 register entries",
    colors: palette(
      "666666 002A88 1412A7 3B00A4 5C007E 6E0040 6C0600 561D00 333500 0B4800 005200 004F08 00404D 000000 000000 000000 ADADAD 155FD9 4240FF 7527FE A01ACC B71E7B B53120 994E00 6B6D00 388700 0C9300 008F32 007C8D 000000 000000 000000 FFFFFF 64B0FF 9290FF C676FF F36AFF FE6ECC FE8170 EA9E22 BCBE00 88D800 5CE430 45E082 48CDDE 4F4F4F 000000 000000 FFFFFF C0DFFF D3D2FF E8C8FF FBC2FF FEC4EA FECCC5 F7D8A5 E4E594 CFEF96 BDF4AB B3F3CC B5EBF2 B8B8B8 000000 000000",
    ),
  },
} as const;
export type PaletteKey = keyof typeof PALETTES;
export function parseHexColors(raw: string) {
  let colorText = raw;
  if (raw.includes("{")) {
    const values: string[] = [];
    try {
      postcss.parse(raw).walkDecls((d) => {
        values.push(d.value);
      });
    } catch {
      throw new Error("css");
    }
    colorText = values.join(" ");
  }
  const tokens = colorText.match(/#[\da-z]+\b/gi) ?? [];
  if (!tokens.length && raw.trim()) {
    const plain = raw
      .trim()
      .split(/[\s,;]+/)
      .filter(Boolean);
    if (plain.every((c) => /^[\da-f]{3}$|^[\da-f]{6}$/i.test(c)))
      return [...new Set(plain.map((c) => normalizeHex("#" + c)))];
  }
  if (tokens.some((c) => !/^#(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i.test(c)))
    throw new Error("hex");
  if (tokens.some((c) => c.length === 9 && c.slice(-2).toLowerCase() !== "ff"))
    throw new Error("alpha");
  if (!tokens.length && raw.trim()) throw new Error("empty");
  return [...new Set(tokens.map(normalizeHex))];
}
export function normalizeHex(c: string) {
  const s = c.slice(1, 7).toLowerCase();
  return "#" + (s.length === 3 ? [...s].map((c) => c + c).join("") : s);
}
export function rgb(hex: string) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}
export function linear(n: number) {
  const v = n / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}
export function oklab(hex: string) {
  const [r, g, b] = rgb(hex).map(linear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b),
    m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b),
    s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
export function quantize(color: string, targets: readonly string[]) {
  const lab = oklab(color);
  return targets
    .map((hex, index) => ({
      hex,
      index,
      delta: Math.hypot(...oklab(hex).map((v, i) => v - lab[i])),
    }))
    .reduce((best, c) => (c.delta < best.delta ? c : best));
}
export function contrast(a: string, b: string) {
  const luminance = (c: string) => {
    const [r, g, b] = rgb(c).map(linear);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function exportPalette(
  colors: readonly string[],
  name: string,
  format: "hex" | "gpl" | "css",
) {
  if (format === "hex") return colors.map((c) => c.slice(1)).join("\n") + "\n";
  if (format === "css")
    return (
      ":root {\n" +
      colors.map((c, i) => `  --palette-${i}: ${c};`).join("\n") +
      "\n}\n"
    );
  return (
    `GIMP Palette\nName: ${name}\nColumns: 8\n#\n` +
    colors
      .map(
        (c, i) =>
          rgb(c)
            .map((n) => String(n).padStart(3))
            .join(" ") + `\tRegister ${i}`,
      )
      .join("\n") +
    "\n"
  );
}
export const PALETTE_SAMPLE =
  ":root {\n  --ink: #21334e;\n  --sky: #5ee8d9;\n  --petal: #f46fc8;\n  --paper: #fff2e1;\n  --earth: #98562c;\n  --grass: #79bb40;\n}";
