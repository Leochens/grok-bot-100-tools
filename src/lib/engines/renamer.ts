export type PhotoFile = { name: string; timestamp: number };
export type RenameRow = PhotoFile & { target: string; issues: string[] };
export function parsePhotoList(raw: string): PhotoFile[] {
  return raw
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((line) => {
      const [name, timestamp, ...extra] = line.split("\t");
      if (!name || !timestamp || extra.length) throw new Error("metadata");
      const ms = /^\d+$/.test(timestamp)
        ? Number(timestamp)
        : Date.parse(timestamp);
      if (!Number.isFinite(ms) || Number.isNaN(new Date(ms).getTime()))
        throw new Error("timestamp");
      return { name, timestamp: ms };
    });
}
export function unsafeFilename(name: string) {
  return (
    !name ||
    /[<>:"/\\|?*\x00-\x1f\x7f]/.test(name) ||
    /[. ]$/.test(name) ||
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name) ||
    new TextEncoder().encode(name).length > 255 ||
    name === "." ||
    name === ".."
  );
}
export function planRenames(
  files: PhotoFile[],
  pattern: string,
  event: string,
  start = 1,
  sort = false,
): RenameRow[] {
  if (
    !Number.isSafeInteger(start) ||
    start < 0 ||
    start + files.length > 999999999 ||
    !pattern ||
    /\{(?!event\}|date\}|seq(?::0?[1-9]\d?d)?\}|name\}|ext\})/.test(pattern) ||
    pattern
      .replace(/\{(?:event|date|seq(?::0?[1-9]\d?d)?|name|ext)\}/g, "")
      .includes("}")
  )
    throw new Error("pattern");
  const ordered = sort
    ? [...files].sort(
        (a, b) => a.timestamp - b.timestamp || a.name.localeCompare(b.name),
      )
    : files;
  const sourceNames = new Set(
    files.map((f) => f.name.normalize("NFC").toLowerCase()),
  );
  const seenSource = new Set<string>();
  const rows = ordered.map((f, i) => {
    if (
      !Number.isFinite(f.timestamp) ||
      Number.isNaN(new Date(f.timestamp).getTime())
    )
      throw new Error("timestamp");
    const dot = f.name.lastIndexOf("."),
      base = dot > 0 ? f.name.slice(0, dot) : f.name,
      ext = dot > 0 ? f.name.slice(dot + 1) : "";
    let target = pattern.replace(
      /\{(event|date|name|ext|seq(?::0?([1-9]\d?)d)?)\}/g,
      (_, token: string, width: string) => {
        if (token === "event") return event;
        if (token === "date")
          return new Date(f.timestamp)
            .toISOString()
            .slice(0, 10)
            .replaceAll("-", "");
        if (token === "name") return base;
        if (token === "ext") return ext;
        return String(start + i).padStart(
          Math.min(99, Number(width) || 1),
          "0",
        );
      },
    );
    if (!pattern.includes("{ext}") && ext) target += "." + ext;
    const issues: string[] = [];
    if (unsafeFilename(f.name) || unsafeFilename(target))
      issues.push("illegal");
    if (seenSource.has(f.name.normalize("NFC").toLowerCase()))
      issues.push("duplicate-source");
    seenSource.add(f.name.normalize("NFC").toLowerCase());
    if (i && f.timestamp < ordered[i - 1].timestamp)
      issues.push("timestamp-order");
    if (
      target.normalize("NFC").toLowerCase() !==
        f.name.normalize("NFC").toLowerCase() &&
      sourceNames.has(target.normalize("NFC").toLowerCase())
    )
      issues.push("occupied");
    if (
      target.normalize("NFC").toLowerCase() ===
        f.name.normalize("NFC").toLowerCase() &&
      target !== f.name
    )
      issues.push("case-only");
    return { ...f, target, issues };
  });
  const counts = new Map<string, number>();
  rows.forEach((r) =>
    counts.set(
      r.target.normalize("NFC").toLowerCase(),
      (counts.get(r.target.normalize("NFC").toLowerCase()) || 0) + 1,
    ),
  );
  rows.forEach((r) => {
    if (counts.get(r.target.normalize("NFC").toLowerCase())! > 1)
      r.issues.push("collision");
  });
  return rows;
}
const bashQuote = (s: string) => "'" + s.replaceAll("'", "'\"'\"'") + "'";
const psQuote = (s: string) => "'" + s.replaceAll("'", "''") + "'";
export function renameScript(
  rows: RenameRow[],
  shell: "bash" | "powershell",
  undo = false,
) {
  if (
    !rows.length ||
    rows.some((r) => unsafeFilename(r.name) || unsafeFilename(r.target)) ||
    rows.some((r) => r.issues.some((i) => i !== "timestamp-order"))
  )
    throw new Error("unsafe-plan");
  const ops = (undo ? [...rows].reverse() : rows)
    .filter((r) => r.name !== r.target)
    .map((r) => ({
      from: undo ? r.target : r.name,
      to: undo ? r.name : r.target,
    }));
  if (shell === "bash")
    return (
      "#!/usr/bin/env bash\nset -euo pipefail\n# Run from the source folder. Preflight every path before any move.\n" +
      ops
        .map(
          (o) =>
            `[[ -f ${bashQuote("./" + o.from)} && ! -e ${bashQuote("./" + o.to)} && ! -L ${bashQuote("./" + o.to)} ]] || { printf '%s\\n' 'Missing source or occupied destination'; exit 1; }`,
        )
        .join("\n") +
      "\n" +
      ops
        .map(
          (o) =>
            `mv -n -- ${bashQuote("./" + o.from)} ${bashQuote("./" + o.to)}\n[[ ! -e ${bashQuote("./" + o.from)} ]] || exit 1`,
        )
        .join("\n") +
      "\n"
    );
  return (
    "# Run from the source folder.\n$ErrorActionPreference = 'Stop'\n" +
    ops
      .map(
        (o) =>
          `if (!(Test-Path -LiteralPath ${psQuote("./" + o.from)} -PathType Leaf) -or (Test-Path -LiteralPath ${psQuote("./" + o.to)})) { throw 'Missing source or occupied destination' }`,
      )
      .join("\n") +
    "\n" +
    ops
      .map(
        (o) =>
          `Rename-Item -LiteralPath ${psQuote("./" + o.from)} -NewName ${psQuote(o.to)} -ErrorAction Stop`,
      )
      .join("\n") +
    "\n"
  );
}
export const PHOTO_SAMPLE =
  "IMG_9012.JPG\t2026-10-20T09:30:00Z\nIMG_9011.JPG\t2026-10-20T09:29:00Z\nIMG_9013.JPG\t2026-10-20T09:31:00Z";
