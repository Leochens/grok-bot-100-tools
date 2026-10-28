export type DeckIssue = {
  row: number;
  code:
    | "quote"
    | "columns"
    | "duplicate"
    | "cloze"
    | "delimiter"
    | "empty"
    | "encoding";
  detail: string;
};
export type DeckInspection = {
  rows: string[][];
  issues: DeckIssue[];
  delimiter: string;
  columns: number;
};
/** Strict RFC4180 scanner with physical line diagnostics; never guesses how to repair corrupted quoting. */
function scan(raw: string, delimiter: string) {
  const rows: string[][] = [],
    issues: DeckIssue[] = [];
  let row: string[] = [],
    field = "",
    quoted = false,
    closed = false,
    line = 1,
    start = 1;
  const finish = () => {
    row.push(field);
    if (row.some((x) => x.trim())) rows.push(row);
    row = [];
    field = "";
    closed = false;
    start = line + 1;
  };
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (quoted) {
      if (c === '"') {
        if (raw[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else {
        field += c;
        if (c === "\n") line++;
      }
    } else if (c === '"') {
      if (field || closed) {
        issues.push({
          row: rows.length + 1,
          code: "quote",
          detail: `Line ${line}: unescaped quote`,
        });
        field += c;
      } else quoted = true;
    } else if (c === delimiter) {
      row.push(field);
      field = "";
      closed = false;
    } else if (c === "\r" || c === "\n") {
      if (c === "\r" && raw[i + 1] === "\n") i++;
      finish();
      line++;
    } else {
      if (closed && !/\s/.test(c))
        issues.push({
          row: rows.length + 1,
          code: "quote",
          detail: `Line ${line}: text after closing quote`,
        });
      field += c;
    }
  }
  if (quoted)
    issues.push({
      row: rows.length + 1,
      code: "quote",
      detail: `Unclosed quoted cell starting near line ${start}`,
    });
  finish();
  return { rows, issues };
}
export function clozeErrors(text: string): string[] {
  const errors: string[] = [];
  // Match brace pairs so nested clozes remain balanced.
  const stack: { start: number; cloze: boolean; body: number }[] = [];
  for (let i = 0; i < text.length - 1; i++) {
    if (text.slice(i, i + 2) === "{{") {
      const tail = text.slice(i + 2),
        prefix = tail.match(/^c([1-9]\d*)::/);
      const cloze = /^c(?:\d|::|:)/i.test(tail);
      if (cloze && !prefix) errors.push("Invalid cloze index or separator");
      stack.push({ start: i, cloze, body: i + 2 + (prefix?.[0].length || 0) });
      i++;
    } else if (text.slice(i, i + 2) === "}}") {
      const open = stack.pop();
      if (!open) errors.push("Closing braces without opening braces");
      else if (
        open.cloze &&
        !text
          .slice(open.body, i)
          .split("::")[0]
          .replace(/<[^>]*>/g, "")
          .trim()
      )
        errors.push("Empty cloze");
      i++;
    }
  }
  if (stack.some((s) => s.cloze)) errors.push("Missing closing cloze braces");
  return [...new Set(errors)];
}
export function inspectDeck(raw: string, requested = "auto"): DeckInspection {
  let separatorHeader = "";
  let inQuotes = false;
  const text = raw
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => {
      if (!inQuotes && line.startsWith("#")) {
        if (line.startsWith("#separator:"))
          separatorHeader = line.slice(11).trim().toLowerCase();
        return false;
      }
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') {
          if (inQuotes && line[i + 1] === '"') i++;
          else inQuotes = !inQuotes;
        }
      }
      return true;
    })
    .join("\n");
  const candidates = ["\t", ",", ";"];
  const inferred = candidates
    .map((delimiter) => {
      const result = scan(text, delimiter),
        widths = result.rows.map((r) => r.length),
        expected = widths[0] || 0;
      return {
        delimiter,
        score:
          expected > 1
            ? (widths.filter((w) => w === expected).length /
                Math.max(1, widths.length)) *
                100 +
              Math.min(expected, 20) -
              result.issues.length
            : 0,
      };
    })
    .sort((a, b) => b.score - a.score)[0];
  const header = (
    { tab: "\t", comma: ",", semicolon: ";" } as Record<string, string>
  )[separatorHeader];
  const delimiter =
    requested === "auto" ? header || inferred.delimiter : requested;
  if (!candidates.includes(delimiter)) throw new Error("delimiter");
  const result = scan(text, delimiter),
    columns = result.rows[0]?.length || 0;
  if (result.rows.length > 100000 || result.rows.some((r) => r.length > 100))
    throw new Error("Maximum 100,000 notes and 100 fields");
  if (
    result.rows.length &&
    (columns === 1 ||
      (inferred.delimiter !== delimiter && inferred.score > 0 && columns === 1))
  )
    result.issues.push({
      row: 0,
      code: "delimiter",
      detail:
        "Only one column detected; check the selected separator (a single-field Cloze deck may be intentional).",
    });
  if (raw.includes("\uFFFD"))
    result.issues.push({
      row: 0,
      code: "encoding",
      detail: "Replacement character found; reopen the original file as UTF-8.",
    });
  result.rows.forEach((row, i) => {
    if (row.length !== columns)
      result.issues.push({
        row: i + 1,
        code: "columns",
        detail: `Expected ${columns} fields, found ${row.length}; possible orphan row or unquoted newline`,
      });
  });
  return {
    ...result,
    issues: [...result.issues, ...inspectDeckRows(result.rows)],
    delimiter,
    columns,
  };
}
export function firstFieldKey(text: string) {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .trim();
}
export function inspectDeckRows(rows: string[][]): DeckIssue[] {
  const issues: DeckIssue[] = [],
    seen = new Map<string, number>(),
    columns = rows[0]?.length || 0;
  rows.forEach((row, i) => {
    if (row.length !== columns)
      issues.push({
        row: i + 1,
        code: "columns",
        detail: `Expected ${columns} fields, found ${row.length}`,
      });
    const key = firstFieldKey(row[0] || "");
    if (!key)
      issues.push({ row: i + 1, code: "empty", detail: "Empty first field" });
    else if (seen.has(key))
      issues.push({
        row: i + 1,
        code: "duplicate",
        detail: `First field collides with row ${seen.get(key)}`,
      });
    else seen.set(key, i + 1);
    row.forEach((cell, j) =>
      clozeErrors(cell).forEach((detail) =>
        issues.push({
          row: i + 1,
          code: "cloze",
          detail: `Field ${j + 1}: ${detail}`,
        }),
      ),
    );
  });
  return issues;
}
export function deduplicateDeck(rows: string[][], keep: "first" | "last") {
  const seen = new Set<string>(),
    ordered = keep === "last" ? [...rows].reverse() : rows;
  const result = ordered.filter((row) => {
    const key = firstFieldKey(row[0] || "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return keep === "last" ? result.reverse() : result;
}
export function ankiTsv(rows: string[][]) {
  if (!rows.length || inspectDeckRows(rows).length) throw new Error("deck");
  const escape = (cell: string) =>
    '"' + cell.replace(/\r\n?|\n/g, "<br>").replaceAll('"', '""') + '"';
  return (
    "#separator:tab\n#html:true\n" +
    rows.map((r) => r.map(escape).join("\t")).join("\n") +
    "\n"
  );
}
export const ANKI_SAMPLE =
  'Front,Back,Tags\n"{{c1::Mitochondria}} make ATP",Cell biology,biology\n"{{c1::Mitochondria}} make ATP",Duplicate note,biology\n"{{c2::}} is empty",Fix this deletion,review\n"Quoted question","A multiline\nanswer",example';
