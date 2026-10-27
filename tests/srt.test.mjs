import test from "node:test";
import assert from "node:assert/strict";
import {
  parseSrt,
  inspectCue,
  autoWrap,
  serializeSrt,
  timestampSeconds,
  characterCount,
  SAMPLE_SRT,
} from "../src/lib/srt.ts";
const standard = { cps: 17, cpl: 42 };
test("sample parses and includes both passing and independently failing CPS/CPL cues", () => {
  const { cues, errors } = parseSrt(SAMPLE_SRT);
  assert.equal(errors.length, 0);
  assert.equal(cues.length, 8);
  const results = cues.map((cue) => inspectCue(cue, standard));
  assert(results.some((x) => !x.issues.length));
  assert(results.some((x) => x.issues.includes("Reading speed")));
  assert(results.some((x) => x.issues.includes("Line too long")));
});
test("BOM, CRLF and period millisecond separators are accepted", () => {
  const parsed = parseSrt(
    "\uFEFF1\r\n00:00:01.000 --> 00:00:03.000\r\nHello\r\n",
  );
  assert.equal(parsed.cues.length, 1);
  assert.equal(inspectCue(parsed.cues[0], standard).duration, 2);
  assert.match(serializeSrt(parsed.cues), /00:00:01,000 --> 00:00:03,000/);
});
test("malformed blocks are reported without silently exporting them", () => {
  const result = parseSrt(
    SAMPLE_SRT + "\n9\nthis is not a timing line\nDon't lose this text",
  );
  assert.equal(result.cues.length, 8);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /Block 9/);
});
test("invalid, empty, zero-length, reversed and overlapping times are flagged", () => {
  assert.equal(timestampSeconds("00:61:01,000"), null);
  assert.equal(timestampSeconds("00:00:01,00"), null);
  for (const [start, end] of [
    ["", "00:00:02,000"],
    ["00:00:02,000", "00:00:02,000"],
    ["00:00:03,000", "00:00:02,000"],
  ]) {
    const cue = parseSrt(`1\n${start} --> ${end}\nHello`).cues[0];
    assert(cue);
    assert(inspectCue(cue, standard).issues.includes("Invalid timing"));
  }
  const previous = {
    id: "1",
    start: "00:00:01,000",
    end: "00:00:04,000",
    text: "Hello",
  };
  assert(
    inspectCue(
      { ...previous, start: "00:00:03,000", end: "00:00:05,000" },
      standard,
      previous,
    ).issues.includes("Overlapping cues"),
  );
});
test("Unicode codepoints and styled text are counted consistently", () => {
  assert.equal(characterCount("<i>Hi 😀</i>"), 4);
  assert.equal(characterCount("{\\an8}Hello"), 5);
  assert.equal(
    inspectCue(
      {
        id: "1",
        start: "00:00:01,000",
        end: "00:00:03,000",
        text: "Hi\nthere",
      },
      standard,
    ).chars,
    8,
  );
});
test("balanced wrapping preserves wording and CPS while resolving feasible CPL", () => {
  const cue = parseSrt(SAMPLE_SRT).cues[1];
  const before = inspectCue(cue, standard);
  const wrapped = autoWrap(cue.text, 42);
  assert.equal(wrapped.replace(/\s+/g, " "), cue.text);
  assert.equal(wrapped.split("\n").length, 2);
  const after = inspectCue({ ...cue, text: wrapped }, standard);
  assert(after.maxLine <= 42);
  assert.equal(after.cps, before.cps);
  assert(after.issues.includes("Reading speed"));
});
test("unwrappable words remain intact, markup attributes are never split", () => {
  const longWord = "x".repeat(100);
  assert.equal(autoWrap(longWord, 42), longWord);
  const styled =
    '<font color="light blue">This is a subtitle with many words needing line balancing</font>';
  assert(autoWrap(styled, 37).includes('<font color="light blue">'));
});
test("serialize/parse roundtrip preserves cue contents and timestamps", () => {
  const { cues } = parseSrt(SAMPLE_SRT);
  assert.deepEqual(parseSrt(serializeSrt(cues)).cues, cues);
  assert.deepEqual(parseSrt(""), { cues: [], errors: [] });
});

test("trailing spaces are preserved and blank subtitle lines are flagged", () => {
  const cue = parseSrt("1\n00:00:01,000 --> 00:00:04,000\nHello ").cues[0];
  assert.equal(cue.text, "Hello ");
  assert(
    inspectCue({ ...cue, text: "Hello\n" }, standard).issues.includes(
      "Empty subtitle line",
    ),
  );
});
