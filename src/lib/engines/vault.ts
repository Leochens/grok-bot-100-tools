import { parseDocument, stringify } from "yaml";
export type VaultFile = { path: string; content: string };
export type VaultNote = VaultFile & {
  title: string;
  aliases: string[];
  tags: string[];
  fields: Record<string, unknown>;
  body: string;
  yaml: string;
  warnings: string[];
};
export type VaultLink = {
  source: string;
  target: string;
  resolved: string;
  status: "ok" | "missing" | "case" | "alias" | "ambiguous" | "anchor";
  kind: "wiki" | "markdown";
};
export function normalizeNotePath(path: string) {
  const parts: string[] = [];
  for (const p of path.replaceAll("\\", "/").split("/")) {
    if (p === "..") {
      if (!parts.length) throw new Error("path");
      parts.pop();
    } else if (p && p !== ".") parts.push(p);
  }
  return parts.join("/");
}
function list(value: unknown): string[] {
  return (
    Array.isArray(value)
      ? value
      : typeof value === "string"
        ? value.split(",")
        : []
  )
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean);
}
export function parseVaultNote(file: VaultFile): VaultNote {
  const path = normalizeNotePath(file.path),
    raw = file.content.replace(/^\uFEFF/, "");
  if (!path.toLowerCase().endsWith(".md")) throw new Error("markdown");
  const front = raw.match(/^---\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)(?:\r?\n|$)/);
  let fields: Record<string, unknown> = {},
    yaml = "",
    body = raw;
  const warnings: string[] = [];
  if (raw.startsWith("---\n") || raw.startsWith("---\r\n")) {
    if (!front) warnings.push("Unclosed YAML frontmatter");
  }
  if (front) {
    yaml = front[1];
    body = raw.slice(front[0].length);
    try {
      const doc = parseDocument(yaml, { uniqueKeys: true });
      if (doc.errors.length) throw new Error("yaml");
      const data: unknown = doc.toJS({ maxAliasCount: 20 });
      if (data !== null && (typeof data !== "object" || Array.isArray(data)))
        throw new Error("yaml");
      // Cyclic YAML aliases cannot be represented by downloadable JSON or safe editable metadata.
      JSON.stringify(data, (_, value) => {
        if (typeof value === "number" && !Number.isFinite(value))
          throw new Error("yaml");
        return value;
      });
      fields = (data as Record<string, unknown>) || {};
    } catch {
      warnings.push("Invalid YAML frontmatter");
    }
  }
  return {
    ...file,
    path,
    fields,
    yaml,
    body,
    title:
      typeof fields.title === "string"
        ? fields.title
        : path.split("/").pop()!.replace(/\.md$/i, ""),
    aliases: list(fields.aliases ?? fields.alias),
    tags: list(fields.tags ?? fields.tag),
    warnings,
  };
}
function prose(body: string) {
  // Mask code/comments without changing line numbers, so conversion can remove only actual fields.
  const mask = (value: string) => value.replace(/[^\n]/g, " ");
  return body
    .replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, mask)
    .replace(/<!--[\s\S]*?-->/g, mask)
    .replace(/`[^`\n]*`/g, mask);
}
export function dataviewFields(note: VaultNote) {
  const fields: Record<string, unknown> = {};
  for (const m of prose(note.body).matchAll(
    /^([\p{L}_][\p{L}\p{N}_ -]*)::\s*(.+)$/gmu,
  )) {
    const key = m[1].trim(),
      value = m[2].trim();
    const parsed = parseDocument(value);
    // Scalar/list values only; link syntax and objects stay literal text.
    let data: unknown = value;
    if (!parsed.errors.length && !value.includes("[[")) {
      try {
        const v = parsed.toJS({ maxAliasCount: 10 });
        JSON.stringify(v);
        if (
          v === null ||
          ["string", "number", "boolean"].includes(typeof v) ||
          Array.isArray(v)
        )
          data = v;
      } catch {}
    }
    fields[key] = data;
  }
  return fields;
}
export function convertFrontmatter(note: VaultNote) {
  if (note.warnings.length) throw new Error("yaml");
  const fields = dataviewFields(note),
    merged = { ...fields, ...note.fields };
  const visible = prose(note.body).split(/\r?\n/);
  const body = note.body
    .split(/\r?\n/)
    .filter(
      (_, i) =>
        !Object.keys(fields).some((key) => visible[i]?.startsWith(key + "::")),
    )
    .join("\n");
  return "---\n" + stringify(merged, { lineWidth: 0 }) + "---\n" + body;
}
export function auditVault(files: VaultFile[]) {
  if (files.length > 3000) throw new Error("limit");
  const notes = files.map(parseVaultNote),
    paths = new Set<string>();
  for (const n of notes) {
    if (paths.has(n.path)) throw new Error("duplicate");
    paths.add(n.path);
  }
  const links: VaultLink[] = [];
  for (const note of notes) {
    const text = prose(note.body),
      extracted: {
        target: string;
        kind: "wiki" | "markdown";
        index: number;
      }[] = [];
    for (const m of text.matchAll(/\[\[([^\]\n]+)\]\]/g))
      extracted.push({
        target: m[1].split("|")[0].trim(),
        kind: "wiki",
        index: m.index!,
      });
    for (const m of text.matchAll(
      /\[[^\]\n]*\]\(\s*(<[^>]+>|(?:[^\s()]|\([^)]*\))+)\s*(?:["'][^\n]*["'])?\s*\)/g,
    ))
      extracted.push({
        target: m[1].replace(/^<|>$/g, ""),
        kind: "markdown",
        index: m.index!,
      });
    for (const link of extracted.sort((a, b) => a.index - b.index)) {
      if (/^(?:[a-z][\w+.-]*:|\/\/)/i.test(link.target)) continue;
      let decoded: string;
      try {
        decoded = decodeURIComponent(link.target);
      } catch {
        decoded = link.target;
      }
      const [target, anchor] = decoded.split("#");
      if (target && /\.[a-z0-9]+$/i.test(target) && !/\.md$/i.test(target))
        continue;
      const rawPath = target.replace(/\.md$/i, ""),
        absolute = rawPath.startsWith("/");
      let path = "",
        relative = "";
      try {
        path = normalizeNotePath(rawPath);
      } catch {
        /* A parent-relative Markdown path may still resolve. */
      }
      try {
        relative = normalizeNotePath(
          note.path.split("/").slice(0, -1).concat(rawPath).join("/"),
        );
      } catch {
        /* Escapes vault root. */
      }
      const stem = (n: VaultNote) => n.path.replace(/\.md$/i, "");
      let candidates = !target ? [note] : ([] as VaultNote[]);
      // Markdown destinations resolve relative to their source folder first; wiki paths are vault-root paths.
      const lookupPaths =
        link.kind === "markdown" && !absolute ? [relative, path] : [path];
      for (const lookup of lookupPaths) {
        if (!candidates.length && lookup)
          candidates = notes.filter((n) => stem(n) === lookup);
      }
      let status: VaultLink["status"] = "ok";
      if (!candidates.length && path && !path.includes("/"))
        candidates = notes.filter((n) => stem(n).split("/").pop() === path);
      if (!candidates.length) {
        for (const lookup of lookupPaths) {
          if (!candidates.length && lookup)
            candidates = notes.filter(
              (n) => stem(n).toLowerCase() === lookup.toLowerCase(),
            );
        }
        if (!candidates.length && path && !path.includes("/"))
          candidates = notes.filter(
            (n) =>
              stem(n).split("/").pop()!.toLowerCase() === path.toLowerCase(),
          );
        status = "case";
      }
      if (!candidates.length && path) {
        candidates = notes.filter((n) =>
          n.aliases.some((a) => a.toLowerCase() === path.toLowerCase()),
        );
        status = "alias";
      }
      if (!candidates.length) status = "missing";
      else if (candidates.length > 1) status = "ambiguous";
      const resolved = candidates.length === 1 ? candidates[0].path : "";
      if (resolved && anchor && !anchor.startsWith("^")) {
        const headings = [
          ...prose(candidates[0].body).matchAll(/^#{1,6}\s+(.+)$/gm),
        ].map((m) => m[1].trim().toLowerCase());
        if (!headings.includes(anchor.toLowerCase())) status = "anchor";
      }
      links.push({ ...link, source: note.path, resolved, status });
    }
  }
  const missing: Record<string, string[]> = {};
  for (const l of links.filter((l) => l.status === "missing"))
    (missing[l.target] ??= []).push(l.source);
  const orphans = notes
    .filter(
      (n) => !links.some((l) => l.resolved === n.path && l.source !== n.path),
    )
    .map((n) => n.path);
  return { notes, links, missing, orphans };
}
export function vaultMarkdown(audit: ReturnType<typeof auditVault>) {
  const safe = (s: string) => s.replace(/[\n\r|]/g, " ");
  return (
    "# Vault link audit\n\n" +
    `Notes: ${audit.notes.length} · Links: ${audit.links.length}\n\n` +
    audit.links
      .filter((l) => l.status !== "ok")
      .map(
        (l) =>
          `- ${l.status}: ${safe(l.source)} → ${safe(l.target)}${l.resolved ? " → " + safe(l.resolved) : ""}`,
      )
      .join("\n") +
    "\n\n## Notes without incoming links\n" +
    audit.orphans.map((p) => "- " + safe(p)).join("\n") +
    "\n"
  );
}
export const VAULT_SAMPLE: VaultFile[] = [
  {
    path: "Home.md",
    content:
      "---\ntitle: Home\ntags: [index]\n---\n[[Projects/Workbench]]\n[[Missing plan]]\n[Materials](Materials.md)\n[[stock]]",
  },
  {
    path: "Projects/Workbench.md",
    content:
      "---\naliases:\n  - Bench\n---\n# Workbench\nStatus:: active\nCost:: 140\n[[Missing plan]]\n[[bench]]",
  },
  {
    path: "Materials.md",
    content: "---\naliases: [Stock]\n---\n# Materials\n[[Home]]",
  },
  { path: "Orphan.md", content: "# Loose note\nTags:: [workshop, idea]\n" },
];
