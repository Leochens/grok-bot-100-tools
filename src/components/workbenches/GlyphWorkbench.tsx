"use client";
import { useMemo, useRef, useState } from "react";
import { tools } from "@/data/tools";
import {
  normalizeGlyph,
  parseGlyphs,
  SVG_SAMPLE,
  type Glyph,
} from "@/lib/engines/svg";
import { zipFiles } from "@/lib/engines/zip";
import { ToolShell } from "../ToolShell";
import { useLanguage } from "../LanguageProvider";
import {
  download,
  ExportBar,
  Field,
  LocalStatus,
  NumberField,
  TextImport,
  useLocalDraft,
} from "./shared";
const initial = {
  raw: "",
  em: 1000,
  capHeight: 700,
  baseline: 850,
  padding: 60,
  overshoot: 12,
  optical: true,
  zoom: 1,
  kinds: {} as Record<string, "flat" | "round" | "pointed">,
};
export function GlyphWorkbench() {
  const { t } = useLanguage();
  const {
    state: s,
    set,
    reset,
    stored,
    ready,
  } = useLocalDraft("one-hundred:glyphs:v1", initial);
  const [fileError, setFileError] = useState(false);
  const importVersion = useRef(0);
  const parsed = useMemo(() => {
    try {
      return {
        glyphs: typeof DOMParser === "undefined" ? [] : parseGlyphs(s.raw),
        error: "",
      };
    } catch (e) {
      return { glyphs: [] as Glyph[], error: (e as Error).message };
    }
  }, [s.raw]);
  const result = useMemo(() => {
    try {
      return {
        glyphs: parsed.glyphs.map((g) =>
          normalizeGlyph(g, s, s.kinds[g.name] ?? "flat"),
        ),
        error: "",
      };
    } catch (e) {
      return { glyphs: [], error: (e as Error).message };
    }
  }, [parsed.glyphs, s]);
  const messages: Record<string, string> = {
    transform: t(
      "Invalid SVG transform or nonfinite transform values.",
      "SVG 变换有误，参数需为有限数字。",
    ),
    path: t(
      "Invalid SVG path data. Check commands and coordinates.",
      "SVG 路径有误，请检查命令和坐标。",
    ),
    xml: t(
      "SVG XML is malformed. Paste complete SVG files or shape fragments.",
      "SVG XML 格式有误，请粘贴完整 SVG 或形状片段。",
    ),
    unsupported: t(
      "Use filled path, rect, circle, ellipse or polygon geometry. Outline text/strokes and flatten CSS, masks, clips and use references in your vector editor first. Scripts and external content are rejected.",
      "请用填充的 path、rect、circle、ellipse 或 polygon。文字与描边先转轮廓，CSS、蒙版、裁剪和引用先在设计软件里展开。脚本和外部内容不会导入。",
    ),
    stroke: t(
      "Stroked geometry must be outlined before importing for accurate optical measurements.",
      "描边图形请先转成填充轮廓，再测量视觉边界。",
    ),
    units: t(
      "Shape coordinates must be numeric SVG user units, without px or percentages.",
      "形状坐标请使用纯数字 SVG 单位，不带 px 或百分号。",
    ),
    shape: t(
      "Invalid shape dimensions or polygon points.",
      "形状尺寸或多边形顶点有误。",
    ),
    empty: t(
      "A glyph has no visible filled area.",
      "有个字形没有可见的填充区域。",
    ),
    mixed: t(
      "Use separate complete <svg> elements, or one set of shape fragments.",
      "请使用多个完整 <svg>，或一组形状片段，不要混在一起。",
    ),
    settings: t(
      "Check em size, baseline, cap height and padding. Baseline must accommodate the cap height, and padding must leave visible width.",
      "请检查字框、基线、大写高度和边距。基线以上要放得下大写高度，左右边距不能占满字框。",
    ),
    overshoot: t(
      "Overshoot would leave the em square. Increase top/bottom space or reduce overshoot.",
      "光学校正会超出字框，请增加上下空间或减小超出量。",
    ),
  };
  const error = parsed.error || result.error;
  const dictionary = JSON.stringify(
    {
      em: s.em,
      baseline: s.baseline,
      capHeight: s.capHeight,
      centroidMethod: "512px alpha-weighted raster estimate",
      glyphs: Object.fromEntries(
        result.glyphs.map((g) => [
          g.name,
          {
            paths: g.paths,
            bounds: g.normalizedBounds,
            sourceBounds: g.bounds,
            sourceCentroid: g.centroid,
            kind: g.kind,
            scale: g.scale,
          },
        ]),
      ),
    },
    null,
    2,
  );
  return (
    <ToolShell
      tool={tools.find((x) => x.day === 4)!}
      onSample={() => {
        importVersion.current++;
        set({ ...initial, raw: SVG_SAMPLE });
        setFileError(false);
      }}
      onReset={() => {
        importVersion.current++;
        reset();
        setFileError(false);
      }}
    >
      <div className="wb-layout">
        <section className="wb-panel">
          <h2>{t("Import glyph outlines", "导入字形轮廓")}</h2>
          <Field label={t("Open multiple SVG files", "打开多个 SVG 文件")}>
            <input
              type="file"
              accept=".svg,image/svg+xml"
              multiple
              disabled={!ready}
              onChange={async (e) => {
                const files = [...(e.target.files ?? [])];
                const id = ++importVersion.current;
                try {
                  if (
                    files.reduce((n, f) => n + f.size, 0) > 10 * 1024 * 1024 ||
                    files.length > 100
                  )
                    throw new Error("size");
                  const texts = await Promise.all(
                    files.map(async (f) => {
                      const text = await f.text();
                      const xml = new DOMParser().parseFromString(
                        text,
                        "image/svg+xml",
                      );
                      if (
                        xml.querySelector("parsererror") ||
                        xml.documentElement.localName !== "svg"
                      )
                        throw new Error("xml");
                      xml.documentElement.setAttribute(
                        "data-name",
                        f.name.replace(/\.svg$/i, ""),
                      );
                      return new XMLSerializer().serializeToString(
                        xml.documentElement,
                      );
                    }),
                  );
                  if (id === importVersion.current) {
                    set({ raw: texts.join("\n") });
                    setFileError(false);
                  }
                } catch {
                  setFileError(true);
                }
                e.target.value = "";
              }}
            />
          </Field>
          <TextImport
            label={t(
              "SVGs or shape fragments (use SVG id as glyph name)",
              "SVG 或形状片段（用 SVG 的 id 命名字形）",
            )}
            value={s.raw}
            onChange={(raw) => {
              importVersion.current++;
              set({ raw });
            }}
            accept=".svg,.txt"
            disabled={!ready}
          />
          {fileError && (
            <p className="wb-error" role="alert">
              {t(
                "Cannot read these SVG files. Limit: 100 files, 10 MB total.",
                "无法读取这组 SVG。最多 100 个文件、总计 10 MB。",
              )}
            </p>
          )}
          {error && (
            <p className="wb-error" role="alert">
              {messages[error] ||
                t("Cannot measure this SVG.", "这个 SVG 暂时无法测量。")}
            </p>
          )}
          <p className="muted">
            {t(
              "Geometric bounds solve line, quadratic, cubic and elliptical-arc extrema. Optical centroid estimates filled-area mass on a 512×512 alpha raster, including holes. Exports flatten transforms into monochrome filled path coordinates.",
              "几何边界按直线、二次/三次贝塞尔和椭圆弧的极值计算。视觉重心按 512×512 透明度采样估算，包含镂空影响。导出时把变换写入单色填充的路径坐标。",
            )}
          </p>
        </section>
        <section className="wb-panel">
          <h2>{t("One consistent em square", "统一字框")}</h2>
          <Field label={t("Target grid preset", "目标网格")}>
            <select
              value={s.em === 24 ? "icon" : s.em === 1000 ? "font" : "custom"}
              onChange={(e) => {
                if (e.target.value === "icon")
                  set({
                    em: 24,
                    capHeight: 18,
                    baseline: 21,
                    padding: 2,
                    overshoot: 0.3,
                  });
                else if (e.target.value === "font")
                  set({
                    em: 1000,
                    capHeight: 700,
                    baseline: 850,
                    padding: 60,
                    overshoot: 12,
                  });
              }}
            >
              <option value="font">1000 × 1000</option>
              <option value="icon">24 × 24</option>
              <option value="custom">{t("Custom", "自定义")}</option>
            </select>
          </Field>
          <div className="wb-fields">
            {(
              ["em", "capHeight", "baseline", "padding", "overshoot"] as const
            ).map((key, i) => (
              <NumberField
                key={key}
                label={
                  [
                    t("Em square", "字框边长"),
                    t("Cap height", "大写高度"),
                    t("Baseline from top", "基线位置（从顶部算）"),
                    t("Minimum side bearing", "最小左右边距"),
                    t("Round overshoot", "圆形光学超出量"),
                  ][i]
                }
                value={s[key]}
                min={0}
                onChange={(n) => set({ [key]: n })}
              />
            ))}
          </div>
          <label className="wb-check">
            <input
              type="checkbox"
              checked={s.optical}
              onChange={(e) => set({ optical: e.target.checked })}
            />
            {t(
              "Center using optical mass (clamped to side bearings)",
              "按视觉重心居中（保留最小边距）",
            )}
          </label>
          <p className="muted">
            {t(
              "Each glyph uses uniform scaling. Wide glyphs may be width-limited before reaching cap height. Round overshoot extends both cap and baseline; pointed overshoot is 1.5×.",
              "每个字形等比缩放。过宽的字形可能先碰到左右边距，无法顶满大写高度。圆形会在顶部和基线各超出设定值，尖形按 1.5 倍处理。",
            )}
          </p>
          <Field label={t("Preview zoom", "预览缩放")}>
            <input
              type="range"
              min="0.6"
              max="2"
              step="0.1"
              value={s.zoom}
              onChange={(e) => set({ zoom: +e.target.value })}
            />
          </Field>
        </section>
      </div>
      <section className="wb-panel">
        <h2>
          {t(
            "Baseline grid & per-glyph optical correction",
            "基线网格和逐字光学校正",
          )}
        </h2>
        <div
          className="wb-glyph-grid"
          style={{
            gridTemplateColumns: `repeat(auto-fit,minmax(min(100%,${Math.round(210 * s.zoom)}px),1fr))`,
          }}
        >
          {result.glyphs.map((g) => (
            <article key={g.name} className="wb-glyph">
              <h3>{g.name}</h3>
              <svg
                viewBox={`0 0 ${s.em} ${s.em}`}
                aria-label={t(
                  `${g.name} normalized glyph`,
                  `${g.name} 归一化字形`,
                )}
              >
                <defs>
                  <pattern
                    id={`grid-${g.name}`}
                    width={s.em / 10}
                    height={s.em / 10}
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d={`M${s.em / 10} 0H0V${s.em / 10}`}
                      fill="none"
                      stroke="#ddd"
                      strokeWidth={s.em / 1000}
                    />
                  </pattern>
                </defs>
                <rect
                  width={s.em}
                  height={s.em}
                  fill={`url(#grid-${g.name})`}
                />
                {g.paths.map((p, i) => (
                  <path
                    key={i}
                    d={p.d}
                    fill="currentColor"
                    fillRule={p.fillRule}
                  />
                ))}
                <path
                  d={`M0 ${s.baseline}H${s.em}M0 ${s.baseline - s.capHeight}H${s.em}`}
                  stroke="#b83548"
                  strokeWidth={s.em / 250}
                  fill="none"
                />
                <path
                  d={`M${s.padding} 0V${s.em}M${s.em - s.padding} 0V${s.em}`}
                  stroke="#399177"
                  strokeDasharray={`${s.em / 50}`}
                  strokeWidth={s.em / 500}
                />
              </svg>
              <Field label={t("Outline shape", "轮廓类型")}>
                <select
                  value={s.kinds[g.name] ?? "flat"}
                  onChange={(e) =>
                    set({
                      kinds: {
                        ...s.kinds,
                        [g.name]: e.target.value as
                          "flat" | "round" | "pointed",
                      },
                    })
                  }
                >
                  <option value="flat">{t("Flat", "平顶平底")}</option>
                  <option value="round">{t("Round", "圆形")}</option>
                  <option value="pointed">{t("Pointed", "尖形")}</option>
                </select>
              </Field>
              <small>
                {t("Source bounds", "原始边界")}: [
                {[g.bounds.minX, g.bounds.minY, g.bounds.maxX, g.bounds.maxY]
                  .map((n) => n.toFixed(3))
                  .join(", ")}
                ]<br />
                {t("Optical centroid (estimate)", "视觉重心（估算）")}:{" "}
                {g.centroid.x.toFixed(3)}, {g.centroid.y.toFixed(3)}
              </small>
              <button
                className="button"
                onClick={() =>
                  download(`${g.name}.svg`, g.svg, "image/svg+xml")
                }
              >
                {t("Download SVG", "下载 SVG")}
              </button>
            </article>
          ))}
        </div>
      </section>
      <section className="wb-panel">
        <h2>{t("Export normalized glyphs", "导出统一后的字形")}</h2>
        <button
          className="button primary"
          disabled={!result.glyphs.length || !!error}
          onClick={() =>
            download(
              "normalized-glyphs.zip",
              zipFiles(
                result.glyphs.map((g) => ({
                  name: g.name + ".svg",
                  content: g.svg,
                })),
              ),
              "application/zip",
            )
          }
        >
          {t("Download all SVGs as ZIP", "打包下载全部 SVG")}
        </button>
        <ExportBar
          name="glyph-paths.json"
          content={dictionary}
          disabled={!result.glyphs.length || !!error}
          mime="application/json"
        />
      </section>
      <LocalStatus stored={stored} />
    </ToolShell>
  );
}
