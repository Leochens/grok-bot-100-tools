export type Cue = { id: string; start: string; end: string; text: string };
export type ParseResult = { cues: Cue[]; errors: string[] };
export type Standard = { cps: number; cpl: number };
export const PRESETS = {
  netflix: { name: "Netflix · conservative", cps: 17, cpl: 42 },
  bbc: { name: "BBC-style · conservative", cps: 15, cpl: 37 },
  custom: { name: "Custom standard", cps: 17, cpl: 42 },
} as const;

export function timestampSeconds(value: string): number | null {
  const match = value.trim().match(/^(\d{2,}):([0-5]\d):([0-5]\d)[,.](\d{3})$/);
  if (!match) return null;
  return (
    Number(match[1]) * 3600 +
    Number(match[2]) * 60 +
    Number(match[3]) +
    Number(match[4]) / 1000
  );
}

export function parseSrt(raw: string): ParseResult {
  const input = raw
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .replace(/^\n+|\n+$/g, "");
  if (!input.trim()) return { cues: [], errors: [] };
  const cues: Cue[] = [];
  const errors: string[] = [];
  input.split(/\n[\t ]*\n+/).forEach((block, i) => {
    const lines = block.split("\n");
    const hasId = /^\d+$/.test(lines[0].trim());
    const timingIndex = hasId ? 1 : 0;
    const timing = lines[timingIndex]?.split(/\s*-->\s*/);
    if (!timing || timing.length !== 2) {
      errors.push(
        `Block ${i + 1}: missing or malformed timing line. Expected HH:MM:SS,mmm --> HH:MM:SS,mmm.`,
      );
      return;
    }
    cues.push({
      id: hasId ? lines[0].trim() : String(i + 1),
      start: timing[0].trim(),
      end: timing[1].trim(),
      text: lines.slice(timingIndex + 1).join("\n"),
    });
  });
  return { cues, errors };
}

export function visibleText(text: string): string {
  return text.replace(/<[^>]*>/g, "").replace(/\{\\[^}]*\}/g, "");
}
export const characterCount = (text: string) =>
  Array.from(visibleText(text)).length;

export function inspectCue(cue: Cue, standard: Standard, previous?: Cue) {
  const start = timestampSeconds(cue.start);
  const end = timestampSeconds(cue.end);
  const validTiming = start !== null && end !== null && end > start;
  const duration = validTiming ? end - start : 0;
  const lines = cue.text.split("\n");
  const chars = characterCount(lines.join(" "));
  const cps = validTiming ? chars / duration : null;
  const maxLine = Math.max(0, ...lines.map(characterCount));
  const previousEnd = previous ? timestampSeconds(previous.end) : null;
  const issues: string[] = [];
  if (!validTiming) issues.push("Invalid timing");
  if (validTiming && previousEnd !== null && start < previousEnd)
    issues.push("Overlapping cues");
  if (cps !== null && cps > standard.cps) issues.push("Reading speed");
  if (maxLine > standard.cpl) issues.push("Line too long");
  if (lines.length > 2) issues.push("More than 2 lines");
  if (!visibleText(cue.text).trim()) issues.push("Empty text");
  else if (lines.some((line) => !visibleText(line).trim()))
    issues.push("Empty subtitle line");
  return {
    duration,
    chars,
    cps,
    maxLine,
    lines: lines.length,
    issues,
    validTiming,
  };
}

export function autoWrap(text: string, maxLength: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (characterCount(clean) <= maxLength) return clean;
  // Count once, then score safe word boundaries in linear time.
  const total = characterCount(clean);
  let count = 0;
  let bestIndex = -1;
  let bestScore = Infinity;
  const tokens = clean.matchAll(/<[^>]*>|\{\\[^}]*\}|[\s\S]/gu);
  for (const match of tokens) {
    const token = match[0];
    if (
      (token.startsWith("<") && token.endsWith(">")) ||
      (token.startsWith("{\\") && token.endsWith("}"))
    )
      continue;
    if (token === " ") {
      const index = match.index;
      const left = count;
      const right = total - count - 1;
      const overflow =
        Math.max(0, left - maxLength) + Math.max(0, right - maxLength);
      const punctuationBonus = /[,;:.!?]/.test(clean[index - 1] ?? "") ? 3 : 0;
      const score = overflow * 100 + Math.abs(left - right) - punctuationBonus;
      if (score < bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }
    count++;
  }
  return bestIndex === -1
    ? clean
    : `${clean.slice(0, bestIndex)}\n${clean.slice(bestIndex + 1)}`;
}

export function serializeSrt(cues: Cue[]): string {
  return (
    cues
      .map(
        (cue, index) =>
          `${index + 1}\n${cue.start.replace(".", ",")} --> ${cue.end.replace(".", ",")}\n${cue.text}`,
      )
      .join("\n\n") + (cues.length ? "\n" : "")
  );
}

export const SAMPLE_SRT = `1
00:00:01,000 --> 00:00:04,500
We arrived just before the rain.

2
00:00:04,800 --> 00:00:06,200
I thought you said the last train wouldn't leave until tomorrow morning.

3
00:00:06,500 --> 00:00:11,500
There is a little bookshop at the end of this street.

4
00:00:12,000 --> 00:00:13,500
If we don't leave right now, we are going to miss our only chance to get home.

5
00:00:14,000 --> 00:00:18,000
<i>Some things are worth waiting for.</i>

6
00:00:18,500 --> 00:00:21,000
I kept the letter you sent me, the one with the photograph of the sea.

7
00:00:21,500 --> 00:00:26,500
Take your time.
I'll be right here.

8
00:00:27,000 --> 00:00:29,000
Nobody told us that the bridge had been closed since the storm last winter.
`;
