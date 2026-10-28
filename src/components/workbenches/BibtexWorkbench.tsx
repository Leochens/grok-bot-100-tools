"use client";
import { useMemo, useRef, useState } from "react";
import { tools } from "@/data/tools";
import { ToolShell } from "../ToolShell";
import { useLanguage } from "../LanguageProvider";
import {
  ExportBar,
  Field,
  LocalStatus,
  NumberField,
  TextImport,
  useLocalDraft,
} from "./shared";
import {
  auditBibtex,
  BIBTEX_DEFAULT,
  BIBTEX_SAMPLE,
  remapCsv,
} from "@/lib/engines/bibtex";

export function BibtexWorkbench() {
  const { t } = useLanguage();
  const {
    state: s,
    set,
    reset,
    ready,
    stored,
  } = useLocalDraft("one-hundred:bibtex-merge:v1", BIBTEX_DEFAULT, {
    selections: { cluster: "", primary: 0 },
  });
  const report = useMemo(() => auditBibtex(s.raw, s), [s]);
  const [dropError, setDropError] = useState(false);
  const version = useRef(0);
  const clean = ready && report.canExport;
  const limit = Math.max(1, Math.min(500, Math.floor(s.previewRows) || 100));
  function replaceRaw(raw: string) {
    version.current++;
    set({ raw, selections: [] });
    setDropError(false);
  }
  async function dropFiles(files: File[]) {
    const id = ++version.current;
    try {
      if (
        files.reduce((sum, f) => sum + f.size, 0) +
          new TextEncoder().encode(s.raw).length >
        2 * 1024 * 1024
      )
        throw new Error("size");
      const texts = await Promise.all(files.map((f) => f.text()));
      if (id === version.current)
        replaceRaw([s.raw, ...texts].filter(Boolean).join("\n\n"));
    } catch {
      if (id === version.current) setDropError(true);
    }
  }
  const reasonLabel = (reason: string) =>
    ({
      key: t("Exact citation key", "引用键完全相同"),
      doi: t("Same DOI", "DOI 相同"),
      "title+year": t("Same title + year", "标题和年份相同"),
    })[reason];
  return (
    <ToolShell
      tool={tools.find((tool) => tool.day === 22)!}
      onSample={() => {
        version.current++;
        set({ ...BIBTEX_DEFAULT, raw: BIBTEX_SAMPLE });
        setDropError(false);
      }}
      onReset={() => {
        version.current++;
        reset();
        setDropError(false);
      }}
    >
      <div className="wb-layout">
        <section className="wb-panel">
          <h2>{t("1. Import shared bibliographies", "1. 导入合著文献库")}</h2>
          <p>
            {t(
              "Paste combined .bib text, open a file, or drop multiple .bib files below to append them. Up to 2 MB / 10,000 entries; everything stays in this browser.",
              "粘贴合并后的 .bib 文本、打开文件，或把多个 .bib 文件拖到下方追加。最多 2 MB / 10,000 条，全程只在浏览器处理。",
            )}
          </p>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const files = Array.from(e.dataTransfer.files);
              if (files.length) void dropFiles(files);
            }}
          >
            <TextImport
              value={s.raw}
              onChange={replaceRaw}
              accept=".bib,.txt"
              maxBytes={2 * 1024 * 1024}
              label={t(
                "BibTeX input / file drop area",
                "BibTeX 原文 / 文件拖放区",
              )}
            />
          </div>
          {dropError && (
            <p className="wb-error" role="alert">
              {t(
                "Cannot append files (combined limit 2 MB). Previous input is retained.",
                "无法追加文件（合计最大 2 MB），原有内容已保留。",
              )}
            </p>
          )}
          <h2>{t("2. Review & resolve", "2. 检查并选择保留项")}</h2>
          <Field
            label={t("Wrap title acronyms in {...}", "给标题缩写加上 {...}")}
          >
            <input
              type="checkbox"
              checked={s.wrapAcronyms}
              onChange={(e) => set({ wrapAcronyms: e.target.checked })}
            />
          </Field>
          <p>
            {t(
              "Also fixes booktitle. Existing {LSTM} stays unchanged. Review each cluster: only the selected record is kept; fields from discarded records are not combined. Title + year matches are candidates, so check the original input before exporting.",
              "也会处理 booktitle，已有的 {LSTM} 不会重复加括号。每组只保留选中的整条记录，舍弃项的字段不会自动补入。标题和年份相同只是疑似重复，导出前请对照原文确认。",
            )}
          </p>
          <p>
            {t(
              "Case-only key differences stay separate unless DOI or title + year also matches. Bare string macros are preserved but are not expanded for matching or acronym fixes. Exact duplicate keys cannot distinguish existing citations; check their intended paper before dropping a record.",
              "仅大小写不同的引用键会分别保留，除非 DOI 或标题和年份也相同。字符串宏会原样保留，但不展开参与匹配或缩写修复。同名引用键无法区分已有引用，删除前请确认它们原本指向哪篇论文。",
            )}
          </p>
          <div aria-label={t("Duplicate clusters", "重复条目组")}>
            {report.clusters.length === 0 && (
              <p>{t("No duplicate clusters found.", "暂未发现重复条目组。")}</p>
            )}
            {report.clusters.map((cluster, i) => (
              <div key={cluster.id} className="wb-field">
                <Field
                  label={`${t("Cluster", "重复组")} ${i + 1}: ${t("keep primary record", "选择保留条目")}`}
                >
                  <select
                    value={cluster.primary}
                    onChange={(e) =>
                      set({
                        selections: [
                          ...s.selections.filter(
                            (item) => item.cluster !== cluster.id,
                          ),
                          {
                            cluster: cluster.id,
                            primary: Number(e.target.value),
                          },
                        ],
                      })
                    }
                  >
                    {cluster.entries.map((index) => (
                      <option key={index} value={index}>
                        #{index + 1} · {report.entries[index].key} ·{" "}
                        {report.entries[index].fields.length}{" "}
                        {t("fields", "个字段")}
                      </option>
                    ))}
                  </select>
                </Field>
                <p>{cluster.reasons.map(reasonLabel).join(" · ")}</p>
                <ul>
                  {cluster.entries.map((index) => (
                    <li key={index}>
                      #{index + 1} · <code>{report.entries[index].key}</code> —{" "}
                      {report.entries[index].fields.find(
                        (f) => f.name === "title",
                      )?.value ?? t("No title", "无标题")}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <LocalStatus stored={stored} />
        </section>
        <section className="wb-panel">
          <h2>{t("3. Audit & export", "3. 查看检查结果并导出")}</h2>
          <div className="wb-stats">
            <span>
              {t("Entries", "条目")}: {report.entries.length}
            </span>
            <span>
              {t("Duplicate clusters", "重复组")}: {report.clusters.length}
            </span>
            <span>
              {t("Kept", "保留")}: {report.keptCount}
            </span>
            <span>
              {t("Acronym warnings", "缩写提醒")}: {report.acronyms.length}
            </span>
          </div>
          {report.hasErrors && (
            <p role="alert" className="wb-error">
              {t(
                "Merged .bib export blocked. Fix syntax in the original input; the audit JSON retains all source text.",
                "合并 .bib 导出已暂停。请修正原文语法，检查 JSON 会保留全部原文。",
              )}
            </p>
          )}
          {s.wrapAcronyms && (
            <p role="status">
              {t(
                "Acronym fixes applied to the merged output; warnings describe the original input.",
                "缩写修复已应用到合并结果；下方提醒仍对应原始输入。",
              )}
            </p>
          )}
          {report.issues.length > 0 && (
            <ul className="wb-issues">
              {report.issues.map((issue, i) => (
                <li key={i}>
                  <span className="badge">
                    {issue.error
                      ? t("Fix required", "需要修正")
                      : t("Warning", "注意")}
                  </span>{" "}
                  {t(issue.en, issue.zh)}
                </li>
              ))}
            </ul>
          )}
          <NumberField
            label={t("Entry preview limit", "条目预览上限")}
            value={s.previewRows}
            min={1}
            max={500}
            step={1}
            onChange={(previewRows) =>
              set({
                previewRows: Number.isFinite(previewRows)
                  ? Math.max(1, Math.min(500, Math.floor(previewRows)))
                  : 100,
              })
            }
          />
          <div className="wb-table-scroll">
            <table
              className="wb-table"
              aria-label={t("Bibliography entries", "文献条目")}
            >
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t("Citation key", "引用键")}</th>
                  <th>{t("Type", "类型")}</th>
                  <th>{t("Title", "标题")}</th>
                </tr>
              </thead>
              <tbody>
                {report.entries.slice(0, limit).map((entry) => (
                  <tr key={entry.index}>
                    <td>{entry.index + 1}</td>
                    <td>{entry.key}</td>
                    <td>{entry.type}</td>
                    <td style={{ overflowWrap: "anywhere" }}>
                      {entry.fields.find((f) => f.name === "title")?.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3>{t("Citation key remap", "引用键替换表")}</h3>
          <p>
            {t(
              "Replace dropped keys inside your .tex citations with the kept key. Identical keys map to themselves; no .tex files are edited. Exports include all entries, regardless of preview limit.",
              "请在 .tex 引用中把舍弃键换成保留键。同名键会映射到自身；本工具不会修改 .tex 文件。预览上限不影响导出。",
            )}
          </p>
          <div className="wb-table-scroll">
            <table
              className="wb-table"
              aria-label={t("Citation key remap table", "引用键替换明细")}
            >
              <thead>
                <tr>
                  <th>{t("Dropped key", "舍弃键")}</th>
                  <th>{t("Kept key", "保留键")}</th>
                  <th>{t("Reason", "原因")}</th>
                </tr>
              </thead>
              <tbody>
                {report.remap.map((row, i) => (
                  <tr key={i}>
                    <td>{row.dropped_key}</td>
                    <td>{row.kept_key}</td>
                    <td>
                      {row.reason.split(" + ").map(reasonLabel).join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Field label={t("Merged BibTeX output", "合并后的 BibTeX")}>
            <textarea readOnly value={report.merged} spellCheck={false} />
          </Field>
          <ExportBar
            name="merged.bib"
            content={report.merged}
            disabled={!clean}
            mime="application/x-bibtex;charset=utf-8"
          />
          <ExportBar
            name="citekey-remap.csv"
            content={remapCsv(report.remap)}
            disabled={!clean}
            mime="text/csv;charset=utf-8"
          />
          <ExportBar
            name="citekey-remap.json"
            content={JSON.stringify(report.remap, null, 2)}
            disabled={!clean}
            mime="application/json"
          />
          <ExportBar
            name="bibtex-audit.json"
            content={JSON.stringify(
              { ...report, selections: s.selections },
              null,
              2,
            )}
            disabled={!ready || !s.raw}
            mime="application/json"
          />
        </section>
      </div>
    </ToolShell>
  );
}
