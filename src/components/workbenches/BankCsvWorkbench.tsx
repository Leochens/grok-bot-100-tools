"use client";
import { useMemo } from "react";
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
  BANK_DEFAULT,
  BANK_CSV_SAMPLE,
  bankCsv,
  bankMoney,
  bankSummary,
  normalizeBankCsv,
  type BankInput,
} from "@/lib/engines/bank-csv";

export function BankCsvWorkbench() {
  const { t, language } = useLanguage();
  const {
    state: s,
    set,
    reset,
    ready,
    stored,
  } = useLocalDraft("one-hundred:bank-csv:v1", BANK_DEFAULT);
  const report = useMemo(() => normalizeBankCsv(s), [s]);
  const clean = ready && !report.hasErrors && report.rows.length > 0;
  const csv = useMemo(() => (clean ? bankCsv(report) : ""), [clean, report]);
  const audit = useMemo(() => JSON.stringify(report, null, 2), [report]);
  const summary = useMemo(
    () => bankSummary(report, language),
    [report, language],
  );
  const column = (
    key:
      | "dateColumn"
      | "payeeColumn"
      | "descriptionColumn"
      | "debitColumn"
      | "creditColumn"
      | "amountColumn"
      | "typeColumn",
    label: string,
    optional = false,
  ) => (
    <Field label={label} key={key}>
      <select
        value={s[key]}
        onChange={(e) => set({ [key]: Number(e.target.value) })}
      >
        {optional && <option value={-1}>{t("None", "不选")}</option>}
        {report.headers.length > 0 &&
          (s[key] < (optional ? -1 : 0) || s[key] >= report.headers.length) && (
            <option value={s[key]}>{t("Choose a column", "请选择列")}</option>
          )}
        {!report.headers.length && (
          <option value={s[key]}>
            {t("Import CSV first", "请先导入 CSV")}
          </option>
        )}
        {report.headers.map((header, i) => (
          <option key={i} value={i}>
            {i + 1}. {header}
          </option>
        ))}
      </select>
    </Field>
  );
  return (
    <ToolShell
      tool={tools.find((x) => x.day === 18)!}
      onSample={() =>
        set({
          ...BANK_DEFAULT,
          rawCsv: BANK_CSV_SAMPLE,
          openingBalance: "100.00",
          closingBalance: "1295.31",
        })
      }
      onReset={reset}
    >
      <div className="wb-layout">
        <section className="wb-panel">
          <h2>{t("1. Import a statement", "1. 导入账单")}</h2>
          <p>
            {t(
              "Your file stays in this browser. Use comma-separated CSV with a header, up to 2 MB / 10,000 rows. Choose the columns after importing.",
              "文件只在浏览器内处理。请使用逗号分隔、带表头的 CSV，最多 2 MB、10,000 行。导入后选择对应列。",
            )}
          </p>
          <TextImport
            value={s.rawCsv}
            onChange={(rawCsv) => set({ rawCsv })}
            label={t("Raw statement CSV", "原始账单 CSV")}
            accept=".csv,.txt"
            maxBytes={2 * 1024 * 1024}
          />
          <h2>{t("2. Map columns & signs", "2. 映射列与收支方向")}</h2>
          <Field label={t("Amount mode", "金额方式")}>
            <select
              value={s.mode}
              onChange={(e) =>
                set({ mode: e.target.value as BankInput["mode"] })
              }
            >
              <option value="split">
                {t("Separate debit / credit columns", "借方、贷方分列")}
              </option>
              <option value="type">
                {t("Amount + transaction type", "金额 + 交易类型列")}
              </option>
              <option value="signed">
                {t("Already signed amount", "单列带正负号金额")}
              </option>
            </select>
          </Field>
          <div className="wb-fields">
            {column("dateColumn", t("Date column", "日期列"))}
            {column("payeeColumn", t("Payee column", "收付款方列"), true)}
            {column(
              "descriptionColumn",
              t("Description column", "摘要列"),
              true,
            )}
            {s.mode === "split" ? (
              <>
                {column(
                  "debitColumn",
                  t("Debit column (outflow)", "借方列（支出）"),
                )}
                {column(
                  "creditColumn",
                  t("Credit column (inflow)", "贷方列（收入）"),
                )}
              </>
            ) : (
              column("amountColumn", t("Amount column", "金额列"))
            )}
            {s.mode === "type" &&
              column("typeColumn", t("Type column", "类型列"))}
          </div>
          {s.mode === "split" && (
            <Field
              label={t(
                "Preserve internal debit / credit signs",
                "保留借贷单元格原有正负号",
              )}
            >
              <input
                type="checkbox"
                checked={s.preserveInternalSigns}
                onChange={(e) =>
                  set({ preserveInternalSigns: e.target.checked })
                }
              />
            </Field>
          )}
          {s.mode === "type" && (
            <>
              <Field
                label={t(
                  "Outflow tokens (comma separated)",
                  "支出类型词（英文逗号分隔）",
                )}
              >
                <input
                  value={s.outflowTokens}
                  onChange={(e) => set({ outflowTokens: e.target.value })}
                />
              </Field>
              <Field
                label={t(
                  "Inflow tokens (comma separated)",
                  "收入类型词（英文逗号分隔）",
                )}
              >
                <input
                  value={s.inflowTokens}
                  onChange={(e) => set({ inflowTokens: e.target.value })}
                />
              </Field>
            </>
          )}
          <Field
            label={t("Date order for slash dates", "斜线日期的年月日顺序")}
          >
            <select
              value={s.dateOrder}
              onChange={(e) =>
                set({ dateOrder: e.target.value as BankInput["dateOrder"] })
              }
            >
              <option value="MDY">
                {t("MDY — month / day / year", "MDY — 月 / 日 / 年")}
              </option>
              <option value="DMY">
                {t("DMY — day / month / year", "DMY — 日 / 月 / 年")}
              </option>
              <option value="YMD">
                {t("YMD — year / month / day", "YMD — 年 / 月 / 日")}
              </option>
            </select>
          </Field>
          <Field label={t("Invert all signs", "反转全部正负号")}>
            <input
              type="checkbox"
              checked={s.invertSigns}
              onChange={(e) => set({ invertSigns: e.target.checked })}
            />
          </Field>
          <p>
            {t(
              "Outflows become negative; inflows positive. Split mode uses credit magnitude − debit magnitude unless internal signs are preserved. Type mode uses your tokens regardless of the amount’s original sign. Inversion happens last. ISO dates (YYYY-MM-DD) are always recognized.",
              "支出为负，收入为正。分列方式默认用贷方绝对值减借方绝对值，也可保留原有正负号。类型方式按类型词确定方向，不受原金额正负影响。最后应用整体反转。YYYY-MM-DD 格式始终按年月日识别。",
            )}
          </p>
          <p className="muted">
            {t(
              "Use decimal points and at most two decimal places; commas are thousands separators. $ £ € ¥, spaces, parentheses and trailing minus signs are supported. Reconcile one currency at a time; no currency conversion.",
              "金额用小数点，最多两位小数，逗号表示千位分隔。支持 $ £ € ¥、空格、括号负数和末尾负号。每次只核对同一币种，不做汇率换算。",
            )}
          </p>
          <h2>{t("3. Check balances (optional)", "3. 核对余额（可选）")}</h2>
          <div className="wb-fields">
            <NumberField
              label={t("Opening balance", "期初余额")}
              value={s.openingBalance === "" ? NaN : Number(s.openingBalance)}
              onChange={(n) =>
                set({ openingBalance: Number.isNaN(n) ? "" : String(n) })
              }
            />
            <NumberField
              label={t("Closing balance", "期末余额")}
              value={s.closingBalance === "" ? NaN : Number(s.closingBalance)}
              onChange={(n) =>
                set({ closingBalance: Number.isNaN(n) ? "" : String(n) })
              }
            />
          </div>
          <p>
            {t(
              "Opening + net change must equal closing. Running balances follow file order; sort your source chronologically if needed. Leave balances blank to skip reconciliation.",
              "期初余额 + 净变动应等于期末余额。逐行余额按文件顺序计算，需要时请先把源文件按时间排序。不填写余额即可跳过对账。",
            )}
          </p>
          <LocalStatus stored={stored} />
        </section>
        <section className="wb-panel">
          <h2>{t("4. Review & export", "4. 检查并导出")}</h2>
          <div className="wb-stats">
            <span>
              {t("Rows", "行数")}: {report.rows.length}
            </span>
            <span>
              {t("Total inflow", "总收入")}:{" "}
              {bankMoney(report.totalInflowCents)}
            </span>
            <span>
              {t("Total outflow", "总支出")}:{" "}
              {bankMoney(report.totalOutflowCents)}
            </span>
            <span>
              {t("Net change", "净变动")}: {bankMoney(report.netChangeCents)}
            </span>
          </div>
          <p className="wb-calculation" role="status">
            {report.reconciled === true
              ? t("Balance matched", "余额吻合")
              : report.reconciled === false
                ? `${t("Balance discrepancy (calculated − entered)", "余额差额（计算值 − 填写值）")}: ${bankMoney(report.deltaCents!)} (${report.deltaCents} ${t("cents", "分")})`
                : t(
                    "Balance not checked — enter both balances and fix any errors.",
                    "尚未核对余额：请填写期初、期末余额并修正错误。",
                  )}
          </p>
          {report.calculatedClosingCents !== null && (
            <p>
              {t("Calculated closing balance", "计算的期末余额")}:{" "}
              {bankMoney(report.calculatedClosingCents)}
            </p>
          )}
          {report.hasErrors && (
            <>
              <p role="alert" className="wb-error">
                {t(
                  "CSV export blocked. Fix the issues below; totals are provisional. JSON and text diagnostics remain available, including the raw CSV in JSON.",
                  "CSV 导出已暂停。请修正下列问题，当前合计仅供暂算。仍可导出 JSON 和文本诊断，JSON 包含原始 CSV。",
                )}
              </p>
              <ul className="wb-issues">
                {report.issues.slice(0, 200).map((issue, i) => (
                  <li key={i}>
                    {issue.row
                      ? `${t("Record", "记录")} ${issue.row}`
                      : t("Settings", "设置")}
                    : {t(issue.en, issue.zh)}
                  </li>
                ))}
              </ul>
              {report.issues.length > 200 && (
                <p>
                  {t(
                    "Showing the first 200 issues; JSON includes all issues.",
                    "仅显示前 200 个问题；JSON 含全部问题。",
                  )}
                </p>
              )}
            </>
          )}
          <div className="wb-table-scroll">
            <table className="wb-table">
              <thead>
                <tr>
                  {[
                    t("Record", "记录"),
                    t("Date", "日期"),
                    t("Payee", "收付款方"),
                    t("Signed amount", "带正负号金额"),
                    t("Running balance", "逐行余额"),
                    t("Status", "状态"),
                  ].map((label) => (
                    <th key={label}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.rows.slice(0, 100).map((row) => (
                  <tr key={row.originalRow}>
                    <td>{row.originalRow}</td>
                    <td>{row.date ?? "—"}</td>
                    <td style={{ overflowWrap: "anywhere" }}>{row.payee}</td>
                    <td>
                      {row.amountCents === null
                        ? "—"
                        : `${row.amountCents > 0 ? "+" : ""}${bankMoney(row.amountCents)}`}
                    </td>
                    <td>
                      {row.runningBalanceCents === null
                        ? "—"
                        : bankMoney(row.runningBalanceCents)}
                    </td>
                    <td>
                      {row.status === "ok"
                        ? t("OK", "正常")
                        : t("Needs correction", "需修正")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted">
            {t(
              "Preview shows up to 100 records. Every record and issue stays in the audit. Record numbers count CSV records including the header; quoted line breaks do not add records. Balance differences do not block export; row and mapping errors do.",
              "预览最多显示 100 条记录。核对报告保留全部记录和问题。记录号包含表头，引号内换行不另算记录。余额差额不妨碍导出，行内容和列映射错误会阻止导出。",
            )}
          </p>
          <ExportBar
            name="normalized-statement.csv"
            content={csv}
            disabled={!clean}
            mime="text/csv;charset=utf-8"
          />
          <ExportBar
            name="bank-audit.json"
            content={audit}
            disabled={!ready || !s.rawCsv}
            mime="application/json"
          />
          <ExportBar
            name="reconciliation-summary.txt"
            content={summary}
            disabled={!ready || !s.rawCsv}
          />
        </section>
      </div>
    </ToolShell>
  );
}
