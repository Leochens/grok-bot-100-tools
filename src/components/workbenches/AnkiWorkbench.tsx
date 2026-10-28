"use client";
import { tools } from "@/data/tools";
import {
  ANKI_SAMPLE,
  ankiTsv,
  deduplicateDeck,
  inspectDeck,
  inspectDeckRows,
  type DeckIssue,
} from "@/lib/engines/anki";
import { ToolShell } from "../ToolShell";
import { useLanguage } from "../LanguageProvider";
import {
  ExportBar,
  Field,
  LocalStatus,
  TextImport,
  useLocalDraft,
} from "./shared";
import { BatchError } from "./batch-shared";
const initial = { raw: "", delimiter: "auto", edited: "", header: false };
export function AnkiWorkbench() {
  const { t } = useLanguage(),
    {
      state: s,
      set,
      reset,
      stored,
    } = useLocalDraft("one-hundred:anki:v1", initial);
  let rows: string[][] = [],
    issues: DeckIssue[] = [],
    error = "",
    output = "",
    parseBlocked = false;
  try {
    const deck = inspectDeck(s.raw, s.delimiter);
    rows = s.edited
      ? JSON.parse(s.edited)
      : s.header
        ? deck.rows.slice(1)
        : deck.rows;
    if (
      !Array.isArray(rows) ||
      !rows.every(
        (r) => Array.isArray(r) && r.every((c) => typeof c === "string"),
      )
    )
      throw new Error("rows");
    const structural = deck.issues.filter((i) =>
      ["quote", "encoding"].includes(i.code),
    );
    parseBlocked = !!structural.length;
    issues = [
      ...structural,
      ...deck.issues.filter((i) => i.code === "delimiter"),
      ...inspectDeckRows(rows),
    ];
    if (rows.length && !issues.some((i) => i.code !== "delimiter"))
      output = ankiTsv(rows);
  } catch (e) {
    error = (e as Error).message;
  }
  const edit = (next: string[][]) => set({ edited: JSON.stringify(next) });
  const labels: Record<string, string> = {
    quote: t("Broken CSV quotes", "CSV 引号损坏"),
    columns: t("Orphan row / wrong field count", "孤立行 / 列数不符"),
    duplicate: t(
      "First-field collision: may update an existing note",
      "首字段冲突：可能覆盖已有笔记",
    ),
    cloze: t("Broken or empty Cloze deletion", "挖空语法损坏或内容为空"),
    delimiter: t(
      "Check delimiter: only one field detected",
      "请检查分隔符：仅检测到一列",
    ),
    empty: t("Empty first field", "首字段为空"),
    encoding: t(
      "Invalid UTF-8 replacement character",
      "存在无效 UTF-8 替换字符",
    ),
  };
  return (
    <ToolShell
      tool={tools.find((x) => x.day === 12)!}
      onSample={() => set({ ...initial, raw: ANKI_SAMPLE, header: true })}
      onReset={reset}
    >
      <div className="wb-layout">
        <section className="wb-panel">
          <h2>{t("1. Inspect import text", "1. 检查导入文本")}</h2>
          <Field label={t("Field separator", "字段分隔符")}>
            <select
              value={s.delimiter}
              onChange={(e) => set({ delimiter: e.target.value, edited: "" })}
            >
              <option value="auto">
                {t("Detect automatically", "自动识别")}
              </option>
              <option value=",">{t("Comma (CSV)", "逗号（CSV）")}</option>
              <option value={"\t"}>{t("Tab (TSV)", "制表符（TSV）")}</option>
              <option value=";">{t("Semicolon", "分号")}</option>
            </select>
          </Field>
          <TextImport
            label={t("CSV / TSV flashcards", "CSV / TSV 抽认卡")}
            value={s.raw}
            onChange={(raw) => set({ raw, edited: "" })}
            accept=".csv,.tsv,.txt"
          />
          <label className="wb-check">
            <input
              type="checkbox"
              checked={s.header}
              onChange={(e) => set({ header: e.target.checked, edited: "" })}
            />
            {t(
              "First record is a column header (omit from cards)",
              "首条记录为列标题（不导入卡片）",
            )}
          </label>
          <p>
            {t(
              "Correct broken quotes or split multiline records in the source text. Valid quoted multiline cells are supported. Anki comment headers are recognized; regular column headers need the checkbox.",
              "请在原始文本中修正引号或被拆散的多行记录。支持正确引用的多行单元格，自动识别 Anki 注释头。普通列标题请勾选上方选项。",
            )}
          </p>
        </section>
        <section className="wb-panel">
          <h2>
            {t("Import diagnostics", "导入诊断")} ({issues.length})
          </h2>
          <BatchError code={error} />
          <ul className="wb-diagnostics">
            {issues.map((issue, i) => (
              <li
                key={i}
                className={issue.code === "delimiter" ? "" : "wb-error"}
              >
                {issue.row > 0 ? `${t("Row", "行")} ${issue.row}: ` : ""}
                <strong>{labels[issue.code]}</strong>
                <span>
                  {" "}
                  ·{" "}
                  {t(
                    issue.detail,
                    issue.code === "duplicate"
                      ? "请修改首字段或保留一条记录。"
                      : issue.code === "cloze"
                        ? "检查 {{c1::内容}} 的编号、分隔符、内容及括号。"
                        : issue.code === "columns"
                          ? "字段数不一致，请补齐字段、合并孤立行或修正引号。"
                          : issue.code === "quote"
                            ? "引号需成对，单元格内双引号需写成两个。"
                            : issue.code === "delimiter"
                              ? "单字段挖空卡可保留一列；否则请切换正确分隔符。"
                              : "请修正当前字段后重试。",
                  )}
                </span>
              </li>
            ))}
          </ul>
          {rows.length > 0 && !issues.length && (
            <p>{t("No import errors found.", "未发现导入错误。")}</p>
          )}
          <p>
            {t(
              "Duplicate checks cover this file. Anki may also match existing notes in your collection, depending on import settings. HTML is preserved; multiline cells export as <br>.",
              "去重仅检查当前文件。Anki 仍可能根据导入设置匹配现有笔记。保留原有 HTML，多行内容导出为 <br>。",
            )}
          </p>
          <button
            className="button"
            disabled={parseBlocked || !rows.length}
            onClick={() => edit(deduplicateDeck(rows, "first"))}
          >
            {t("Deduplicate: keep first", "去重：保留第一条")}
          </button>
          <button
            className="button"
            disabled={parseBlocked || !rows.length}
            onClick={() => edit(deduplicateDeck(rows, "last"))}
          >
            {t("Deduplicate: keep last", "去重：保留最后一条")}
          </button>
          <ExportBar
            name="anki-clean.tsv"
            content={output}
            disabled={!output || !!error || parseBlocked}
          />
        </section>
      </div>
      <section className="wb-panel">
        <h2>
          {t("2. Fix fields inline", "2. 逐格修正字段")} ({rows.length})
        </h2>
        {rows.length > 1000 && (
          <p>
            {t(
              "Showing the first 1000 notes. Export includes every note.",
              "仅显示前 1000 条，导出包含所有记录。",
            )}
          </p>
        )}
        <div className="wb-table-scroll">
          <table className="wb-table">
            <thead>
              <tr>
                <th>#</th>
                {Array.from(
                  { length: Math.max(0, ...rows.map((r) => r.length)) },
                  (_, j) => (
                    <th key={j}>
                      {t("Field", "字段")} {j + 1}
                    </th>
                  ),
                )}
                <th>{t("Actions", "操作")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 1000).map((row, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  {Array.from(
                    { length: Math.max(rows[0]?.length || 0, row.length) },
                    (_, j) => (
                      <td key={j}>
                        <textarea
                          aria-label={t(
                            `Row ${i + 1} field ${j + 1}`,
                            `第 ${i + 1} 行字段 ${j + 1}`,
                          )}
                          value={row[j] || ""}
                          disabled={parseBlocked}
                          onChange={(e) =>
                            edit(
                              rows.map((r, k) =>
                                k === i
                                  ? Array.from(
                                      {
                                        length: Math.max(
                                          rows[0]?.length || 0,
                                          row.length,
                                        ),
                                      },
                                      (_, c) =>
                                        c === j ? e.target.value : r[c] || "",
                                    )
                                  : r,
                              ),
                            )
                          }
                        />
                      </td>
                    ),
                  )}
                  <td>
                    <button
                      className="button"
                      disabled={parseBlocked}
                      onClick={() => edit(rows.filter((_, j) => j !== i))}
                    >
                      {t("Remove row", "删除此行")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <LocalStatus stored={stored} />
    </ToolShell>
  );
}
