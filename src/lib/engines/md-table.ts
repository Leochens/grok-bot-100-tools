export type TableMode = "auto" | "markdown" | "tsv" | "csv";
export type Alignment = "none" | "left" | "center" | "right";
export type TableIssue = { en: string; zh: string; error: boolean };
export type TableInput = {
  raw: string;
  mode: TableMode;
  firstRowHeader: boolean;
  trimCells: boolean;
  alignments: Alignment[];
  previewRows: number;
};
export type TableReport = {
  raw: string;
  mode: Exclude<TableMode, "auto">;
  grid: string[][];
  alignments: Alignment[];
  firstRowHeader: boolean;
  issues: TableIssue[];
  hasErrors: boolean;
};
export const MD_TABLE_DEFAULT: TableInput = {
  raw: "",
  mode: "auto",
  firstRowHeader: true,
  trimCells: false,
  alignments: [],
  previewRows: 100,
};
export const MD_TABLE_SAMPLE =
  '编号,选项,备注,数量\r\n00123,A|B,"**bold** stays literal",12\r\n123,C,"第一行\n第二行",7\r\n00007,,"He said ""hello""",0';
export const MD_TABLE_SAMPLE_ALIGNMENTS: Alignment[] = [
  "left",
  "center",
  "none",
  "right",
];
const validAlignments: Alignment[] = ["none", "left", "center", "right"];

// Quoted TSV is also used by spreadsheet clipboards for tabs and multiline cells.
function delimited(raw: string, delimiter: string, issues: TableIssue[]) {
  const grid: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false,
    closed = false;
  const invalid = () => {
    if (!issues.some((i) => i.error))
      issues.push({
        en: "Malformed quoted field. Close quotes, double embedded quotes, and put delimiters directly after closing quotes. Raw input is retained; exports are blocked.",
        zh: "字段引号格式有误。请闭合引号、把字段内的双引号写成两个，并让结束引号紧接分隔符。原文已保留，导出已暂停。",
        error: true,
      });
  };
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (quoted) {
      if (c === '"') {
        if (raw[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else cell += c;
    } else if (c === delimiter) {
      row.push(cell);
      cell = "";
      closed = false;
    } else if (c === "\r" || c === "\n") {
      row.push(cell);
      grid.push(row);
      row = [];
      cell = "";
      closed = false;
      if (c === "\r" && raw[i + 1] === "\n") i++;
    } else if (c === '"' && !cell && !closed) quoted = true;
    else {
      if (closed || c === '"') invalid();
      cell += c;
    }
  }
  if (quoted) invalid();
  if (cell || row.length || closed || quoted || !/[\r\n]$/.test(raw)) {
    row.push(cell);
    grid.push(row);
  }
  return grid;
}

// Split only unescaped pipes; even and odd runs of backslashes differ.
function markdownCells(line: string) {
  const cells: string[] = [];
  let cell = "",
    escaped = false;
  for (const c of line.trim()) {
    if (c === "|" && !escaped) {
      cells.push(cell);
      cell = "";
    } else cell += c;
    escaped = c === "\\" && !escaped;
  }
  cells.push(cell);
  if (cells[0] === "") cells.shift();
  if (cells.at(-1) === "") cells.pop();
  return cells.map((c) => c.trim());
}
const separator = (cells: string[]) =>
  cells.length > 0 && cells.every((c) => /^:?-{3,}:?$/.test(c));

export function detectTableMode(raw: string): Exclude<TableMode, "auto"> {
  const lines = raw
    .replace(/^\uFEFF/, "")
    .trim()
    .split(/\r\n|\n|\r/);
  // A one-column CSV may legitimately contain a row whose value is "---".
  // Require a pipe in the header before treating a separator as Markdown syntax.
  if (
    lines[0]?.includes("|") &&
    lines.length > 1 &&
    separator(markdownCells(lines[1]))
  )
    return "markdown";
  // Only count delimiters outside quoted fields, so a CSV cell containing a tab
  // does not turn the entire file into TSV.
  let quoted = false,
    tabs = 0,
    commas = 0;
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '"') {
      if (quoted && raw[i + 1] === '"') i++;
      else quoted = !quoted;
    } else if (!quoted) {
      if (raw[i] === "\t") tabs++;
      if (raw[i] === ",") commas++;
    }
  }
  if (tabs) return "tsv";
  if (commas) return "csv";
  if (lines[0]?.includes("|")) return "markdown";
  return "csv";
}

function decodeMarkdown(cell: string) {
  // Decode once, after backslash escapes, so literal entity text roundtrips.
  return cell
    .replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\]\\^_`{|}~])/g, "$1")
    .replace(
      /&(?:#(\d+)|#x([\da-f]+)|amp|lt|gt|quot|apos);/gi,
      (entity, dec, hex) => {
        if (dec || hex) {
          const code = parseInt(dec || hex, dec ? 10 : 16);
          return code > 0 &&
            code <= 0x10ffff &&
            !(code >= 0xd800 && code <= 0xdfff)
            ? String.fromCodePoint(code)
            : entity;
        }
        return (
          (
            {
              "&amp;": "&",
              "&lt;": "<",
              "&gt;": ">",
              "&quot;": '"',
              "&apos;": "'",
            } as Record<string, string>
          )[entity.toLowerCase()] ?? entity
        );
      },
    );
}

export function parseTable(input: TableInput): TableReport {
  const raw = input.raw;
  const text = raw.replace(/^\uFEFF/, "");
  const mode = input.mode === "auto" ? detectTableMode(text) : input.mode;
  const issues: TableIssue[] = [];
  let grid: string[][] = [],
    parsedAlignments: Alignment[] = [];
  if (text.length > 2 * 1024 * 1024)
    issues.push({
      en: "Input exceeds 2 MB. Split the table into smaller files; raw input is retained.",
      zh: "内容超过 2 MB，请拆成较小的文件。原文已保留。",
      error: true,
    });
  else if (text.length) {
    if (mode === "markdown") {
      const lines = text.split(/\r\n|\n|\r/);
      while (lines.length && !lines[0].trim()) lines.shift();
      while (lines.length && !lines.at(-1)!.trim()) lines.pop();
      const divider = markdownCells(lines[1] ?? "");
      if (!separator(divider))
        issues.push({
          en: "Markdown needs a header followed by a separator row (for example | --- | :---: |). Correct the raw text or choose CSV / TSV.",
          zh: "Markdown 表头后需要分隔行（如 | --- | :---: |）。请修正原文，或选择 CSV / TSV。",
          error: true,
        });
      else
        parsedAlignments = divider.map((c) =>
          c.startsWith(":")
            ? c.endsWith(":")
              ? "center"
              : "left"
            : c.endsWith(":")
              ? "right"
              : "none",
        );
      // Even malformed lines stay in the diagnostic grid; never silently skip them.
      grid = lines
        .filter((_, i) => i !== 1 || !separator(divider))
        .map((line) => markdownCells(line).map(decodeMarkdown));
      if (
        separator(divider) &&
        grid.some((row) => row.length !== divider.length)
      )
        issues.push({
          en: "Markdown row widths differ from the separator. Escape cell pipes as \\| and keep every row; exports are blocked until corrected.",
          zh: "Markdown 行的列数与分隔行不同。单元格里的竖线应写成 \\|；请保留并修正每一行后再导出。",
          error: true,
        });
    } else grid = delimited(text, mode === "tsv" ? "\t" : ",", issues);
  }
  const width = grid.reduce((max, row) => Math.max(max, row.length), 0);
  if (grid.length > 10000 || width > 200) {
    issues.push({
      en: "Limit: 10,000 rows and 200 columns. Split the source before exporting.",
      zh: "最多支持 10,000 行、200 列，请先拆分源表格再导出。",
      error: true,
    });
    // Avoid padding a potentially huge hostile matrix. Raw text remains available.
  } else {
    if (grid.some((row) => row.length !== width))
      issues.push({
        en: "Uneven rows are padded with empty cells. No cell values were discarded.",
        zh: "列数不足的行已补空单元格，没有丢弃任何单元格内容。",
        error: false,
      });
    grid = grid.map((row) =>
      Array.from({ length: width }, (_, i) => {
        const value = row[i] ?? "";
        return input.trimCells ? value.trim() : value;
      }),
    );
  }
  if (!grid.length || !grid.some((row) => row.some((c) => c.length > 0)))
    issues.push({
      en: "Paste a table with at least one nonempty cell to enable exports.",
      zh: "请粘贴至少有一个非空单元格的表格，才能导出。",
      error: true,
    });
  if (grid.some((row) => row.some((c) => /[\r\n]/.test(c))))
    issues.push({
      en: "Multiline cells: Markdown export replaces line breaks with spaces. CSV and quoted TSV retain the original line breaks.",
      zh: "有单元格包含换行：Markdown 导出会把换行替换为空格，CSV 和带引号的 TSV 会保留原换行。",
      error: false,
    });
  return {
    raw,
    mode,
    grid,
    firstRowHeader: input.firstRowHeader,
    alignments: Array.from({ length: Math.min(width, 200) }, (_, i) =>
      validAlignments.includes(input.alignments[i])
        ? input.alignments[i]
        : (parsedAlignments[i] ?? "none"),
    ),
    issues,
    hasErrors: issues.some((i) => i.error),
  };
}

export function markdownCell(value: string) {
  return (
    value
      .replace(/\r\n|\r|\n/g, " ")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/([\\|*_`[\]~!])/g, "\\$1")
      // Edge whitespace is data, while the surrounding Markdown padding is syntax.
      .replace(/^\s+|\s+$/g, (space) =>
        Array.from(space)
          .map((c) => `&#${c.codePointAt(0)};`)
          .join(""),
      )
  );
}

export function tableHeaders(report: TableReport) {
  return report.firstRowHeader
    ? (report.grid[0] ?? [])
    : Array.from(
        { length: report.alignments.length },
        (_, i) => `Column ${i + 1}`,
      );
}

export function exportTable(report: TableReport, format: "md" | "tsv" | "csv") {
  if (report.hasErrors || !report.grid.length || !report.alignments.length)
    return "";
  if (format === "md") {
    const row = (cells: string[]) =>
      `| ${cells.map(markdownCell).join(" | ")} |`;
    const separators = {
      none: "---",
      left: ":---",
      center: ":---:",
      right: "---:",
    };
    return (
      [
        row(tableHeaders(report)),
        `| ${report.alignments.map((a) => separators[a]).join(" | ")} |`,
        ...report.grid.slice(report.firstRowHeader ? 1 : 0).map(row),
      ].join("\n") + "\n"
    );
  }
  const delimiter = format === "tsv" ? "\t" : ",";
  return (
    report.grid
      .map((row) =>
        row
          .map((c) =>
            c.includes(delimiter) || /["\r\n]/.test(c)
              ? `"${c.replace(/"/g, '""')}"`
              : c,
          )
          .join(delimiter),
      )
      .join("\r\n") + "\r\n"
  );
}
