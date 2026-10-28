export type Chapter = { start: number; title: string; end?: number };
export const CHAPTER_SAMPLE =
  "00:00 Introduction\n00:32 The first chapter\n02:10 A new direction\n04:45 Closing thoughts";
export function parseTime(value: string): number {
  const v = value.trim();
  if (!/^\d+(?::\d{1,2}){0,2}(?:\.\d{1,3})?$/.test(v)) throw new Error("time");
  const p = v.split(":").map(Number);
  if (p.slice(1).some((n) => n >= 60)) throw new Error("time");
  const result = p.reduce((a, n) => a * 60 + n, 0);
  if (!Number.isFinite(result)) throw new Error("time");
  return result;
}
export function formatTime(n: number, fractional = true): string {
  const ms = Math.round(n * 1000),
    sec = Math.floor(ms / 1000);
  const base =
    sec >= 3600
      ? `${Math.floor(sec / 3600)}:${String(Math.floor(sec / 60) % 60).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`
      : `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
  return (
    base +
    (fractional && ms % 1000 ? `.${String(ms % 1000).padStart(3, "0")}` : "")
  );
}
function unescapeMeta(s: string) {
  return s.replace(/\\([\\=;#\n])/g, "$1");
}
function escapeMeta(s: string) {
  return s.replace(/([\\=;#\n])/g, "\\$1");
}
export function parseChapters(raw: string): Chapter[] {
  const input = raw.replace(/^\uFEFF/, "").trim();
  if (!input) return [];
  if (/^[\[{]/.test(input)) {
    const parsed = JSON.parse(input);
    const list = Array.isArray(parsed) ? parsed : parsed.chapters;
    if (!Array.isArray(list)) throw new Error("json");
    return list.map((c: Record<string, unknown>) => {
      if (c.start === undefined && c.start_time === undefined)
        throw new Error("time");
      const start = c.start ?? c.start_time;
      const n = typeof start === "number" ? start : parseTime(String(start));
      if (!Number.isFinite(n) || n < 0 || typeof c.title !== "string")
        throw new Error("json");
      return {
        start: n,
        title: c.title,
        ...(c.end !== undefined || c.end_time !== undefined
          ? { end: Number(c.end ?? c.end_time) }
          : {}),
      };
    });
  }
  if (input.startsWith(";FFMETADATA1")) {
    const blocks = input
      .replace(/\\\r?\n/g, "\u0000")
      .split(/\r?\n\[CHAPTER\]\s*\r?\n/)
      .slice(1);
    if (!blocks.length) throw new Error("metadata");
    return blocks.map((block) => {
      const values: Record<string, string> = {};
      for (const line of block.split(/\r?\n/)) {
        if (line.startsWith("[")) break;
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match)
          values[match[1].trim()] = unescapeMeta(
            match[2].replace(/\u0000/g, "\n"),
          );
      }
      const fraction = (values.TIMEBASE ?? "1/1000").match(/^(\d+)\/(\d+)$/);
      if (
        !fraction ||
        !Number(fraction[1]) ||
        !Number(fraction[2]) ||
        values.START === undefined ||
        values.END === undefined ||
        values.title === undefined
      )
        throw new Error("metadata");
      const base = Number(fraction[1]) / Number(fraction[2]);
      const start = Number(values.START) * base,
        end = Number(values.END) * base;
      if (
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        start < 0 ||
        end <= start
      )
        throw new Error("metadata");
      return { start, end, title: values.title };
    });
  }
  return input
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((line) => {
      const match = line
        .trim()
        .match(/^(\d+:\d{2}(?::\d{2})?(?:\.\d{1,3})?)\s+(?:[-–—]\s*)?(.+)$/);
      if (!match) throw new Error("list");
      return { start: parseTime(match[1]), title: match[2] };
    });
}
export function shiftChapters(
  chapters: Chapter[],
  from: number,
  delta: number,
  breathing: number,
  keepZero: boolean,
): Chapter[] {
  if (
    ![from, delta, breathing].every(Number.isFinite) ||
    from < 1 ||
    !Number.isInteger(from) ||
    from > chapters.length
  )
    throw new Error("shift");
  const next = chapters.map((c, i) => {
    const change =
      (i >= from - 1 ? delta : 0) + (keepZero && i === 0 ? 0 : breathing);
    return {
      ...c,
      start: Math.round((c.start + change) * 1000) / 1000,
      end:
        c.end === undefined
          ? undefined
          : Math.round((c.end + change) * 1000) / 1000,
    };
  });
  if (next.some((c) => c.start < 0)) throw new Error("negative");
  return next;
}
export type ChapterIssue = {
  code:
    | "first"
    | "count"
    | "order"
    | "short"
    | "duration"
    | "title"
    | "end"
    | "unknownEnd";
  index?: number;
};
export function validateChapters(
  chapters: Chapter[],
  duration: number,
): ChapterIssue[] {
  if (!chapters.length) return [];
  const issues: ChapterIssue[] = [];
  if (chapters[0].start !== 0) issues.push({ code: "first" });
  if (chapters.length < 3) issues.push({ code: "count" });
  if (!Number.isFinite(duration) || duration <= 0)
    issues.push({ code: "unknownEnd" });
  chapters.forEach((c, i) => {
    if (
      !Number.isFinite(c.start) ||
      c.start < 0 ||
      (i > 0 && c.start <= chapters[i - 1].start)
    )
      issues.push({ code: "order", index: i });
    if (!c.title.trim() || /[\r\n]/.test(c.title))
      issues.push({ code: "title", index: i });
    const end = chapters[i + 1]?.start ?? (duration > 0 ? duration : c.end);
    if (end !== undefined && end - c.start < 10)
      issues.push({ code: "short", index: i });
    if (duration > 0 && c.start >= duration)
      issues.push({ code: "duration", index: i });
    if (c.end !== undefined && (!Number.isFinite(c.end) || c.end <= c.start))
      issues.push({ code: "end", index: i });
  });
  return issues;
}
export function exportChapters(
  chapters: Chapter[],
  duration: number,
  format: "youtube" | "json" | "ffmetadata",
) {
  if (format === "youtube")
    return (
      chapters
        .map((c) => `${formatTime(Math.floor(c.start), false)} ${c.title}`)
        .join("\n") + "\n"
    );
  if (format === "json")
    return JSON.stringify(
      {
        version: "1.2.0",
        chapters: chapters.map((c) => ({ start: c.start, title: c.title })),
      },
      null,
      2,
    );
  return (
    ";FFMETADATA1\n" +
    chapters
      .map((c, i) => {
        const end = chapters[i + 1]?.start ?? (duration > 0 ? duration : c.end);
        if (end === undefined || end <= c.start) throw new Error("duration");
        return `[CHAPTER]\nTIMEBASE=1/1000\nSTART=${Math.round(c.start * 1000)}\nEND=${Math.round(end * 1000)}\ntitle=${escapeMeta(c.title)}\n`;
      })
      .join("")
  );
}
