/** Local BibTeX scanner. Source spans make preservation independent of serialization. */
export type BibField = {
  name: string;
  value: string;
  start: number;
  end: number;
};
export type BibEntry = {
  index: number;
  type: string;
  key: string;
  fields: BibField[];
  start: number;
  end: number;
  raw: string;
};
export type BibIssue = {
  error: boolean;
  en: string;
  zh: string;
  entry?: number;
};
export type BibCluster = {
  id: string;
  entries: number[];
  reasons: string[];
  primary: number;
};
export type BibRemap = {
  dropped_key: string;
  kept_key: string;
  reason: string;
};
export const BIBTEX_DEFAULT = {
  raw: "",
  wrapAcronyms: false,
  selections: [] as { cluster: string; primary: number }[],
  previewRows: 100,
};
export const BIBTEX_SAMPLE = `@string{neurips = "Advances in Neural Information Processing Systems"}
@preamble{"Shared bibliography"}
@comment{Co-author merge: review before submission.}
@inproceedings{vaswani2017,
  title = {Attention Is All You Need},
  author = {Vaswani, Ashish and Shazeer, Noam},
  year = {2017},
  booktitle = neurips,
  doi = {10.5555/3295222.3295349}
}
@misc{attention2017,
  title = "Attention Is All You Need",
  year = 2017,
  doi = {https://doi.org/10.5555/3295222.3295349}
}
@article{sequence2020,
  title = {LSTM Models on GPU with {COVID} Data},
  author = {Chen, Li},
  year = {2020}
}
@article{sequence2020,
  title = {LSTM Models on GPU with {COVID} Data},
  year = {2020}
}
`;

// Skip a TeX escape as one unit, so escaped braces never affect nesting.
function balanced(raw: string, start: number, quote = false): number {
  let depth = quote ? 0 : 1;
  for (let i = start + 1; i < raw.length; i++) {
    const c = raw[i];
    if (c === "\\") {
      i++;
      continue;
    }
    if (quote && c === '"' && depth === 0) return i + 1;
    if (c === "{") depth++;
    if (c === "}") {
      if (quote && depth === 0) return -1;
      if (--depth === 0 && !quote) return i + 1;
    }
  }
  return -1;
}
function skip(raw: string, pos: number): number {
  while (pos < raw.length) {
    if (/\s/.test(raw[pos])) pos++;
    else if (raw[pos] === "%") {
      const end = raw.indexOf("\n", pos);
      pos = end < 0 ? raw.length : end + 1;
    } else break;
  }
  return pos;
}
function expression(raw: string, start: number): number {
  let pos = skip(raw, start);
  while (pos < raw.length) {
    const c = raw[pos];
    if (c === "{" || c === '"') {
      pos = balanced(raw, pos, c === '"');
      if (pos < 0) return -1;
    } else {
      const token = /^(?:\d+|[A-Za-z][A-Za-z0-9_:.-]*)/.exec(raw.slice(pos));
      if (!token) return -1;
      pos += token[0].length;
    }
    const next = skip(raw, pos);
    if (raw[next] !== "#") return pos;
    pos = skip(raw, next + 1);
  }
  return -1;
}
export function parseBibtex(raw: string) {
  const entries: BibEntry[] = [];
  const blocks: { type: string; raw: string; start: number; end: number }[] =
    [];
  const issues: BibIssue[] = [];
  const error = (en: string, zh: string) =>
    issues.push({ error: true, en, zh });
  if (new TextEncoder().encode(raw).length > 2 * 1024 * 1024) {
    error(
      "Input exceeds 2 MB. Split the bibliography before auditing.",
      "内容超过 2 MB，请拆分文献库后再检查。",
    );
    return { raw, entries, blocks, issues, hasErrors: true };
  }
  let pos = 0;
  while (pos < raw.length) {
    pos = skip(raw, pos);
    if (pos >= raw.length) break;
    // BibTeX treats text outside @ blocks as commentary; preserve it unchanged.
    if (raw[pos] !== "@") {
      pos++;
      continue;
    }
    const start = pos;
    const header = /^@([A-Za-z]+)\s*([{(])/.exec(raw.slice(pos));
    if (!header) {
      error(
        `Invalid @ block at character ${pos + 1}.`,
        `第 ${pos + 1} 个字符处的 @ 块格式不正确。`,
      );
      pos++;
      continue;
    }
    const type = header[1].toLowerCase();
    const close = header[2] === "{" ? "}" : ")";
    pos += header[0].length;
    if (type === "comment") {
      let end: number;
      if (close === "}") end = balanced(raw, pos - 1);
      else {
        let depth = 1;
        end = -1;
        for (let i = pos; i < raw.length; i++) {
          if (raw[i] === "\\") {
            i++;
            continue;
          }
          if (raw[i] === "(") depth++;
          if (raw[i] === ")" && --depth === 0) {
            end = i + 1;
            break;
          }
        }
      }
      if (end < 0) {
        error("Unclosed @comment block.", "@comment 块未闭合。");
        break;
      }
      blocks.push({ type, raw: raw.slice(start, end), start, end });
      pos = end;
      continue;
    }
    pos = skip(raw, pos);
    let key = "";
    const fields: BibField[] = [];
    let valid = true;
    if (type !== "string" && type !== "preamble") {
      const match = /^[^\s,{}()=\\#%"]+/.exec(raw.slice(pos));
      if (!match) valid = false;
      else {
        key = match[0];
        pos = skip(raw, pos + key.length);
      }
      if (raw[pos] === ",") pos++;
      else if (raw[pos] !== close) valid = false;
    }
    if (type === "preamble") {
      const end = expression(raw, pos);
      if (end < 0) valid = false;
      else pos = skip(raw, end);
      if (raw[pos] === ",") pos = skip(raw, pos + 1);
    } else {
      while (valid) {
        pos = skip(raw, pos);
        if (raw[pos] === close) break;
        const name = /^[A-Za-z][A-Za-z0-9_:-]*/.exec(raw.slice(pos));
        if (!name) {
          valid = false;
          break;
        }
        pos = skip(raw, pos + name[0].length);
        if (raw[pos] !== "=") {
          valid = false;
          break;
        }
        const valueStart = skip(raw, pos + 1);
        const end = expression(raw, valueStart);
        if (end < 0) {
          valid = false;
          break;
        }
        const fieldName = name[0].toLowerCase();
        if (fields.some((f) => f.name === fieldName)) {
          valid = false;
          break;
        }
        fields.push({
          name: fieldName,
          value: raw.slice(valueStart, end),
          start: valueStart,
          end,
        });
        pos = skip(raw, end);
        if (raw[pos] === ",") pos++;
        else if (raw[pos] !== close) {
          valid = false;
          break;
        }
        if (type === "string") break;
      }
      pos = skip(raw, pos);
    }
    if (
      !valid ||
      raw[pos] !== close ||
      (type === "string" && fields.length !== 1)
    ) {
      error(
        `Malformed or unclosed @${type} block at character ${start + 1}; check commas, values and braces. Duplicate fields must be resolved.`,
        `第 ${start + 1} 个字符处的 @${type} 块有误或未闭合，请检查逗号、字段值、花括号和重复字段。`,
      );
      // Recovery is diagnostic only; exports stay blocked and raw remains intact.
      const next = raw.indexOf("@", Math.max(pos, start + 1));
      if (next < 0) break;
      pos = next;
      continue;
    }
    const end = ++pos;
    if (type === "string" || type === "preamble")
      blocks.push({ type, raw: raw.slice(start, end), start, end });
    else
      entries.push({
        index: entries.length,
        type,
        key,
        fields,
        start,
        end,
        raw: raw.slice(start, end),
      });
    if (entries.length > 10000) {
      error("Limit: 10,000 entries.", "最多支持 10,000 条文献。");
      break;
    }
  }
  return {
    raw,
    entries,
    blocks,
    issues,
    hasErrors: issues.some((i) => i.error),
  };
}

/** Literal-only evaluation: unresolved macros never become matching fingerprints. */
export function bibLiteral(value: string): string | undefined {
  const pieces: string[] = [];
  let pos = 0;
  while ((pos = skip(value, pos)) < value.length) {
    const c = value[pos];
    if (c === "{" || c === '"') {
      const end = balanced(value, pos, c === '"');
      if (end < 0) return undefined;
      pieces.push(value.slice(pos + 1, end - 1));
      pos = end;
    } else {
      const num = /^\d+/.exec(value.slice(pos));
      if (!num) return undefined;
      pieces.push(num[0]);
      pos += num[0].length;
    }
    pos = skip(value, pos);
    if (pos < value.length && value[pos++] !== "#") return undefined;
  }
  return pieces.join("");
}
export function normalizeDoi(value: string): string {
  const plain = value
    .trim()
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "")
    .replace(/^doi\s*:\s*/i, "")
    .toLowerCase();
  return /^10\.\d{4,9}\/\S+$/.test(plain) ? plain : "";
}
function titleFingerprint(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}
export function titleAcronyms(
  value: string,
): { start: number; end: number; token: string }[] {
  const spans: { start: number; end: number; token: string }[] = [];
  // Only literal value components can be edited; the outer braces are delimiters.
  let pos = 0;
  while (pos < value.length) {
    pos = skip(value, pos);
    const c = value[pos];
    if (c !== "{" && c !== '"') {
      const next = value.indexOf("#", pos);
      if (next < 0) break;
      pos = next + 1;
      continue;
    }
    const end = balanced(value, pos, c === '"');
    if (end < 0) break;
    let depth = 0;
    for (let i = pos + 1; i < end - 1; i++) {
      const ch = value[i];
      if (ch === "\\") {
        const command = /^\\(?:[A-Za-z]+|.)/.exec(value.slice(i));
        i += (command?.[0].length ?? 2) - 1;
        continue;
      }
      if (ch === "{") {
        depth++;
        continue;
      }
      if (ch === "}") {
        depth--;
        continue;
      }
      if (
        /[A-Za-z0-9]/.test(ch) &&
        (i === pos + 1 || !/[A-Za-z0-9]/.test(value[i - 1]))
      ) {
        const token = /^[A-Za-z0-9]+/.exec(value.slice(i))![0];
        if (
          (depth === 0 &&
            /^(?:[A-Z0-9]*[A-Z][A-Z0-9]*)$/.test(token) &&
            (token.match(/[A-Z]/g)?.length ?? 0) >= 2) ||
          (depth === 0 && /^\d+[A-Z]+$/.test(token))
        )
          spans.push({ start: i, end: i + token.length, token });
        i += token.length - 1;
      }
    }
    pos = end;
    pos = skip(value, pos);
    if (value[pos] === "#") pos++;
  }
  return spans;
}
export function braceAcronyms(value: string): string {
  let result = value;
  for (const span of titleAcronyms(value).reverse())
    result =
      result.slice(0, span.start) +
      "{" +
      span.token +
      "}" +
      result.slice(span.end);
  return result;
}
export function auditBibtex(
  raw: string,
  options: {
    wrapAcronyms?: boolean;
    selections?: { cluster: string; primary: number }[];
  } = {},
) {
  const parsed = parseBibtex(raw);
  const { entries } = parsed;
  const issues = [...parsed.issues];
  const parent = entries.map((_, i) => i);
  function root(i: number): number {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  }
  const edges: { a: number; b: number; reason: string }[] = [];
  const maps = {
    key: new Map<string, number>(),
    doi: new Map<string, number>(),
    "title+year": new Map<string, number>(),
  };
  const cases = new Map<string, BibEntry>();
  const acronyms: { entry: number; field: string; tokens: string[] }[] = [];
  for (const entry of entries) {
    const literal = (name: string) =>
      bibLiteral(entry.fields.find((f) => f.name === name)?.value ?? "");
    const doi = normalizeDoi(literal("doi") ?? "");
    const title = literal("title");
    const year = (literal("year") ?? "").trim();
    const fingerprints = {
      key: entry.key,
      doi,
      "title+year":
        title && /^\d{4}$/.test(year) && titleFingerprint(title)
          ? `${titleFingerprint(title)}:${year}`
          : "",
    };
    for (const reason of ["key", "doi", "title+year"] as const) {
      const fingerprint = fingerprints[reason];
      if (!fingerprint) continue;
      const other = maps[reason].get(fingerprint);
      if (other !== undefined) {
        parent[root(entry.index)] = root(other);
        edges.push({ a: other, b: entry.index, reason });
      } else maps[reason].set(fingerprint, entry.index);
    }
    const previous = cases.get(entry.key.toLowerCase());
    if (previous && previous.key !== entry.key)
      issues.push({
        error: false,
        entry: entry.index,
        en: `Citation keys differ only by case: ${previous.key} / ${entry.key}. They remain distinct unless another match joins them.`,
        zh: `引用键仅大小写不同：${previous.key} / ${entry.key}。若无其他匹配，仍分别保留。`,
      });
    else cases.set(entry.key.toLowerCase(), entry);
    if (
      ["article", "inproceedings"].includes(entry.type) &&
      !entry.fields.some(
        (f) =>
          f.name === "doi" &&
          (bibLiteral(f.value)?.trim() || bibLiteral(f.value) === undefined),
      )
    )
      issues.push({
        error: false,
        entry: entry.index,
        en: `${entry.key}: missing DOI.`,
        zh: `${entry.key}：缺少 DOI。`,
      });
    for (const field of entry.fields.filter((f) =>
      ["title", "booktitle"].includes(f.name),
    )) {
      const tokens = titleAcronyms(field.value).map((a) => a.token);
      if (tokens.length) {
        acronyms.push({ entry: entry.index, field: field.name, tokens });
        issues.push({
          error: false,
          entry: entry.index,
          en: `${entry.key}: unbraced acronyms in ${field.name}: ${tokens.join(", ")}.`,
          zh: `${entry.key}：${field.name} 中的缩写未加花括号：${tokens.join("、")}。`,
        });
      }
    }
  }
  const groups = new Map<number, number[]>();
  for (const e of entries) {
    const r = root(e.index);
    groups.set(r, [...(groups.get(r) ?? []), e.index]);
  }
  const clusters: BibCluster[] = [...groups.values()]
    .filter((g) => g.length > 1)
    .map((members) => {
      const id = members.join("-");
      const selected = options.selections?.find(
        (s) => s.cluster === id,
      )?.primary;
      const score = (i: number) =>
        entries[i].fields.filter(
          (f) =>
            bibLiteral(f.value)?.trim() || bibLiteral(f.value) === undefined,
        ).length;
      const primary =
        selected !== undefined && members.includes(selected)
          ? selected
          : members.reduce((a, b) => (score(b) > score(a) ? b : a));
      return {
        id,
        entries: members,
        primary,
        reasons: [
          ...new Set(
            edges
              .filter((e) => root(e.a) === root(members[0]))
              .map((e) => e.reason),
          ),
        ],
      };
    });
  const dropped = new Set<number>();
  const remap: BibRemap[] = [];
  for (const cluster of clusters)
    for (const index of cluster.entries)
      if (index !== cluster.primary) {
        dropped.add(index);
        remap.push({
          dropped_key: entries[index].key,
          kept_key: entries[cluster.primary].key,
          reason: cluster.reasons.join(" + "),
        });
      }
  const output: string[] = [];
  let cursor = 0;
  for (const entry of entries) {
    output.push(raw.slice(cursor, entry.start));
    let text = entry.raw;
    if (dropped.has(entry.index)) text = "";
    else if (options.wrapAcronyms)
      for (const field of [...entry.fields].reverse())
        if (["title", "booktitle"].includes(field.name))
          text =
            text.slice(0, field.start - entry.start) +
            braceAcronyms(field.value) +
            text.slice(field.end - entry.start);
    output.push(text);
    cursor = entry.end;
  }
  output.push(raw.slice(cursor));
  const merged = output.join("");
  return {
    ...parsed,
    issues,
    clusters,
    acronyms,
    remap,
    keptCount: entries.length - dropped.size,
    merged: parsed.hasErrors || !entries.length ? "" : merged,
    canExport: !parsed.hasErrors && entries.length > 0,
    wrapAcronyms: !!options.wrapAcronyms,
  };
}
export function remapCsv(remap: BibRemap[]): string {
  const cell = (value: string) => `"${value.replaceAll('"', '""')}"`;
  return (
    "dropped_key,kept_key,reason\r\n" +
    remap
      .map((r) => [r.dropped_key, r.kept_key, r.reason].map(cell).join(","))
      .join("\r\n")
  );
}
