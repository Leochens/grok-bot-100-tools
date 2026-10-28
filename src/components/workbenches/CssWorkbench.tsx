"use client";
import { useMemo } from "react";
import { tools } from "@/data/tools";
import { analyzeCss, cleanCss, CSS_SAMPLE, diffLines } from "@/lib/engines/css";
import { offlinePreview } from "@/lib/engines/css-preview";
import { ToolShell } from "../ToolShell";
import { useLanguage } from "../LanguageProvider";
import {
  ExportBar,
  Field,
  LocalStatus,
  TextImport,
  useLocalDraft,
} from "./shared";
const initial = {
  raw: "",
  selected: [] as string[],
  selector: "all",
  merge: true,
  html: '<article class="card"><h2>A card worth keeping</h2><p>Check spacing, type and borders in your own stylesheet.</p><button class="button">Continue</button></article>',
};
export function CssWorkbench() {
  const { t } = useLanguage();
  const {
    state: s,
    set,
    reset,
    ready,
    stored,
  } = useLocalDraft("one-hundred:css:v1", initial);
  const result = useMemo(() => {
    try {
      return { analysis: analyzeCss(s.raw), error: "" };
    } catch (e) {
      const err = e as { reason?: string; line?: number; column?: number };
      return {
        analysis: null,
        error: `${err.line ?? 1}:${err.column ?? 1} · ${err.reason ?? "CSS"}`,
      };
    }
  }, [s.raw]);
  const analysis = result.analysis;
  const output = useMemo(() => {
    if (!analysis) return "";
    return cleanCss(s.raw, s.selected, s.merge);
  }, [analysis, s.raw, s.selected, s.merge]);
  const candidates = analysis?.candidates ?? [],
    selectors = [...new Set(analysis?.rules.map((r) => r.selector) ?? [])],
    shown = candidates.filter(
      (c) => s.selector === "all" || c.selector === s.selector,
    );
  const beforeBytes = new TextEncoder().encode(s.raw).length,
    afterBytes = new TextEncoder().encode(output).length,
    savings = beforeBytes - afterBytes;
  const selected = new Set(s.selected);
  const safe = candidates.filter((c) => c.safe);
  return (
    <ToolShell
      tool={tools.find((x) => x.day === 7)!}
      onSample={() => set({ ...initial, raw: CSS_SAMPLE })}
      onReset={reset}
    >
      <div className="wb-layout">
        <section className="wb-panel">
          <h2>{t("Analyze your actual stylesheet", "分析真实样式表")}</h2>
          <TextImport
            value={s.raw}
            onChange={(raw) => set({ raw, selected: [], selector: "all" })}
            label={t("CSS source", "CSS 源码")}
            accept=".css,.txt"
            disabled={!ready}
          />
          {result.error && (
            <p className="wb-error" role="alert">
              {t("CSS parse error at", "CSS 解析失败，位置")} {result.error}
            </p>
          )}
          <p className="muted">
            {t(
              "PostCSS parses comments, strings, functions, rules and @media scopes. Same-selector declarations are compared only within matching conditional/layer scopes. Exact duplicate declarations can be removed for any property. Distinct fallback values, native nesting and unexpanded shorthand effects stay protected.",
              "使用 PostCSS 解析注释、字符串、函数、规则及 @media。只在相同的条件或命名图层作用域里比较相同选择器；任何属性的完全重复声明都能检查；不同的兼容性回退值、原生嵌套和无法展开的简写影响会保留。",
            )}
          </p>
        </section>
        <section className="wb-panel">
          <h2>{t("Cascade report", "层叠分析报告")}</h2>
          <div className="wb-stats">
            <div>
              <strong>{analysis?.rules.length ?? 0}</strong>
              {t("selector blocks", "选择器块")}
            </div>
            <div>
              <strong>{analysis?.repeated ?? 0}</strong>
              {t("repeated selector groups", "重复选择器组")}
            </div>
            <div>
              <strong>{safe.length}</strong>
              {t("equal-value duplicates", "同值重复声明")}
            </div>
            <div>
              <strong>{candidates.length - safe.length}</strong>
              {t("overrides to review", "待确认的覆盖")}
            </div>
          </div>
          <p>
            {t("Protected declarations", "保留待检查的声明")}:{" "}
            {analysis?.protectedCount ?? 0}
          </p>
          <p className="wb-big-number">
            {savings.toLocaleString()}
            <small> bytes</small>
          </p>
          <p>
            {beforeBytes.toLocaleString()} → {afterBytes.toLocaleString()} bytes
            (
            {beforeBytes > 0 ? ((100 * savings) / beforeBytes).toFixed(1) : "0"}
            %)
          </p>
          <div className="wb-toolbar">
            <button
              className="button primary"
              disabled={!safe.length}
              onClick={() => set({ selected: safe.map((c) => c.id) })}
            >
              {t("Select equal-value duplicates", "勾选同值重复项")}
            </button>
            <button className="button" onClick={() => set({ selected: [] })}>
              {t("Keep all declarations", "保留全部声明")}
            </button>
          </div>
          <label className="wb-check">
            <input
              type="checkbox"
              checked={s.merge}
              onChange={(e) => set({ merge: e.target.checked })}
            />
            {t(
              "Merge adjacent identical selectors only",
              "合并相邻的相同选择器",
            )}
          </label>
          <p className="muted">
            {t(
              "Different values may be browser fallbacks. Review them individually before pruning. Distant blocks stay in place so overlapping selectors keep their cascade order.",
              "不同值可能是浏览器兼容性回退，请逐条确认再删除。相隔较远的块会保留原位，避免影响其他选择器的层叠顺序。",
            )}
          </p>
        </section>
      </div>
      <section className="wb-panel">
        <h2>
          {t("Selector-by-selector prune workbench", "逐个选择器检查和精简")}
        </h2>
        <Field label={t("Inspect selector", "检查选择器")}>
          <select
            value={s.selector}
            onChange={(e) => set({ selector: e.target.value })}
          >
            <option value="all">{t("All selectors", "全部选择器")}</option>
            {selectors.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <div className="wb-table-scroll">
          <table className="wb-table">
            <thead>
              <tr>
                <th>{t("Prune", "删除")}</th>
                <th>{t("Selector / scope", "选择器 / 作用域")}</th>
                <th>{t("Declaration", "声明")}</th>
                <th>{t("Winning line(s)", "生效声明行号")}</th>
                <th>{t("Assessment", "判断")}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.id}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={t(
                        `Prune line ${c.line} ${c.property}`,
                        `删除第 ${c.line} 行 ${c.property}`,
                      )}
                      checked={selected.has(c.id)}
                      onChange={(e) =>
                        set({
                          selected: e.target.checked
                            ? [...s.selected, c.id]
                            : s.selected.filter((id) => id !== c.id),
                        })
                      }
                    />
                  </td>
                  <td>
                    <code>{c.selector}</code>
                    <small>{c.scope}</small>
                  </td>
                  <td>
                    <code>
                      {c.property}: {c.value}
                      {c.important ? " !important" : ""}
                    </code>
                    <small>
                      {t("line", "行")} {c.line}
                    </small>
                  </td>
                  <td>{c.winnerLines.join(", ")}</td>
                  <td>
                    {c.safe
                      ? t("Same computed components", "各组成值相同")
                      : t(
                          "Different values: review fallback support",
                          "值不同，请检查兼容性回退",
                        )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!shown.length && (
          <p>
            {t(
              "No removable declarations found for this selector.",
              "这个选择器里没有找到可删除的声明。",
            )}
          </p>
        )}
      </section>
      <section className="wb-panel">
        <h2>{t("Shorthand / longhand cascade map", "简写与分项的层叠关系")}</h2>
        <p>
          {t(
            "An earlier shorthand stays when any component is still active. Review each expanded component and its winning line before editing the source.",
            "简写里只要有一项仍在生效，就会保留。修改源码前，可以先核对每个分项和最终生效的行号。",
          )}
        </p>
        {analysis?.effects
          .filter(
            (e) =>
              e.components.length > 1 &&
              (s.selector === "all" || e.selector === s.selector),
          )
          .map((effect, i) => (
            <details key={i} className="wb-cascade-map">
              <summary>
                <code>
                  {effect.selector} · {effect.property}: {effect.value}
                </code>{" "}
                · {t("line", "行")} {effect.line} · {effect.scope}
              </summary>
              <ul>
                {effect.components.map((c) => (
                  <li key={c.property}>
                    <code>
                      {c.property}: {c.value}
                    </code>{" "}
                    → {t("winning line", "生效行")} {c.winnerLine} ·{" "}
                    {c.active
                      ? t("retained / protected", "保留 / 待检查")
                      : t("overridden", "已覆盖")}
                  </li>
                ))}
              </ul>
            </details>
          ))}
      </section>
      <section className="wb-panel">
        <h2>{t("Specificity audit", "选择器优先级检查")}</h2>
        <p>
          {t(
            "Scores are (IDs, classes/attributes/pseudo-classes, types/pseudo-elements). :where() is zero; :is(), :not() and :has() use their highest-specificity argument. @layer and conditional scopes remain separate.",
            "分数依次是（ID、类/属性/伪类、元素/伪元素）。:where() 为零，:is()、:not() 和 :has() 按参数中的最高分计算。@layer 和条件作用域不会混在一起。",
          )}
        </p>
        <div className="wb-table-scroll">
          <table className="wb-table">
            <thead>
              <tr>
                <th>{t("Line", "行号")}</th>
                <th>{t("Selector", "选择器")}</th>
                <th>{t("Scope", "作用域")}</th>
                <th>{t("Specificity", "优先级")}</th>
              </tr>
            </thead>
            <tbody>
              {analysis?.rules
                .filter(
                  (r) => s.selector === "all" || r.selector === s.selector,
                )
                .map((r, i) => (
                  <tr key={i}>
                    <td>{r.line}</td>
                    <td>
                      <code>{r.selector}</code>
                    </td>
                    <td>{r.scope}</td>
                    <td>
                      {r.specificity.map((v) => v.join(",")).join(" / ") ||
                        t("Review nesting", "请检查嵌套")}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="wb-panel">
        <h2>{t("Live before / after preview", "修改前后实时对照")}</h2>
        <p className="muted">
          {t(
            "Remote images, fonts, imports and active HTML are disabled in previews. Exported CSS remains unchanged except for the declarations you choose to prune.",
            "预览不会加载远程图片、字体和导入文件，也不执行 HTML 中的脚本。导出只按你勾选的声明精简，其他内容保留。",
          )}
        </p>
        <Field
          label={t(
            "HTML fixture (preview stays isolated and offline)",
            "预览用 HTML（隔离运行，不联网）",
          )}
        >
          <textarea
            value={s.html}
            onChange={(e) => set({ html: e.target.value })}
            spellCheck={false}
          />
        </Field>
        <div className="wb-layout">
          <div>
            <h3>{t("Before", "修改前")}</h3>
            <iframe
              title={t("Before CSS preview", "原始 CSS 预览")}
              sandbox=""
              srcDoc={ready ? offlinePreview(s.raw, s.html) : ""}
            />
          </div>
          <div>
            <h3>{t("After", "修改后")}</h3>
            <iframe
              title={t("After CSS preview", "精简 CSS 预览")}
              sandbox=""
              srcDoc={ready ? offlinePreview(output, s.html) : ""}
            />
          </div>
        </div>
      </section>
      <section className="wb-panel">
        <h2>{t("Line diff & clean CSS", "逐行差异和 CSS 导出")}</h2>
        <div
          className="wb-diff"
          role="region"
          aria-label={t("CSS diff", "CSS 差异")}
        >
          {diffLines(s.raw, output).map((line, i) => (
            <div key={i} className={`diff-${line.kind}`}>
              <span>
                {line.kind === "add" ? "+" : line.kind === "remove" ? "−" : " "}
              </span>
              <code>{line.text || " "}</code>
            </div>
          ))}
        </div>
        <ExportBar
          name="deduplicated.css"
          content={output}
          disabled={!s.raw.trim() || !!result.error}
          mime="text/css;charset=utf-8"
        />
      </section>
      <LocalStatus stored={stored} />
    </ToolShell>
  );
}
