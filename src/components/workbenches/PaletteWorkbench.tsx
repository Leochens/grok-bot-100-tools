"use client";
import { useState } from "react";
import { tools } from "@/data/tools";
import {
  contrast,
  exportPalette,
  PALETTES,
  PALETTE_SAMPLE,
  parseHexColors,
  quantize,
  type PaletteKey,
} from "@/lib/engines/palette";
import { useLanguage } from "../LanguageProvider";
import { ToolShell } from "../ToolShell";
import {
  download,
  ExportBar,
  Field,
  LocalStatus,
  TextImport,
  useLocalDraft,
} from "./shared";
const initial = {
  raw: "",
  palette: "cga1high" as PaletteKey,
  format: "gpl" as "hex" | "gpl" | "css",
  all: false,
  size: 8,
  brush: 1,
  layer: "sprite",
  bg: 0,
  tile: Array<number>(256).fill(0),
  sprite: Array<number>(256).fill(-1),
};
export function PaletteWorkbench() {
  const { t } = useLanguage();
  const {
    state: s,
    set,
    reset,
    stored,
    ready,
  } = useLocalDraft("one-hundred:palette:v1", initial);
  const [painting, setPainting] = useState(false);
  const [spriteImport, setSpriteImport] = useState("");
  const [spriteImportError, setSpriteImportError] = useState(false);
  const p = PALETTES[s.palette] || PALETTES.cga1high;
  let colors: string[] = [],
    error = "";
  try {
    colors = parseHexColors(s.raw);
  } catch (e) {
    error = (e as Error).message;
  }
  const mapped = colors.map((c) => ({ source: c, ...quantize(c, p.colors) })),
    unique = [...new Set(mapped.map((c) => c.hex))],
    outputColors = s.all ? [...p.colors] : unique;
  const output = exportPalette(outputColors, p.name, s.format);
  const paint = (i: number) => {
    const key = s.layer === "tile" ? "tile" : "sprite";
    set({
      [key]: s[key].map((v, j) =>
        j === i ? (key === "tile" && s.brush < 0 ? 0 : s.brush) : v,
      ),
    });
  };
  function png() {
    const canvas = document.createElement("canvas");
    canvas.width = s.size;
    canvas.height = s.size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    for (let y = 0; y < s.size; y++)
      for (let x = 0; x < s.size; x++) {
        const i = y * 16 + x,
          value = s.sprite[i] >= 0 ? s.sprite[i] : s.tile[i];
        ctx.fillStyle =
          p.colors[value % p.colors.length] || p.colors[s.bg % p.colors.length];
        ctx.fillRect(x, y, 1, 1);
      }
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "sprite.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }
  return (
    <ToolShell
      tool={tools.find((x) => x.day === 6)!}
      onSample={() =>
        set({
          ...initial,
          raw: PALETTE_SAMPLE,
          sprite: initial.sprite.map((v, i) => {
            const x = i % 16,
              y = Math.floor(i / 16);
            return x < 8 &&
              y < 8 &&
              (((x === 2 || x === 5) && y === 2) || (y === 5 && x > 1 && x < 6))
              ? 2
              : v;
          }),
        })
      }
      onReset={reset}
    >
      <div className="wb-layout">
        <section className="wb-panel">
          <h2>
            {t("Map colors to hardware registers", "把配色映射到硬件色盘")}
          </h2>
          <Field label={t("Hardware palette", "硬件色盘")}>
            <select
              value={s.palette}
              onChange={(e) => {
                const key = e.target.value as PaletteKey;
                set({
                  palette: key,
                  brush: 1,
                  tile: s.tile.map((v) => v % PALETTES[key].colors.length),
                  sprite: s.sprite.map((v) =>
                    v < 0 ? -1 : v % PALETTES[key].colors.length,
                  ),
                });
              }}
            >
              {Object.entries(PALETTES).map(([key, p]) => (
                <option key={key} value={key}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <TextImport
            value={s.raw}
            onChange={(raw) => set({ raw })}
            label={t(
              "Hex list, CSS variables or palette text",
              "粘贴十六进制颜色、CSS 变量或色盘文本",
            )}
            accept=".txt,.hex,.css"
            disabled={!ready}
          />
          {error && (
            <p className="wb-error" role="alert">
              {error === "alpha"
                ? t(
                    "Transparent colors need a background. Use opaque #RRGGBB or #RRGGBBFF colors.",
                    "透明色需要先合成背景，请用不透明的 #RRGGBB 或 #RRGGBBFF。",
                  )
                : t(
                    "Enter valid #RGB or #RRGGBB colors. No colors were silently skipped.",
                    "请输入有效的 #RGB 或 #RRGGBB 颜色，不会悄悄跳过有误的颜色。",
                  )}
            </p>
          )}
          <p className="muted">
            {t(
              "Nearest register uses Euclidean OKLab ΔE (0–1 scale). DMG green and NES 2C02 RGB are display approximations: analog hardware has no single canonical RGB palette. NES output retains register indices, including duplicates.",
              "按 OKLab 色差选最近的颜色（0–1 标度）。DMG 绿色和 NES 2C02 RGB 是屏幕近似色，模拟硬件没有唯一的标准 RGB。NES 保留全部寄存器编号，包括重复颜色。",
            )}
          </p>
        </section>
        <section className="wb-panel">
          <h2>{t("Quantization result", "映射结果")}</h2>
          <div className="wb-color-mapping">
            {mapped.map((c) => (
              <div key={c.source}>
                <span className="wb-swatch" style={{ background: c.source }} />
                <code>{c.source}</code>
                <span>→</span>
                <span className="wb-swatch" style={{ background: c.hex }} />
                <code>{c.hex}</code>
                <small>
                  ΔE {c.delta.toFixed(4)} · #{c.index}
                </small>
              </div>
            ))}
          </div>
          <label className="wb-check">
            <input
              type="checkbox"
              checked={s.all}
              onChange={(e) => set({ all: e.target.checked })}
            />
            {t(
              "Export full register palette instead of mapped colors",
              "导出完整硬件色盘",
            )}
          </label>
          <Field label={t("Palette format", "色盘格式")}>
            <select
              value={s.format}
              onChange={(e) =>
                set({ format: e.target.value as typeof s.format })
              }
            >
              <option value="gpl">GIMP / Aseprite .gpl</option>
              <option value="hex">Lospec .hex</option>
              <option value="css">CSS variables</option>
            </select>
          </Field>
          <ExportBar
            name={`hardware-palette.${s.format}`}
            content={output}
            disabled={!outputColors.length || !!error}
          />
        </section>
      </div>
      <section className="wb-panel">
        <h2>
          {t(
            "Sprite over tile · paint both layers",
            "精灵叠在地砖上，两层都能画",
          )}
        </h2>
        <div className="wb-toolbar">
          <Field label={t("Grid", "网格")}>
            <select
              value={s.size}
              onChange={(e) => set({ size: +e.target.value })}
            >
              <option value={8}>8 × 8</option>
              <option value={16}>16 × 16</option>
            </select>
          </Field>
          <Field label={t("Paint layer", "绘制图层")}>
            <select
              value={s.layer}
              onChange={(e) => set({ layer: e.target.value })}
            >
              <option value="sprite">{t("Sprite", "精灵")}</option>
              <option value="tile">{t("Tile", "地砖")}</option>
            </select>
          </Field>
          <button
            className="button"
            onClick={() => set({ sprite: Array(256).fill(-1) })}
          >
            {t("Clear sprite", "清空精灵")}
          </button>
          <button
            className="button"
            onClick={() =>
              set({ tile: Array(256).fill(s.brush < 0 ? 0 : s.brush) })
            }
          >
            {t("Fill tile with brush", "用当前颜色填满地砖")}
          </button>
        </div>
        <div className="wb-brushes">
          {p.colors.map((c, i) => (
            <button
              key={i}
              aria-label={t(`Paint register ${i}: ${c}`, `画笔颜色 ${i}：${c}`)}
              aria-pressed={s.brush === i}
              style={{
                background: c,
                color: contrast(c, "#ffffff") > 4.5 ? "#fff" : "#000",
              }}
              onClick={() => set({ brush: i })}
            >
              {i}
            </button>
          ))}
          <button
            className="button"
            onClick={() => set({ brush: -1 })}
            aria-pressed={s.brush === -1}
          >
            {t("Eraser", "橡皮")}
          </button>
        </div>
        <div
          className="wb-pixel-grid"
          style={{ gridTemplateColumns: `repeat(${s.size}, 1fr)` }}
          onPointerUp={() => setPainting(false)}
          onPointerLeave={() => setPainting(false)}
        >
          {Array.from({ length: s.size * s.size }, (_, n) => {
            const x = n % s.size,
              y = Math.floor(n / s.size),
              i = y * 16 + x,
              v = s.sprite[i] >= 0 ? s.sprite[i] : s.tile[i];
            return (
              <button
                key={n}
                aria-label={t(
                  `Pixel ${x + 1}, ${y + 1}`,
                  `像素 ${x + 1}，${y + 1}`,
                )}
                style={{
                  background: p.colors[Math.max(0, v) % p.colors.length],
                }}
                onPointerDown={(e) => {
                  e.preventDefault();
                  setPainting(true);
                  paint(i);
                }}
                onPointerEnter={() => {
                  if (painting) paint(i);
                }}
                onClick={(e) => {
                  if (e.detail === 0) paint(i);
                }}
              />
            );
          })}
        </div>
        <div className="wb-toolbar">
          <button className="button primary" onClick={png}>
            {t("Download sprite PNG", "下载精灵 PNG")}
          </button>
          <button
            className="button"
            onClick={() =>
              download(
                "sprite.json",
                JSON.stringify(
                  {
                    width: s.size,
                    height: s.size,
                    stride: 16,
                    palette: p.colors,
                    tile: s.tile,
                    sprite: s.sprite,
                  },
                  null,
                  2,
                ),
                "application/json",
              )
            }
          >
            {t("Download editable sprite JSON", "下载可编辑的精灵 JSON")}
          </button>
        </div>
      </section>
      <section className="wb-panel">
        <h2>
          {t(
            "Foreground / background contrast matrix",
            "前景与背景的对比度矩阵",
          )}
        </h2>
        <p>
          {t(
            "WCAG relative luminance: ≥4.5 AA text, ≥3 large text, ≥7 AAA text. Choose a cell to preview that foreground/background pair. These thresholds describe text, not a guarantee of sprite readability.",
            "按 WCAG 相对亮度计算：≥4.5 普通文字 AA，≥3 大字，≥7 普通文字 AAA。点击单元格预览这组前景与背景。这是文字标准，精灵还要结合形状判断。",
          )}
        </p>
        <div className="wb-table-scroll">
          <table className="wb-table contrast-matrix">
            <thead>
              <tr>
                <th>FG ↓ / BG →</th>
                {p.colors.map((c, i) => (
                  <th
                    key={i}
                    style={{
                      background: c,
                      color: contrast(c, "#fff") >= 4.5 ? "#fff" : "#000",
                    }}
                  >
                    {i}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {p.colors.map((fg, i) => (
                <tr key={i}>
                  <th
                    style={{
                      background: fg,
                      color: contrast(fg, "#fff") >= 4.5 ? "#fff" : "#000",
                    }}
                  >
                    {i}
                  </th>
                  {p.colors.map((bg, j) => {
                    const ratio = contrast(fg, bg);
                    return (
                      <td key={j}>
                        <button
                          title={`${fg} / ${bg} · ${ratio.toFixed(2)}:1`}
                          className={ratio >= 4.5 ? "contrast-pass" : ""}
                          onClick={() =>
                            set({ brush: i, bg: j, tile: Array(256).fill(j) })
                          }
                        >
                          {ratio.toFixed(1)}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="wb-panel">
        <details>
          <summary>
            {t("Restore an editable sprite JSON", "恢复精灵 JSON 文件")}
          </summary>
          <TextImport
            label={t("Sprite JSON", "精灵 JSON")}
            accept=".json"
            value={spriteImport}
            onChange={setSpriteImport}
          />
          <button
            className="button"
            onClick={() => {
              try {
                const data = JSON.parse(spriteImport);
                if (
                  ![8, 16].includes(data.width) ||
                  data.height !== data.width ||
                  data.stride !== 16 ||
                  !Array.isArray(data.palette)
                )
                  throw new Error("format");
                const key = (Object.keys(PALETTES) as PaletteKey[]).find(
                  (key) =>
                    PALETTES[key].colors.join(",") === data.palette.join(","),
                );
                if (!key) throw new Error("palette");
                for (const name of ["tile", "sprite"])
                  if (
                    !Array.isArray(data[name]) ||
                    data[name].length !== 256 ||
                    !data[name].every(
                      (n: unknown) =>
                        typeof n === "number" &&
                        Number.isInteger(n) &&
                        n >= (name === "sprite" ? -1 : 0) &&
                        n < data.palette.length,
                    )
                  )
                    throw new Error("pixel");
                set({
                  palette: key,
                  size: data.width,
                  tile: data.tile,
                  sprite: data.sprite,
                  brush: 1,
                });
                setSpriteImportError(false);
              } catch {
                setSpriteImportError(true);
              }
            }}
          >
            {t("Restore sprite", "恢复精灵")}
          </button>
          {spriteImportError && (
            <p className="wb-error" role="alert">
              {t(
                "Invalid sprite JSON. Use an exported sprite with its original hardware palette and 256-entry layers.",
                "精灵 JSON 无效。请使用本工具导出的文件，保留硬件色盘和每层的 256 个像素值。",
              )}
            </p>
          )}
        </details>
      </section>
      <LocalStatus stored={stored} />
    </ToolShell>
  );
}
