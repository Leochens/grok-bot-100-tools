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
  MD_TABLE_DEFAULT,
  MD_TABLE_SAMPLE,
  MD_TABLE_SAMPLE_ALIGNMENTS,
  exportTable,
  parseTable,
  tableHeaders,
  type Alignment,
  type TableMode,
} from "@/lib/engines/md-table";

export function MdTableWorkbench() {
  const { t } = useLanguage();
  const {
    state: s,
    set,
    reset,
    ready,
    stored,
  } = useLocalDraft("one-hundred:md-table:v1", MD_TABLE_DEFAULT);
  const report = useMemo(() => parseTable(s), [s]);
  const markdown = useMemo(() => exportTable(report, "md"), [report]);
  const csv = useMemo(() => exportTable(report, "csv"), [report]);
  const tsv = useMemo(() => exportTable(report, "tsv"), [report]);
  const audit = useMemo(() => JSON.stringify(report, null, 2), [report]);
  const [dropError, setDropError] = useState(false);
  const importVersion = useRef(0);
  const clean = ready && !report.hasErrors;
  const previewRows = Number.isFinite(s.previewRows)
    ? Math.max(1, Math.min(500, Math.floor(s.previewRows)))
    : 100;
  const alignmentLabel = (a: Alignment) =>
    ({
      none: t("None", "不指定"),
      left: t("Left", "左对齐"),
      center: t("Center", "居中"),
      right: t("Right", "右对齐"),
    })[a];
  function replaceRaw(raw: string) {
    importVersion.current++;
    set({ raw, alignments: [] });
    setDropError(false);
  }
  async function dropFile(file: File) {
    const version = ++importVersion.current;
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error("size");
      const raw = await file.text();
      if (version === importVersion.current) replaceRaw(raw);
    } catch {
      if (version === importVersion.current) setDropError(true);
    }
  }
  return (
    <ToolShell
      tool={tools.find((tool) => tool.day === 20)!}
      onSample={() => {
        importVersion.current++;
        set({
          ...MD_TABLE_DEFAULT,
          raw: MD_TABLE_SAMPLE,
          alignments: MD_TABLE_SAMPLE_ALIGNMENTS,
        });
        setDropError(false);
      }}
      onReset={() => {
        importVersion.current++;
        reset();
        setDropError(false);
      }}
    >
      <div className="wb-layout">
        <section className="wb-panel">
          <h2>{t("1. Paste or import a table", "1. 粘贴或导入表格")}</h2>
          <p>
            {t(
              "Paste Excel / Sheets cells, CSV, or a GFM Markdown table. Drop an .md, .tsv, .csv or .txt file below (up to 2 MB, 10,000 rows, 200 columns). Everything stays in this browser.",
              "粘贴 Excel / Sheets 单元格、CSV 或 GFM Markdown 表格，也可把 .md、.tsv、.csv、.txt 文件拖到下方（最多 2 MB、10,000 行、200 列）。内容只在浏览器内处理。",
            )}
          </p>
          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const file = event.dataTransfer.files[0];
              if (file) void dropFile(file);
            }}
          >
            <TextImport
              value={s.raw}
              onChange={replaceRaw}
              label={t(
                "Raw table text / file drop area",
                "原始表格文本 / 文件拖放区",
              )}
              accept=".md,.tsv,.csv,.txt"
              maxBytes={2 * 1024 * 1024}
            />
          </div>
          {dropError && (
            <p role="alert" className="wb-error">
              {t(
                "Cannot read this file (limit 2 MB). Your previous input is retained.",
                "无法读取文件（最大 2 MB），之前的内容已保留。",
              )}
            </p>
          )}
          <Field label={t("Input format", "输入格式")}>
            <select
              value={s.mode}
              onChange={(event) =>
                set({ mode: event.target.value as TableMode, alignments: [] })
              }
            >
              <option value="auto">
                {t("Detect automatically", "自动识别")}
              </option>
              <option value="markdown">Markdown (GFM)</option>
              <option value="tsv">{t("TSV — tabs", "TSV — 制表符分隔")}</option>
              <option value="csv">{t("CSV — commas", "CSV — 逗号分隔")}</option>
            </select>
          </Field>
          <h2>{t("2. Set headers & alignment", "2. 设置表头与对齐")}</h2>
          <Field label={t("Treat first row as header", "将第一行作为表头")}>
            <input
              type="checkbox"
              checked={s.firstRowHeader}
              onChange={(event) =>
                set({ firstRowHeader: event.target.checked })
              }
            />
          </Field>
          <p>
            {t(
              "When off, Markdown adds Column 1, Column 2… headers and keeps every input row as data. CSV / TSV always export the input grid without adding a header.",
              "关闭后，Markdown 会添加 Column 1、Column 2… 表头，原有各行都作为数据。CSV / TSV 始终导出原有网格，不额外添加表头。",
            )}
          </p>
          <Field label={t("Trim cell whitespace", "去掉单元格首尾空白")}>
            <input
              type="checkbox"
              checked={s.trimCells}
              onChange={(event) => set({ trimCells: event.target.checked })}
            />
          </Field>
          <p>
            {t(
              "Values stay text: 00123 differs from 123. Markdown formatting such as **bold**, HTML and links is exported as literal text. Spreadsheet apps may infer numbers when reopening CSV / TSV; import those columns as text to retain zeros.",
              "所有值均按文本处理：00123 和 123 不会合并。**bold**、HTML 和链接等 Markdown 写法按字面文本导出。表格软件重新打开 CSV / TSV 时可能自行转成数字；请将相应列按文本导入以保留前导零。",
            )}
          </p>
          <div className="wb-fields">
            {report.alignments.map((alignment, i) => (
              <Field
                key={i}
                label={`${t("Column", "第")} ${i + 1}${t(" alignment", " 列对齐")}`}
              >
                <select
                  value={alignment}
                  onChange={(event) => {
                    const alignments = [...report.alignments];
                    alignments[i] = event.target.value as Alignment;
                    set({ alignments });
                  }}
                >
                  {(["none", "left", "center", "right"] as Alignment[]).map(
                    (a) => (
                      <option key={a} value={a}>
                        {alignmentLabel(a)}
                      </option>
                    ),
                  )}
                </select>
              </Field>
            ))}
          </div>
          <NumberField
            label={t("Preview row limit", "预览行数上限")}
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
          <LocalStatus stored={stored} />
        </section>
        <section className="wb-panel">
          <h2>{t("3. Preview & export", "3. 预览并导出")}</h2>
          <div className="wb-stats">
            <span>
              {t("Detected format", "识别格式")}:{" "}
              {report.mode === "markdown"
                ? "Markdown"
                : report.mode.toUpperCase()}
            </span>
            <span>
              {t("Rows", "行数")}: {report.grid.length}
            </span>
            <span>
              {t("Columns", "列数")}: {report.alignments.length}
            </span>
          </div>
          {report.hasErrors && (
            <p role="alert" className="wb-error">
              {t(
                "Table exports blocked. Fix the raw input; JSON diagnostics retain the original text and recovered cells.",
                "表格导出已暂停。请修正原文；JSON 诊断保留原始文本和已恢复的单元格。",
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
          <div className="wb-table-scroll">
            <table
              className="wb-table"
              aria-label={t("Table preview", "表格预览")}
            >
              <thead>
                <tr>
                  {tableHeaders(report)
                    .slice(0, 200)
                    .map((cell, i) => (
                      <th
                        key={i}
                        scope="col"
                        style={{
                          textAlign:
                            report.alignments[i] === "none"
                              ? undefined
                              : report.alignments[i],
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {cell}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {report.grid
                  .slice(s.firstRowHeader ? 1 : 0)
                  .slice(0, previewRows)
                  .map((row, i) => (
                    <tr key={i}>
                      {row.slice(0, 200).map((cell, c) => (
                        <td
                          key={c}
                          style={{
                            textAlign:
                              report.alignments[c] === "none"
                                ? undefined
                                : report.alignments[c],
                            whiteSpace: "pre-wrap",
                            overflowWrap: "anywhere",
                          }}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="muted">
            {t(
              `Preview shows up to ${previewRows} data rows. Exports include all rows. Alignment affects Markdown only. Blank cells and leading zeros remain text.`,
              `预览最多显示 ${previewRows} 行数据，导出包含全部行。对齐设置只影响 Markdown，空单元格和前导零均按文本保留。`,
            )}
          </p>
          <Field label={t("Markdown output", "Markdown 输出")}>
            <textarea readOnly value={markdown} spellCheck={false} />
          </Field>
          <ExportBar
            name="table.md"
            content={markdown}
            disabled={!clean}
            mime="text/markdown;charset=utf-8"
          />
          <ExportBar
            name="table.tsv"
            content={tsv}
            disabled={!clean}
            mime="text/tab-separated-values;charset=utf-8"
          />
          <ExportBar
            name="table.csv"
            content={csv}
            disabled={!clean}
            mime="text/csv;charset=utf-8"
          />
          <ExportBar
            name="table-diagnostic.json"
            content={audit}
            disabled={!ready || !s.raw}
            mime="application/json"
          />
        </section>
      </div>
    </ToolShell>
  );
}
