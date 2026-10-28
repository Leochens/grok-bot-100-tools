import { csvOutput } from "./bom.ts";

export type BankMode = "split" | "type" | "signed";
export type BankDateOrder = "MDY" | "DMY" | "YMD";
export type BankInput = {
  rawCsv: string;
  mode: BankMode;
  dateOrder: BankDateOrder;
  dateColumn: number;
  payeeColumn: number;
  descriptionColumn: number;
  debitColumn: number;
  creditColumn: number;
  amountColumn: number;
  typeColumn: number;
  preserveInternalSigns: boolean;
  invertSigns: boolean;
  outflowTokens: string;
  inflowTokens: string;
  openingBalance: string;
  closingBalance: string;
};
export const BANK_DEFAULT: BankInput = {
  rawCsv: "",
  mode: "split",
  dateOrder: "MDY",
  dateColumn: 0,
  payeeColumn: 1,
  descriptionColumn: 2,
  debitColumn: 3,
  creditColumn: 4,
  amountColumn: 3,
  typeColumn: 4,
  preserveInternalSigns: false,
  invertSigns: false,
  outflowTokens: "debit,dr,d,out,withdrawal,charge,purchase,debt",
  inflowTokens: "credit,cr,c,in,deposit,payment,refund",
  openingBalance: "",
  closingBalance: "",
};
export const BANK_CSV_SAMPLE =
  'Date,Payee,Description,Debit,Credit\r\n04/05/2026,"Corner Market, Downtown","Groceries, weekly",$42.35,\r\n04/06/2026,Client transfer,Invoice 1042,,"$1,250.00"\r\n04/07/2026,Transit,Monthly top-up,(12.34),\r\n';
export type BankRowIssue = {
  row: number;
  code: string;
  en: string;
  zh: string;
};
export type BankRow = {
  originalRow: number;
  original: string[];
  date: string | null;
  payee: string;
  description: string;
  amountCents: number | null;
  amount: number | null;
  runningBalanceCents: number | null;
  status: "ok" | "error";
};
export type BankReport = {
  mapping: BankInput;
  headers: string[];
  rows: BankRow[];
  issues: BankRowIssue[];
  hasErrors: boolean;
  totalInflowCents: number;
  totalOutflowCents: number;
  netChangeCents: number;
  openingBalanceCents: number | null;
  closingBalanceCents: number | null;
  calculatedClosingCents: number | null;
  reconciled: boolean | null;
  deltaCents: number | null;
  delta: number | null;
};

/** RFC-4180 records, including empty records (which become visible errors).
 * A final record separator is not a transaction. Quoted CR/LF is preserved. */
export function parseBankCsv(raw: string): string[][] {
  if (
    raw.length > 2 * 1024 * 1024 ||
    new TextEncoder().encode(raw).length > 2 * 1024 * 1024
  )
    throw new Error("size");
  const text = raw.replace(/^\uFEFF/, "");
  if (!text) return [];
  const rows: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false,
    closed = false;
  const finishField = () => {
    row.push(field);
    field = "";
    closed = false;
    if (row.length > 100) throw new Error("size");
  };
  const finishRow = () => {
    finishField();
    rows.push(row);
    row = [];
    if (rows.length > 10001) throw new Error("size");
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else field += c;
    } else if (c === '"') {
      if (field || closed) throw new Error("csv");
      quoted = true;
    } else if (c === ",") finishField();
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      finishRow();
    } else {
      if (closed) throw new Error("csv");
      field += c;
    }
  }
  if (quoted) throw new Error("csv");
  if (field || row.length || closed) finishRow();
  return rows;
}

/** Decimal point currency; comma is a thousands separator, never a decimal comma. */
export function bankAmountCents(raw: string): number | null {
  let text = raw.trim().replace(/\s/g, "");
  if (!text) return null;
  // Currency may wrap a sign or parentheses, but never split the digits.
  const currency = text.match(/[$£€¥]/g);
  if ((currency?.length ?? 0) > 1 || /[\d.,][$£€¥][\d.,]/.test(text))
    return null;
  text = text.replace(/[$£€¥]/g, "");
  let negative = false;
  if (text.startsWith("(") && text.endsWith(")")) {
    negative = true;
    text = text.slice(1, -1).trim();
  }
  if (/^-|-$/.test(text)) {
    if (negative || (text.startsWith("-") && text.endsWith("-"))) return null;
    negative = true;
    text = text.replace(/^-|-$/g, "");
  } else text = text.replace(/^\+/, "");
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(text)) return null;
  const amount = Number(text.replace(/,/g, ""));
  const cents = Math.round(amount * 100);
  if (!Number.isSafeInteger(cents) || cents > 100_000_000_000) return null;
  return (negative ? -1 : 1) * cents || 0;
}
export function bankDate(raw: string, order: BankDateOrder): string | null {
  const text = raw.trim();
  let year: number, month: number, day: number;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else {
    const match = /^(\d{1,4})\/(\d{1,2})\/(\d{1,4})$/.exec(text);
    if (!match) return null;
    const values = match.slice(1);
    const y = order === "YMD" ? 0 : 2;
    if (values[y].length !== 4 || values[order === "YMD" ? 2 : 0].length > 2)
      return null;
    year = Number(values[y]);
    month = Number(values[order === "MDY" ? 0 : 1]);
    day = Number(values[order === "MDY" ? 1 : order === "DMY" ? 0 : 2]);
  }
  if (
    year < 1000 ||
    year > 9999 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  )
    return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day)
    return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
export function normalizeBankCsv(input: BankInput): BankReport {
  const report: BankReport = {
    mapping: { ...input },
    headers: [],
    rows: [],
    issues: [],
    hasErrors: false,
    totalInflowCents: 0,
    totalOutflowCents: 0,
    netChangeCents: 0,
    openingBalanceCents: null,
    closingBalanceCents: null,
    calculatedClosingCents: null,
    reconciled: null,
    deltaCents: null,
    delta: null,
  };
  const issue = (row: number, code: string, en: string, zh: string) => {
    report.issues.push({ row, code, en, zh });
    report.hasErrors = true;
  };
  let records: string[][];
  try {
    records = parseBankCsv(input.rawCsv);
  } catch (e) {
    issue(
      0,
      (e as Error).message,
      "Use valid quoted CSV, up to 2 MB, 10,000 data rows and 100 columns. Raw input remains in the audit report.",
      "请使用引号配对正确的 CSV，最多 2 MB、10,000 行数据、100 列。原始输入保留在核对报告中。",
    );
    return report;
  }
  report.headers = records[0] ?? [];
  if (records.length < 2)
    issue(
      0,
      "rows",
      "A header and at least one data row are required.",
      "需要一行表头和至少一行数据。",
    );
  if (!report.headers.length || report.headers.some((h) => !h.trim()))
    issue(0, "header", "Every header needs a name.", "每一列表头都需要名称。");
  const validMode = ["split", "type", "signed"].includes(input.mode);
  if (!validMode || !["MDY", "DMY", "YMD"].includes(input.dateOrder))
    issue(
      0,
      "settings",
      "Choose a valid amount mode and date order.",
      "请选择有效的金额方式和日期顺序。",
    );
  const required = [
    input.dateColumn,
    ...(input.mode === "split"
      ? [input.debitColumn, input.creditColumn]
      : [input.amountColumn]),
    ...(input.mode === "type" ? [input.typeColumn] : []),
  ];
  if (
    required.some(
      (i) => !Number.isInteger(i) || i < 0 || i >= report.headers.length,
    ) ||
    new Set(required).size !== required.length ||
    [input.payeeColumn, input.descriptionColumn].some(
      (i) => !Number.isInteger(i) || i < -1 || i >= report.headers.length,
    )
  )
    issue(
      0,
      "mapping",
      "Map distinct date, amount and type columns. Optional text columns may be omitted.",
      "请为日期、金额和类型选择不同的列，文字列可以不选。",
    );
  const tokens = (s: string) =>
    new Set(
      s
        .split(",")
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean),
    );
  const out = tokens(input.outflowTokens),
    into = tokens(input.inflowTokens);
  if (
    input.mode === "type" &&
    (!out.size || !into.size || [...out].some((s) => into.has(s)))
  )
    issue(
      0,
      "tokens",
      "Provide nonempty, non-overlapping inflow and outflow tokens.",
      "请填写收入、支出的类型词，两组不能为空或重叠。",
    );
  for (const key of ["openingBalance", "closingBalance"] as const) {
    if (input[key].trim()) {
      const value = bankAmountCents(input[key]);
      if (value === null)
        issue(
          0,
          "balance",
          "Balances must be valid decimal amounts with at most two decimal places.",
          "余额必须是有效金额，最多两位小数。",
        );
      report[
        key === "openingBalance" ? "openingBalanceCents" : "closingBalanceCents"
      ] = value;
    }
  }
  let running = report.openingBalanceCents;
  records.slice(1).forEach((cells, i) => {
    const row = i + 2,
      before = report.issues.length;
    const cell = (index: number) => cells[index] ?? "";
    if (cells.length !== report.headers.length)
      issue(
        row,
        "columns",
        "Field count differs from the header; check quoting and delimiters.",
        "列数与表头不一致，请检查引号和分隔符。",
      );
    const date = bankDate(cell(input.dateColumn), input.dateOrder);
    if (!date)
      issue(
        row,
        "date",
        "Invalid date for the selected date order.",
        "日期无效，请检查所选的年月日顺序。",
      );
    let amountCents: number | null = null;
    if (input.mode === "split") {
      const debit = cell(input.debitColumn).trim()
        ? bankAmountCents(cell(input.debitColumn))
        : 0;
      const credit = cell(input.creditColumn).trim()
        ? bankAmountCents(cell(input.creditColumn))
        : 0;
      if (debit === null || credit === null)
        issue(
          row,
          "amount",
          "Invalid debit or credit amount (decimal point, max. two decimals).",
          "借方或贷方金额无效（小数点用句点，最多两位小数）。",
        );
      else {
        if (debit !== 0 && credit !== 0)
          issue(
            row,
            "both",
            "Both debit and credit are non-zero; resolve this row before export.",
            "借方和贷方同时非零，请确认这一行后再导出。",
          );
        amountCents = input.preserveInternalSigns
          ? credit - debit
          : Math.abs(credit) - Math.abs(debit);
      }
    } else {
      amountCents = bankAmountCents(cell(input.amountColumn));
      if (amountCents === null)
        issue(
          row,
          "amount",
          "Invalid amount (decimal point, max. two decimals); blank is not zero.",
          "金额无效（小数点用句点，最多两位小数）；空白不当作零。",
        );
      if (input.mode === "type") {
        const token = cell(input.typeColumn).trim().toLowerCase();
        if (!out.has(token) && !into.has(token)) {
          issue(
            row,
            "type",
            "Unknown transaction type; add its exact token or correct the mapping.",
            "无法识别交易类型，请补充对应类型词或修正列映射。",
          );
          amountCents = null;
        } else if (amountCents !== null)
          amountCents = (out.has(token) ? -1 : 1) * Math.abs(amountCents);
      }
    }
    if (amountCents !== null) {
      amountCents = (input.invertSigns ? -amountCents : amountCents) || 0;
      if (amountCents > 0) report.totalInflowCents += amountCents;
      else report.totalOutflowCents += amountCents;
    }
    const rowError = report.issues.length > before;
    // Once a row is uncertain, no later balance is presented as verified.
    running =
      running !== null && amountCents !== null && !rowError && !report.hasErrors
        ? running + amountCents
        : null;
    report.rows.push({
      originalRow: row,
      original: cells,
      date,
      payee: cell(input.payeeColumn),
      description: cell(input.descriptionColumn),
      amountCents,
      amount: amountCents === null ? null : amountCents / 100,
      runningBalanceCents: running,
      status: rowError ? "error" : "ok",
    });
  });
  report.netChangeCents = report.totalInflowCents + report.totalOutflowCents;
  if (
    !report.hasErrors &&
    report.rows.length &&
    report.openingBalanceCents !== null
  ) {
    report.calculatedClosingCents =
      report.openingBalanceCents + report.netChangeCents;
    if (report.closingBalanceCents !== null) {
      report.deltaCents =
        report.calculatedClosingCents - report.closingBalanceCents;
      report.delta = report.deltaCents / 100;
      report.reconciled = report.deltaCents === 0;
    }
  }
  return report;
}
export const bankMoney = (cents: number) => (cents / 100).toFixed(2);
export function bankCsv(report: BankReport): string {
  if (report.hasErrors || !report.rows.length) throw new Error("errors");
  return csvOutput([
    ["Date", "Payee", "Amount", "Description"],
    ...report.rows.map((r) => [
      r.date!,
      r.payee,
      bankMoney(r.amountCents!),
      r.description,
    ]),
  ]);
}
export function bankSummary(
  report: BankReport,
  language: "en" | "zh" = "en",
): string {
  const zh = language === "zh";
  return [
    zh ? "银行账单对账摘要" : "Bank statement reconciliation summary",
    `${zh ? "行数" : "Rows"}: ${report.rows.length}`,
    `${zh ? "总收入" : "Total inflow"}: ${bankMoney(report.totalInflowCents)}`,
    `${zh ? "总支出" : "Total outflow"}: ${bankMoney(report.totalOutflowCents)}`,
    `${zh ? "净变动" : "Net change"}: ${bankMoney(report.netChangeCents)}`,
    `${zh ? "期初余额" : "Opening balance"}: ${report.openingBalanceCents === null ? "—" : bankMoney(report.openingBalanceCents)}`,
    `${zh ? "填写的期末余额" : "Entered closing balance"}: ${report.closingBalanceCents === null ? "—" : bankMoney(report.closingBalanceCents)}`,
    `${zh ? "计算的期末余额" : "Calculated closing balance"}: ${report.calculatedClosingCents === null ? "—" : bankMoney(report.calculatedClosingCents)}`,
    report.reconciled === null
      ? zh
        ? "未核对：请修正错误并填写期初、期末余额。"
        : "Not checked: correct errors and enter opening and closing balances."
      : report.reconciled
        ? zh
          ? "余额吻合"
          : "Balance matched"
        : `${zh ? "差额（计算值 − 填写值）" : "Discrepancy (calculated − entered)"}: ${bankMoney(report.deltaCents!)} (${report.deltaCents} ${zh ? "分" : "cents"})`,
    zh
      ? "有错误时合计为暂算值。金额不做币种兑换，须在同一币种下核对。"
      : "Totals are provisional when errors exist. No currency conversion; reconcile one currency at a time.",
    ...report.issues.map(
      (i) =>
        `${i.row ? `${zh ? "记录" : "Record"} ${i.row}` : zh ? "设置" : "Settings"}: ${zh ? i.zh : i.en}`,
    ),
  ].join("\n");
}
