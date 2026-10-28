import { csvOutput } from "./bom.ts";
import { bankDate } from "./bank-csv.ts";

export type DurationFormat = "auto" | "hms" | "decimal" | "day-fraction";
export type TimesheetInput = {
  raw: string;
  delimiter: "auto" | "csv" | "tsv";
  header: "auto" | "yes" | "no";
  dateColumn: number;
  clientColumn: number;
  projectColumn: number;
  descriptionColumn: number;
  durationColumn: number;
  startColumn: number;
  endColumn: number;
  billableColumn: number;
  rateColumn: number;
  durationFormat: DurationFormat;
  rowFormats: string[];
  rounding: "none" | "round" | "floor" | "ceil";
  increment: number;
  skipNonBillable: boolean;
  dateFrom: string;
  dateTo: string;
  defaultRate: string;
  clientRates: string;
  group: "client" | "project" | "rows";
};
export const TIMESHEET_DEFAULT: TimesheetInput = {
  raw: "",
  delimiter: "auto",
  header: "auto",
  dateColumn: 0,
  clientColumn: 1,
  projectColumn: 2,
  descriptionColumn: 3,
  durationColumn: 4,
  startColumn: -1,
  endColumn: -1,
  billableColumn: 5,
  rateColumn: 6,
  durationFormat: "auto",
  rowFormats: [],
  rounding: "none",
  increment: 360,
  skipNonBillable: true,
  dateFrom: "",
  dateTo: "",
  defaultRate: "60",
  clientRates: "",
  group: "project",
};
export const TIMESHEET_SAMPLE =
  'Date,Client,Project,Description,Duration,Billable,Rate\r\n2026-10-01,Acme,Website,"Design, review",01:10,yes,\r\n2026-10-02,Acme,Website,Implementation,1.5,yes,\r\n2026-10-03,Acme,Website,Spreadsheet edge,0.048611111111,yes,\r\n2026-10-04,Studio,Consulting,Workshop,00:43:30,yes,80\r\n2026-10-05,Acme,Admin,Internal notes,00:20,no,\r\n';

/** Strict RFC-4180 quoting for comma or tab delimiters. Blank records survive.
 * Auto detection counts delimiters outside quotes in the first record. */
export function parseTimesheet(
  raw: string,
  delimiter: TimesheetInput["delimiter"] = "auto",
): string[][] {
  if (
    raw.length > 2 * 1024 * 1024 ||
    new TextEncoder().encode(raw).length > 2 * 1024 * 1024
  )
    throw new Error("size");
  const text = raw.replace(/^\uFEFF/, "");
  if (!text) return [];
  let commas = 0,
    tabs = 0,
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') i++;
      else quoted = !quoted;
    } else if (!quoted) {
      if (c === "\n" || c === "\r") break;
      if (c === ",") commas++;
      if (c === "\t") tabs++;
    }
  }
  const separator =
    delimiter === "tsv" || (delimiter === "auto" && tabs > commas) ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [],
    field = "",
    closed = false;
  quoted = false;
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
    } else if (c === separator) finishField();
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

export function parseDuration(
  raw: string,
  format: DurationFormat = "auto",
): number | null {
  if (!["auto", "hms", "decimal", "day-fraction"].includes(format)) return null;
  const text = raw.trim();
  const hms = /^(\d+):(\d{2})(?::(\d{2}))?$/.exec(text);
  let seconds: number;
  if (hms && (format === "auto" || format === "hms")) {
    if (+hms[2] > 59 || +(hms[3] ?? 0) > 59) return null;
    seconds = +hms[1] * 3600 + +hms[2] * 60 + +(hms[3] ?? 0);
  } else {
    if (format === "hms" || !/^\d+(?:[.,]\d+)?$/.test(text)) return null;
    const value = Number(text.replace(",", "."));
    const fraction =
      format === "day-fraction" ||
      (format === "auto" && value > 0 && value <= 1);
    if (format === "day-fraction" && (value < 0 || value > 1)) return null;
    seconds = Math.round(value * (fraction ? 86400 : 3600));
  }
  // Whole seconds, bounded to a year per entry; no negative billing durations.
  return Number.isSafeInteger(seconds) && seconds >= 0 && seconds <= 366 * 86400
    ? seconds
    : null;
}
export function wallTimeSeconds(
  start: string,
  end: string,
): { seconds: number; overnight: boolean; equal: boolean } | null {
  const wall = (text: string) => {
    if (!/^\d{1,2}:\d{2}(?::\d{2})?$/.test(text.trim())) return null;
    const seconds = parseDuration(text, "hms");
    return seconds !== null && seconds < 86400 ? seconds : null;
  };
  const a = wall(start),
    b = wall(end);
  if (a === null || b === null) return null;
  return { seconds: (b - a + 86400) % 86400, overnight: b < a, equal: a === b };
}
/** Round each entry's whole seconds BEFORE cents; 2 decimal hours = 36 seconds.
 * Halfway values round up; money rounds half up per source entry, then sums. */
export function roundSeconds(
  seconds: number,
  mode: TimesheetInput["rounding"],
  increment: number,
): number {
  if (
    !Number.isSafeInteger(seconds) ||
    seconds < 0 ||
    !["none", "round", "floor", "ceil"].includes(mode) ||
    ![60, 360, 900, 36].includes(increment)
  )
    throw new Error("rounding");
  return mode === "none"
    ? seconds
    : Math[mode](seconds / increment) * increment;
}
function rateCents(raw: string): number | null {
  const text = raw.trim();
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.replace(",", ".").split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents <= 100_000_000 ? cents : null;
}
const moneyFor = (seconds: number, rate: number) =>
  Number((BigInt(seconds) * BigInt(rate) + 1800n) / 3600n);
export function timesheetMoney(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) return "—";
  const value = BigInt(cents);
  return `${value / 100n}.${String(value % 100n).padStart(2, "0")}`;
}
export const timesheetHours = (seconds: number) =>
  (seconds / 3600).toFixed(9).replace(/\.?0+$/, "") || "0";
export type TimesheetIssue = {
  row: number;
  code: string;
  severity: "error" | "warning";
  en: string;
  zh: string;
};
export type TimesheetRow = {
  row: number;
  raw: string[];
  date: string | null;
  client: string;
  project: string;
  description: string;
  format: DurationFormat;
  parsedSeconds: number | null;
  roundedSeconds: number | null;
  roundingDelta: number | null;
  rateCents: number | null;
  amountCents: number | null;
  status: "included" | "skipped" | "error";
};
export type InvoiceLine = {
  client: string;
  project: string;
  description: string;
  seconds: number;
  rateCents: number;
  amountCents: number;
  sourceRows: number[];
};
export type TimesheetReport = {
  input: TimesheetInput;
  headers: string[];
  hasHeader: boolean;
  rows: TimesheetRow[];
  lines: InvoiceLine[];
  issues: TimesheetIssue[];
  hasErrors: boolean;
  totalSeconds: number;
  totalCents: number;
};
export function buildTimesheet(input: TimesheetInput): TimesheetReport {
  const report: TimesheetReport = {
    input: { ...input },
    headers: [],
    hasHeader: false,
    rows: [],
    lines: [],
    issues: [],
    hasErrors: false,
    totalSeconds: 0,
    totalCents: 0,
  };
  const issue = (
    row: number,
    code: string,
    en: string,
    zh: string,
    severity: TimesheetIssue["severity"] = "error",
  ) => {
    report.issues.push({ row, code, en, zh, severity });
    if (severity === "error") report.hasErrors = true;
  };
  let records: string[][];
  try {
    records = parseTimesheet(input.raw, input.delimiter);
  } catch {
    issue(
      0,
      "parse",
      "Invalid quoting or input exceeds 2 MB / 10,000 rows / 100 columns. Raw text is retained in audit JSON.",
      "引号格式错误，或超过 2 MB、10,000 行、100 列限制。审计 JSON 保留原文。",
    );
    return report;
  }
  const knownHeader =
    /^(date|client|project|description|duration|time|start|end|billable|rate|日期|客户|项目|描述|时长)$/i;
  report.hasHeader =
    input.header === "yes" ||
    (input.header === "auto" &&
      (records[0] ?? []).some((c) => knownHeader.test(c.trim())));
  const width = records[0]?.length ?? 0;
  report.headers = report.hasHeader
    ? (records[0] ?? [])
    : Array.from({ length: width }, (_, i) => `#${i + 1}`);
  const data = records.slice(report.hasHeader ? 1 : 0);
  if (data.length > 10000)
    issue(
      0,
      "size",
      "Limit 10,000 timesheet entries, including files without a header.",
      "工时条目最多 10,000 条，没有表头的文件也适用。",
    );
  if (!data.length)
    issue(
      0,
      "empty",
      "Import at least one timesheet entry.",
      "请先导入至少一行工时。",
    );
  const columns = [
    input.dateColumn,
    input.clientColumn,
    input.projectColumn,
    input.descriptionColumn,
    input.durationColumn,
    input.startColumn,
    input.endColumn,
    input.billableColumn,
    input.rateColumn,
  ];
  const active = columns.filter((c) => c >= 0);
  if (
    columns.some((c) => !Number.isInteger(c) || c < -1 || c >= width) ||
    new Set(active).size !== active.length ||
    input.clientColumn < 0 ||
    (input.durationColumn < 0 && (input.startColumn < 0 || input.endColumn < 0))
  )
    issue(
      0,
      "mapping",
      "Map distinct columns, including client and duration (or both start and end). Set unused columns to None.",
      "请选择不同的列，必须包含客户和时长（或开始、结束两列），不用的列请选“不选”。",
    );
  if (
    !(["none", "round", "floor", "ceil"] as string[]).includes(
      input.rounding,
    ) ||
    ![60, 360, 900, 36].includes(input.increment) ||
    !["client", "project", "rows"].includes(input.group) ||
    !["auto", "hms", "decimal", "day-fraction"].includes(
      input.durationFormat,
    ) ||
    !["auto", "yes", "no"].includes(input.header) ||
    !["auto", "csv", "tsv"].includes(input.delimiter)
  )
    issue(
      0,
      "settings",
      "Choose valid duration, rounding, grouping and import settings.",
      "请选择有效的时长、取整、分组和导入设置。",
    );
  if (
    (input.dateFrom && !bankDate(input.dateFrom, "YMD")) ||
    (input.dateTo && !bankDate(input.dateTo, "YMD")) ||
    (input.dateFrom && input.dateTo && input.dateFrom > input.dateTo) ||
    ((input.dateFrom || input.dateTo) && input.dateColumn < 0)
  )
    issue(
      0,
      "range",
      "Use a valid ISO date range and map a date column.",
      "请填写有效的 YYYY-MM-DD 日期范围，并映射日期列。",
    );
  const rates = new Map<string, number>();
  if (input.clientRates.trim()) {
    try {
      const rows = parseTimesheet(input.clientRates, "csv");
      if (
        rows[0]?.[0]?.trim().toLowerCase() === "client" &&
        rows[0]?.[1]?.trim().toLowerCase() === "rate"
      )
        rows.shift();
      rows.forEach((r) => {
        const client = r[0]?.trim(),
          rate = rateCents(r[1] ?? "");
        if (r.length !== 2 || !client || rate === null || rates.has(client))
          issue(
            0,
            "client-rates",
            "Client rates need unique client,rate pairs with nonnegative rates (max. two decimals).",
            "客户单价表须为客户,单价两列；客户不能重复，单价须非负、最多两位小数。",
          );
        else rates.set(client, rate);
      });
    } catch {
      issue(
        0,
        "client-rates",
        "Cannot parse client rate CSV; fix its quoting.",
        "客户单价 CSV 无法解析，请检查引号。",
      );
    }
  }
  const defaultRate = input.defaultRate.trim()
    ? rateCents(input.defaultRate)
    : null;
  if (input.defaultRate.trim() && defaultRate === null)
    issue(
      0,
      "default-rate",
      "Default rate must be nonnegative, at most two decimals and at most 1,000,000.",
      "默认单价须非负、最多两位小数，且不超过 1,000,000。",
    );
  const groups = new Map<string, InvoiceLine>();
  data.forEach((cells, index) => {
    const row = index + (report.hasHeader ? 2 : 1),
      before = report.issues.length;
    const cell = (col: number) => (cells[col] ?? "").trim();
    if (cells.length !== width)
      issue(
        row,
        "columns",
        "Field count differs from the first record; check delimiter and quoting.",
        "列数与首行不一致，请检查分隔符和引号。",
      );
    const date =
      input.dateColumn >= 0 ? bankDate(cell(input.dateColumn), "YMD") : null;
    if (input.dateColumn >= 0 && !date)
      issue(
        row,
        "date",
        "Use YYYY-MM-DD dates (slash dates use Y/M/D).",
        "日期请用 YYYY-MM-DD，斜线格式按年/月/日读取。",
      );
    const client = cell(input.clientColumn),
      project = cell(input.projectColumn),
      description = cells[input.descriptionColumn] ?? "";
    if (!client) issue(row, "client", "Client is missing.", "缺少客户名称。");
    let billable = true;
    if (input.billableColumn >= 0) {
      const flag = cell(input.billableColumn).toLowerCase();
      if (["no", "false", "0", "non-billable", "否", "不计费"].includes(flag))
        billable = false;
      else if (!["yes", "true", "1", "billable", "是", "计费"].includes(flag))
        issue(
          row,
          "billable",
          "Unknown billable flag; use yes/no, true/false or 1/0.",
          "无法识别计费标记，请用 yes/no、true/false、1/0 或 是/否。",
        );
    }
    const format = (input.rowFormats[index] ||
      input.durationFormat) as DurationFormat;
    let parsedSeconds: number | null = null;
    if (!["auto", "hms", "decimal", "day-fraction"].includes(format))
      issue(
        row,
        "format",
        "Choose a valid duration format.",
        "请选择有效的时长格式。",
      );
    else if (input.durationColumn >= 0) {
      const duration = cell(input.durationColumn);
      parsedSeconds = parseDuration(duration, format);
      if (
        format === "auto" &&
        /^\d+(?:[.,]\d+)?$/.test(duration) &&
        +duration.replace(",", ".") > 0 &&
        +duration.replace(",", ".") <= 1
      )
        issue(
          row,
          "fraction",
          "Auto interprets numeric (0,1] as spreadsheet days; select decimal hours for fractional hours (1 means 24h in Auto).",
          "自动模式把 (0,1] 数值当作表格天数；若为小数小时请改选格式（自动模式的 1 表示 24 小时）。",
          "warning",
        );
    } else {
      const wall = wallTimeSeconds(
        cell(input.startColumn),
        cell(input.endColumn),
      );
      parsedSeconds = wall?.seconds ?? null;
      if (wall?.overnight)
        issue(
          row,
          "overnight",
          "End precedes start: assumed one overnight wrap. Check for a reversed entry; dates are not inferred.",
          "结束早于开始：已按跨午夜一次计算。请确认是否填反，不推断跨天日期。",
          "warning",
        );
      if (wall?.equal)
        issue(
          row,
          "equal-time",
          "Equal start/end is ambiguous (0 or 24h); map an explicit duration instead.",
          "开始和结束相同，无法确定是 0 还是 24 小时，请改用明确时长列。",
        );
    }
    if (parsedSeconds === null)
      issue(
        row,
        "duration",
        "Unparsed or negative duration. Use HH:MM[:SS], decimal hours or a day fraction; negative entries need correction.",
        "时长无法解析或为负。请使用 HH:MM[:SS]、小数小时或天数小数，负时长须先修正。",
      );
    let roundedSeconds: number | null = null;
    if (parsedSeconds !== null) {
      try {
        roundedSeconds = roundSeconds(
          parsedSeconds,
          input.rounding,
          input.increment,
        );
      } catch {
        /* Settings issue already visible. */
      }
    }
    const skipped =
      (!billable && input.skipNonBillable) ||
      !!(
        date &&
        ((input.dateFrom && date < input.dateFrom) ||
          (input.dateTo && date > input.dateTo))
      );
    const override = cell(input.rateColumn);
    const rate = override
      ? rateCents(override)
      : (rates.get(client) ?? defaultRate);
    if (!skipped && rate === null)
      issue(
        row,
        "rate",
        "Missing or invalid hourly rate; set a default, client rate or row override.",
        "缺少有效时薪，请填写默认单价、客户单价或本行单价。",
      );
    const amount =
      roundedSeconds !== null && rate !== null
        ? moneyFor(roundedSeconds, rate)
        : null;
    if (
      !skipped &&
      amount !== null &&
      rate !== null &&
      roundedSeconds !== null &&
      Math.round(Number((roundedSeconds / 3600).toFixed(2)) * rate) !== amount
    )
      issue(
        row,
        "display",
        "Two-decimal displayed hours × rate differs from the billed cents. Exports retain 9 hour decimals; choose 2-decimal-hour rounding to bill that way. Group totals sum entry cents.",
        "只显示两位小数的小时数乘单价，与实际分金额不同。导出保留 9 位小数小时；若要按两位小数计费，请选择相应取整粒度。分组金额按逐行分金额相加。",
        "warning",
      );
    const rowError = report.issues
      .slice(before)
      .some((i) => i.severity === "error");
    report.rows.push({
      row,
      raw: cells,
      date,
      client,
      project,
      description,
      format,
      parsedSeconds,
      roundedSeconds,
      roundingDelta:
        parsedSeconds !== null && roundedSeconds !== null
          ? roundedSeconds - parsedSeconds
          : null,
      rateCents: rate,
      amountCents: amount,
      status: rowError ? "error" : skipped ? "skipped" : "included",
    });
    if (
      rowError ||
      skipped ||
      roundedSeconds === null ||
      rate === null ||
      amount === null
    )
      return;
    const key = JSON.stringify([
      client,
      input.group === "project" ? project : input.group === "rows" ? row : "",
      rate,
    ]);
    const line = groups.get(key);
    if (line) {
      line.seconds += roundedSeconds;
      line.amountCents += amount;
      line.sourceRows.push(row);
    } else
      groups.set(key, {
        client,
        project: input.group === "client" ? "" : project,
        description: "",
        seconds: roundedSeconds,
        rateCents: rate,
        amountCents: amount,
        sourceRows: [row],
      });
    report.totalSeconds += roundedSeconds;
    report.totalCents += amount;
  });
  report.lines = [...groups.values()].map((line) => ({
    ...line,
    description: [
      ...new Set(
        line.sourceRows
          .map((n) => report.rows[n - (report.hasHeader ? 2 : 1)].description)
          .filter(Boolean),
      ),
    ].join("; "),
  }));
  if (
    !Number.isSafeInteger(report.totalCents) ||
    !Number.isSafeInteger(report.totalSeconds)
  )
    issue(
      0,
      "overflow",
      "Totals exceed safe integer limits; split the input.",
      "合计超过安全整数范围，请拆分文件。",
    );
  return report;
}
export function canExportTimesheet(report: TimesheetReport): boolean {
  return !report.hasErrors && report.lines.length > 0;
}
const mdCell = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/([\\`*_{}\[\]()!|])/g, "\\$1")
    .replace(/[\r\n]+/g, " ");
export function exportTimesheet(
  report: TimesheetReport,
  format: "csv" | "md" | "json",
  language: "en" | "zh" = "en",
): string {
  if (format === "json") return JSON.stringify(report, null, 2);
  if (!canExportTimesheet(report)) return "";
  const rows = report.lines.map((l) => [
    l.client,
    l.project,
    l.description,
    timesheetHours(l.seconds),
    timesheetMoney(l.rateCents),
    timesheetMoney(l.amountCents),
  ]);
  if (format === "csv")
    return csvOutput([
      ["client", "project", "description", "hours", "rate", "amount"],
      ...rows,
    ]);
  const zh = language === "zh";
  return [
    zh ? "# 工时发票摘要" : "# Timesheet invoice summary",
    "",
    zh
      ? "| 客户 | 项目 | 描述 | 小时 | 时薪 | 金额 |"
      : "| Client | Project | Description | Hours | Rate | Amount |",
    "| --- | --- | --- | ---: | ---: | ---: |",
    ...rows.map((r) => `| ${r.map(mdCell).join(" | ")} |`),
    "",
    `**${zh ? "总小时数" : "Total hours"}: ${timesheetHours(report.totalSeconds)} · ${zh ? "总金额" : "Total amount"}: ${timesheetMoney(report.totalCents)}**`,
    "",
    zh
      ? "按每条原始工时先取整秒数、再四舍五入到分，分组累加。同组不同单价分列。小时数保留 9 位小数；合计可能与分组小时乘单价有分币差异。所有金额须为同一币种。"
      : "Each entry is rounded in seconds, then half-up to cents; groups sum entry cents. Different rates stay on separate lines. Hours retain 9 decimals; grouped hours × rate may differ by cents. Use one currency throughout.",
    "",
    ...report.issues.map(
      (i) =>
        `- ${zh ? `记录 ${i.row}` : `Record ${i.row}`}: ${zh ? i.zh : i.en}`,
    ),
  ].join("\n");
}
