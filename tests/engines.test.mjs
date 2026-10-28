import test from "node:test";
import assert from "node:assert/strict";
import {
  parseChapters,
  exportChapters,
  validateChapters,
  shiftChapters,
  parseTime,
  CHAPTER_SAMPLE,
} from "../src/lib/engines/chapters.ts";
import {
  parseCsv,
  parseBom,
  csvOutput,
  componentStage,
  valueBin,
  BOM_SAMPLE,
} from "../src/lib/engines/bom.ts";
import {
  calculateKnit,
  repeatRound,
  KNIT_DEFAULT,
} from "../src/lib/engines/knit.ts";
import {
  parseHexColors,
  oklab,
  contrast,
  quantize,
  PALETTES,
  exportPalette,
} from "../src/lib/engines/palette.ts";
import {
  pathBounds,
  normalizeGlyph,
  validateTransform,
} from "../src/lib/engines/svg.ts";
import { zipFiles } from "../src/lib/engines/zip.ts";
import {
  analyzeCss,
  cleanCss,
  expandDeclaration,
  specificity,
  diffLines,
} from "../src/lib/engines/css.ts";
const near = (a, b, t = 1e-7) => assert(Math.abs(a - b) < t, `${a} != ${b}`);

test("all chapter formats roundtrip times and escaped titles without silently losing a marker", () => {
  const chapters = parseChapters(CHAPTER_SAMPLE);
  assert.equal(chapters.length, 4);
  assert.deepEqual(validateChapters(chapters, 360), []);
  const shifted = shiftChapters(chapters, 3, 15, 1.5, true);
  assert.deepEqual(
    shifted.map((c) => c.start),
    [0, 33.5, 146.5, 301.5],
  );
  const escaped = shifted.map((c) => ({
    ...c,
    title: c.title + " # = ; \\ end",
  }));
  for (const format of ["json", "ffmetadata"])
    assert.deepEqual(
      parseChapters(exportChapters(escaped, 360, format)).map((c) => ({
        start: c.start,
        title: c.title,
      })),
      escaped.map((c) => ({ start: c.start, title: c.title })),
    );
  assert.deepEqual(
    parseChapters(exportChapters(shifted, 360, "youtube")).map((c) => c.start),
    [0, 33, 146, 301],
  );
  assert.equal(parseTime("1:02:03.125"), 3723.125);
  assert.throws(() => parseTime("1:60"));
  assert.throws(() => parseChapters("0:00 Intro\nmalformed chapter"));
  assert.throws(() => parseChapters('{"chapters":[{"title":"Missing time"}]}'));
  assert.throws(() => shiftChapters(chapters, 2, -99, 0, true));
});
test("YouTube validation checks zero, count, chronology, every duration including last, and missing duration", () => {
  assert(
    validateChapters(
      [
        { start: 2, title: "One" },
        { start: 7, title: "Two" },
      ],
      12,
    ).some((i) => i.code === "first"),
  );
  assert(
    validateChapters(
      [
        { start: 0, title: "One" },
        { start: 20, title: "Two" },
        { start: 20, title: "Three" },
      ],
      40,
    ).some((i) => i.code === "order"),
  );
  assert(
    validateChapters(
      [
        { start: 0, title: "One" },
        { start: 20, title: "Two" },
        { start: 40, title: "Three" },
      ],
      45,
    ).some((i) => i.code === "short" && i.index === 2),
  );
  assert(
    validateChapters(parseChapters(CHAPTER_SAMPLE), 0).some(
      (i) => i.code === "unknownEnd",
    ),
  );
  const meta =
    ";FFMETADATA1\n[CHAPTER]\nTIMEBASE=1/48000\nSTART=72000\nEND=144000\ntitle=Test";
  assert.equal(parseChapters(meta)[0].start, 1.5);
  assert.throws(() =>
    parseChapters(";FFMETADATA1\n[CHAPTER]\nSTART=0\nEND=300\n"),
  );
});
test("RFC4180 BOM accepts escaped quotes, multiline cells, BOM and CRLF, and rejects truncated records", () => {
  const csv =
    '\uFEFFReference,Value,Footprint,Qty,DNP\r\n"R1,R2","10k, \"\"precision\"\"","R_0603\ncustom",2,no\r\nC7,47u,Capacitor_THT:CP_Radial,1,yes\r\n';
  const rows = parseCsv(csv);
  assert.equal(rows[1][1], '10k, "precision"');
  assert.equal(rows[1][2], "R_0603\ncustom");
  assert.deepEqual(parseCsv(csvOutput(rows)), rows);
  const parts = parseBom(csv);
  assert.deepEqual(parts[0].references, ["R1", "R2"]);
  assert.equal(parts[0].stage, 1);
  assert.equal(parts[1].dnp, true);
  assert.equal(parts[1].stage, 5);
  assert.throws(() => parseCsv('a,b\n"not closed'));
  assert.throws(() => parseCsv('a,b\n"closed"bad,x'));
  assert.throws(() => parseBom("Reference,Value,Footprint\nR1,10k"));
  assert.throws(() =>
    parseBom("Reference,Value,Footprint\nR1,10k,R_0603\nR1,20k,R_0603"),
  );
  assert.equal(
    parseBom("Reference,Value,Footprint,Qty\nR1-R3,10k,R_0603,3")[0].references
      .length,
    3,
  );
  assert.equal(parseBom(BOM_SAMPLE).length, 8);
  assert.deepEqual(valueBin("10K"), valueBin("10k"));
});
test("soldering stages follow physical classes and capacitor technology", () => {
  for (const [ref, footprint, stage] of [
    ["R1", "R_0402", 1],
    ["C1", "C_0805", 1],
    ["D1", "SOD-123", 2],
    ["Q1", "SOT-23", 2],
    ["U1", "QFN-32", 3],
    ["Y1", "Crystal_3225", 4],
    ["L1", "Inductor_SMD", 4],
    ["C7", "CP_Radial", 5],
    ["J1", "PinHeader", 5],
  ])
    assert.equal(componentStage(ref, footprint), stage);
});
test("blocked gauge, repeat rounding, washing ratios and measured yarn mass stay dimensionally consistent", () => {
  const r = calculateKnit(KNIT_DEFAULT);
  near(r.stsPerCm, 24 / 11);
  near(r.rowsPerCm, 32 / 12);
  assert.equal(r.rows[0].stitches % 4, 2);
  assert.equal(r.rows[0].rows, 133);
  near(r.rows[0].preWashLength, 133 / 3.2);
  near(r.rows[0].grams, (r.rows[0].stitches * 133 * 6) / 768);
  near(r.grams, r.rows.reduce((n, row) => n + row.grams, 0) * 1.1);
  near(r.meters, (r.grams / 50) * 125);
  assert.equal(r.skeins, Math.ceil(r.grams / 50));
  assert.equal(repeatRound(101, 4, 2), 102);
  assert.equal(repeatRound(1, 4, 0), 4);
  assert.throws(() => repeatRound(100, 4, 4));
  assert.throws(() => calculateKnit({ ...KNIT_DEFAULT, blockedWidth: 0 }));
  const cable = calculateKnit({
    ...KNIT_DEFAULT,
    sections: [{ ...KNIT_DEFAULT.sections[0], structure: "cable", ratio: 1.3 }],
  });
  near(cable.rows[0].grams, r.rows[0].grams * 1.3);
});
test("OKLab, luminance and register lookup match known reference values", () => {
  near(oklab("#ffffff")[0], 1, 1e-6);
  near(oklab("#000000")[0], 0);
  near(oklab("#ff0000")[0], 0.62795536, 1e-6);
  near(contrast("#000000", "#ffffff"), 21);
  near(contrast("#123456", "#123456"), 1);
  const p = PALETTES.cga1high;
  assert.equal(quantize("#55ffff", p.colors).delta, 0);
  assert.equal(quantize("#55ffff", p.colors).index, 1);
  assert.equal(PALETTES.nes.colors.length, 64);
  assert.deepEqual(parseHexColors("#abc, #aabbcc, #FFFFFFff"), [
    "#aabbcc",
    "#ffffff",
  ]);
  assert.deepEqual(
    parseHexColors("#card { color: #abc; border-color:#123456; }"),
    ["#aabbcc", "#123456"],
  );
  assert.throws(() => parseHexColors("#ffffzz"));
  assert.throws(() => parseHexColors("#11223300"));
  assert.match(exportPalette(p.colors, p.name, "gpl"), /^GIMP Palette\n/);
});
test("SVG Bézier extrema are solved rather than using control-point boxes", () => {
  const b = pathBounds("M0 0 C0 100 100 100 100 0 Z");
  near(b.maxY, 75);
  near(b.maxX, 100);
  near(b.minY, 0);
  const q = pathBounds("M0 0 Q50 100 100 0 Z");
  near(q.maxY, 50);
  const relative = pathBounds("m10 20h30v40h-30z");
  assert.deepEqual(relative, { minX: 10, minY: 20, maxX: 40, maxY: 60 });
  assert.throws(() => pathBounds("M0 garbage"));
});
test("SVG elliptical-arc bounds preserve exact circle extrema and apply overshoot without clipping", () => {
  const circle = pathBounds("M10 0 A10 10 0 1 1 -10 0 A10 10 0 1 1 10 0 Z");
  near(circle.minX, -10);
  near(circle.maxX, 10);
  near(circle.minY, -10);
  near(circle.maxY, 10);
  const glyph = {
    name: "O",
    paths: [
      {
        d: "M10 0 A10 10 0 1 1 -10 0 A10 10 0 1 1 10 0 Z",
        fillRule: "nonzero",
      },
    ],
    bounds: circle,
    centroid: { x: 0, y: 0 },
  };
  const n = normalizeGlyph(
    glyph,
    {
      em: 1000,
      capHeight: 700,
      baseline: 850,
      padding: 60,
      overshoot: 12,
      optical: true,
    },
    "round",
  );
  near(n.normalizedBounds.minY, 138);
  near(n.normalizedBounds.maxY, 862);
  assert.match(n.svg, /viewBox="0 0 1000 1000"/);
  assert.throws(() =>
    normalizeGlyph(
      glyph,
      {
        em: 24,
        capHeight: 18,
        baseline: 21,
        padding: 2,
        overshoot: 4,
        optical: true,
      },
      "pointed",
    ),
  );
});
test("CSS scopes, important priority and shorthand coverage prevent partial-data pruning", () => {
  const raw =
    ".a { margin: 1px; padding: 2px; color: red !important; }\n.b { padding: 2px; }\n.a { margin-top: 4px; padding: 2px; color: blue; }\n@media (min-width: 500px) { .a { padding: 9px; }}";
  const a = analyzeCss(raw);
  assert(a.candidates.some((c) => c.property === "padding" && c.safe));
  assert(a.candidates.some((c) => c.value === "blue" && !c.safe));
  assert(!a.candidates.some((c) => c.property === "margin"));
  const effect = a.effects.find((e) => e.property === "margin");
  assert.equal(effect.components.filter((c) => c.active).length, 3);
  const clean = cleanCss(
    raw,
    a.candidates.filter((c) => c.safe).map((c) => c.id),
  );
  assert.match(clean, /margin: 1px/);
  assert.match(clean, /color: red !important/);
  assert.match(clean, /padding: 9px/);
  assert(clean.indexOf(".b") < clean.lastIndexOf(".a"));
  assert.equal(
    analyzeCss(".a{padding:var(--p)}.a{padding:2px}").candidates.length,
    0,
  );
  assert.equal(
    analyzeCss(".a{margin:2px}.a{margin:revert}").candidates.length,
    0,
  );
  assert.equal(
    analyzeCss("@media (x){.a{color:red}}@media (y){.a{color:red}}").candidates
      .length,
    0,
  );
  assert.equal(
    analyzeCss(".a{border:1px solid red}.a{border-color:blue}").candidates
      .length,
    0,
  );
});
test("CSS parses real strings/data URLs and preserves different fallback values by default", () => {
  const raw =
    '.x { content:"};@media{x}"; display: -webkit-box; display: flex; background: url("data:image/svg+xml;a;b"); }';
  const analysis = analyzeCss(raw);
  assert.equal(analysis.rules.length, 1);
  assert.equal(
    analysis.candidates.find((c) => c.property === "display").safe,
    false,
  );
  assert.equal(cleanCss(raw, []), raw);
  assert.throws(() => analyzeCss(".a{color:red"));
  assert.deepEqual(expandDeclaration("margin", "1px 2px 3px"), {
    "margin-top": "1px",
    "margin-right": "2px",
    "margin-bottom": "3px",
    "margin-left": "2px",
  });
  assert.deepEqual(specificity(":where(#x) .a:is(#strong,p)::before"), [
    [1, 1, 1],
  ]);
  assert.deepEqual(specificity("li:nth-child(2n of .x, #id)"), [[1, 1, 1]]);
  const diff = diffLines("a\nb\nc", "a\nc\nd");
  assert(diff.some((l) => l.kind === "remove" && l.text === "b"));
  assert(diff.some((l) => l.kind === "add" && l.text === "d"));
});
test("CSS analysis scales to thousands of repeated appended blocks", () => {
  const raw = Array.from(
    { length: 2500 },
    (_, i) => `.card { margin: 12px; color: ${i % 2 ? "red" : "blue"}; }`,
  ).join("\n");
  const start = performance.now(),
    a = analyzeCss(raw);
  assert.equal(a.rules.length, 2500);
  assert.equal(
    a.candidates.filter((c) => c.property === "margin").length,
    2499,
  );
  assert(performance.now() - start < 5000);
});
test("ZIP batch export has UTF-8 local headers, central directory offsets and preserved bytes", () => {
  const files = [
      { name: "A.svg", content: "<svg/>" },
      { name: "字形.svg", content: "中文路径" },
    ],
    zip = zipFiles(files),
    view = new DataView(zip.buffer),
    decoder = new TextDecoder();
  let offset = 0;
  for (const file of files) {
    assert.equal(view.getUint32(offset, true), 0x04034b50);
    assert.equal(view.getUint16(offset + 6, true), 0x800);
    const size = view.getUint32(offset + 18, true),
      len = view.getUint16(offset + 26, true);
    assert.equal(
      decoder.decode(zip.slice(offset + 30, offset + 30 + len)),
      file.name,
    );
    assert.equal(
      decoder.decode(zip.slice(offset + 30 + len, offset + 30 + len + size)),
      file.content,
    );
    offset += 30 + len + size;
  }
  assert.equal(view.getUint32(offset, true), 0x02014b50);
  assert.equal(view.getUint32(zip.length - 22, true), 0x06054b50);
  assert.equal(view.getUint16(zip.length - 14, true), 2);
  assert.equal(view.getUint32(zip.length - 6, true), offset);
});

test("reopened matching media scopes compare safely, anonymous layers stay isolated and modern specificity is audited", () => {
  assert.equal(
    analyzeCss("@media (x){.a{color:red}}@media (x){.a{color:red}}").candidates
      .length,
    1,
  );
  assert.equal(
    analyzeCss("@layer{.a{color:red}}@layer{.a{color:red}}").candidates.length,
    0,
  );
  assert.deepEqual(specificity(":host(.x) ::slotted(#id)"), [[1, 2, 1]]);
  assert.throws(() => specificity("& .child"));
  validateTransform("translate(10,-20) rotate(45 5 5) scale(.5 2)");
  assert.throws(() => validateTransform("translate(10px)"));
  assert.throws(() => validateTransform("rotate(3, 4)"));
  assert.throws(() => validateTransform("matrix(1 0 0 1 1e999 0)"));
});

test("exact duplicate gradients, custom properties and font shorthands are removable without guessing their effects", () => {
  const raw =
    ".a { background: linear-gradient(red,blue); --tone: var(--x, red); font: italic 16px sans-serif } .a { background: linear-gradient(red,blue); --tone: var(--x, red); font: italic 16px sans-serif }";
  const a = analyzeCss(raw);
  assert.equal(a.candidates.filter((c) => c.safe).length, 3);
  const output = cleanCss(
    raw,
    a.candidates.map((c) => c.id),
  );
  assert.equal((output.match(/linear-gradient/g) || []).length, 1);
  assert.equal((output.match(/--tone/g) || []).length, 1);
});

// Batch 2: real-file parsing, dimensional invariants and safe portable artifacts.
import {
  DENSITIES,
  gramsPerMeter,
  parseGcode,
  spoolBudget,
  GCODE_SAMPLE,
} from "../src/lib/engines/filament.ts";
import { measureKerf, jointFit, kerfCoupon } from "../src/lib/engines/laser.ts";
import {
  EMPTY_ENCOUNTER,
  ENCOUNTER_SAMPLE,
  turnOrder,
  changeHp,
  addCondition,
  advanceTurn,
  importEncounter,
  encounterMarkdown,
} from "../src/lib/engines/initiative.ts";
import {
  parsePhotoList,
  planRenames,
  renameScript,
  unsafeFilename,
  PHOTO_SAMPLE,
} from "../src/lib/engines/renamer.ts";
import {
  inspectDeck,
  inspectDeckRows,
  clozeErrors,
  deduplicateDeck,
  ankiTsv,
} from "../src/lib/engines/anki.ts";
import {
  parseVaultNote,
  auditVault,
  convertFrontmatter,
  VAULT_SAMPLE,
} from "../src/lib/engines/vault.ts";
import {
  parseCutTable,
  solveCuts,
  cutLayoutSvg,
  cutListCsv,
  cutSchedule,
  CUT_PARTS_SAMPLE,
  CUT_STOCK_SAMPLE,
} from "../src/lib/engines/cut-planner.ts";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

test("filament slicer totals: Prusa/Orca/Bambu/Cura units, per-extruder values and precedence", () => {
  near(parseGcode(GCODE_SAMPLE).grams, 44.14);
  near(
    parseGcode(
      "; filament used [g] = 12.3, 4.5\n; filament used [mm] = 1000,2000\nG1 E999",
    ).grams,
    16.8,
  );
  near(
    parseGcode("; filament used [mm] = 1000,2000").grams,
    3 * gramsPerMeter(1.75, 1.24),
  );
  near(parseGcode(";Filament used: 2.5m").meters, 2.5);
  near(parseGcode("; filament weight = 7.8g").grams, 7.8);
  near(parseGcode("; filament used [g] = 0\nG1 E900").grams, 0);
  for (const diameter of [1.75, 2.85])
    for (const density of Object.values(DENSITIES))
      near(
        parseGcode("; filament used [mm] = 1000", diameter, density).grams,
        Math.PI * (diameter / 2) ** 2 * density,
      );
});
test("G-code fallback handles absolute/relative modes, G92, retraction, compact commands and multiple tools", () => {
  const raw =
    "M82\nG92 E0\nG1X10E100\nG1 E98 ; retract\nG1 E100 ; recover, not new filament\nG92 E0\nG1 E20\nM83\nG1 E-5\nG1 E5\nG1 E30\nT1\nM82\nG92 E0\nG1 E50\n";
  const r = parseGcode(raw);
  near(r.meters, 0.2);
  assert.equal(r.method, "extrusion-moves");
  assert.equal(r.warnings.length, 1);
  near(parseGcode("G20\nM83\nG1 E1\nG21\nG1 E10").meters, 0.0354);
  near(parseGcode("M83\nM221 S50\nG1 E100").meters, 0.05);
  assert.throws(() => parseGcode("M200 D1.75\nG1 E10"), /volumetric/);
  assert.equal(
    parseGcode("; filament used [g] = 2\nM200 D1.75\nG1 E10").grams,
    2,
  );
  assert.throws(() => parseGcode("G1 X1 Y2\n; no filament"));
});
test("spool budgets conserve mass, exclude tare, reserve measured material and check cumulative queue", () => {
  const s = {
    name: "test",
    grossWeightG: 300,
    emptySpoolTareG: 200,
    diameter: 1.75,
    material: "PLA",
    reserve: 10,
  };
  const b = spoolBudget(s, [
    { name: "one", grams: 30, copies: 2 },
    { name: "two", grams: 31, copies: 1 },
  ]);
  near(b.net, 100);
  near(b.available, 90);
  near(b.meters, 100 / gramsPerMeter(1.75, 1.24));
  assert.equal(b.queue[0].fits, true);
  assert.equal(b.queue[1].fits, false);
  near(b.queue[1].remainingG, -1);
  assert.throws(() => spoolBudget({ ...s, grossWeightG: 199 }, []));
  assert.throws(() => spoolBudget({ ...s, reserve: 100 }, []));
  assert.throws(() => spoolBudget(s, [{ name: "bad", grams: 1, copies: 1.5 }]));
});
test("laser kerf geometry gives inverse tab/slot offsets and correct total clearance", () => {
  near(measureKerf(20, 19.84), 0.16);
  near(measureKerf(20, 20.16, 1, "internal"), 0.16);
  near(measureKerf(100, 98.4, 10, "comb"), 0.16);
  for (const fit of ["press", "snug", "slip"]) {
    const r = jointFit(3, 0.16, fit);
    near(r.tabDraw - 0.16, r.tabFinished);
    near(r.slotDraw + 0.16, r.slotFinished);
    near(r.slotFinished - r.tabFinished, r.clearance);
  }
  near(jointFit(3, 0.16, "slip", 0.05).clearance, 0.25);
  assert.throws(() => measureKerf(20, 20.5));
  assert.throws(() => measureKerf(100, 98, 0, "comb"));
  assert.throws(() => jointFit(3, 3, "snug"));
});
test("laser exports millimeter cutting paths and independent engraving labels, validates unsafe coupon sizes", () => {
  const svg = kerfCoupon(3, 0.16, 0.05, 9);
  assert.match(svg, /width="[\d.]+mm" height="[\d.]+mm"/);
  assert.match(svg, /viewBox="0 0 /);
  assert.match(svg, /id="cut"/);
  assert.match(svg, /id="engrave"/);
  assert.equal((svg.match(/<path /g) || []).length, 3);
  assert.match(svg, /-0.20/);
  assert.match(svg, /0.20/);
  assert.throws(() => kerfCoupon(3, 0.16, 0.05, 100));
  assert.throws(() => kerfCoupon(9, 0.16));
});
test("initiative tie-break, HP/temp absorption and concentration use full damage, not HP lost", () => {
  assert.deepEqual(
    turnOrder(ENCOUNTER_SAMPLE.combatants).map((c) => c.id),
    ["mage", "goblin", "fighter"],
  );
  let r = changeHp(ENCOUNTER_SAMPLE, "mage", "-24");
  assert.equal(r.dc, 12);
  let c = r.encounter.combatants.find((c) => c.id === "mage");
  assert.equal(c.hp, 13);
  assert.equal(c.tempHp, 0);
  r = changeHp(r.encounter, "mage", "+99");
  assert.equal(r.encounter.combatants[0].hp, 32);
  assert.equal(r.dc, undefined);
  r = changeHp(ENCOUNTER_SAMPLE, "mage", "-3");
  assert.equal(r.dc, 10);
  assert.equal(r.encounter.combatants[0].hp, 32);
  assert.equal(r.encounter.combatants[0].tempHp, 2);
  assert.equal(
    changeHp(ENCOUNTER_SAMPLE, "mage", "-999").encounter.combatants[0].hp,
    0,
  );
  assert.equal(
    changeHp(ENCOUNTER_SAMPLE, "mage", "7").encounter.combatants[0].hp,
    7,
  );
  assert.throws(() => changeHp(ENCOUNTER_SAMPLE, "mage", "1+2"));
  assert.throws(() => changeHp(ENCOUNTER_SAMPLE, "missing", "-2"));
});
test("encounter advances conditions at affected turn ends, next-turn skips current and round increments once", () => {
  let e = addCondition(ENCOUNTER_SAMPLE, "mage", "Shield", 1, "next-turn");
  e = addCondition(e, "mage", "One round", 1, "rounds");
  e = advanceTurn(e);
  assert.equal(e.activeId, "goblin");
  assert.deepEqual(
    e.combatants[0].conditions.map((c) => [c.name, c.remaining]),
    [["Shield", 1]],
  );
  e = advanceTurn(e);
  assert.equal(e.combatants[1].conditions[0].remaining, 9);
  e = advanceTurn(e);
  assert.equal(e.round, 2);
  assert.equal(e.activeId, "mage");
  e = advanceTurn(e);
  assert.equal(e.combatants[0].conditions.length, 0);
  assert(e.log.some((l) => l.includes("Expired: Elara: Shield")));
  assert.deepEqual(importEncounter(JSON.stringify(e)), e);
  assert.match(encounterMarkdown(e), /Combat log/);
  assert.throws(() =>
    importEncounter(JSON.stringify({ ...e, activeId: "missing" })),
  );
  assert.throws(() =>
    importEncounter(
      JSON.stringify({ ...e, combatants: [e.combatants[0], e.combatants[0]] }),
    ),
  );
  assert.throws(() => importEncounter('{"version":1,"combatants":[null]}'));
  assert.deepEqual(advanceTurn(EMPTY_ENCOUNTER), EMPTY_ENCOUNTER);
});
test("rename templates preserve extensions, pad sequences and detect time disorder without changing the input", () => {
  const files = parsePhotoList(PHOTO_SAMPLE),
    before = JSON.stringify(files),
    plan = planRenames(files, "{event}_{seq:03d}_{date}", "Trip", 9);
  assert.equal(plan[0].target, "Trip_009_20261020.JPG");
  assert(plan[1].issues.includes("timestamp-order"));
  assert.equal(JSON.stringify(files), before);
  const sorted = planRenames(files, "{seq:03d}_{name}.{ext}", "", 1, true);
  assert.equal(sorted[0].name, "IMG_9011.JPG");
  assert.equal(sorted[0].target, "001_IMG_9011.JPG");
  assert(!sorted.some((r) => r.issues.length));
  assert.throws(() => planRenames(files, "{unknown}", "", 1));
  assert.throws(() => parsePhotoList("a.jpg\tnot-a-date"));
});
test("rename plan blocks case-insensitive, occupied, duplicate, illegal and reserved destinations", () => {
  const files = [
    { name: "a.jpg", timestamp: 0 },
    { name: "b.jpg", timestamp: 1 },
  ];
  assert(
    planRenames(files, "same", "", 1).every((r) =>
      r.issues.includes("collision"),
    ),
  );
  assert(planRenames(files, "b", "", 1)[0].issues.includes("occupied"));
  for (const bad of [
    "CON.jpg",
    "aux",
    "a/b.jpg",
    "a\\b",
    "bad:thing",
    "end.",
    "end ",
    "NUL.txt",
    "\u0000.jpg",
  ])
    assert(unsafeFilename(bad), bad);
  assert.equal(unsafeFilename("photo [01] 中文.jpg"), false);
  assert.throws(() => renameScript(planRenames(files, "same", "", 1), "bash"));
  assert(
    planRenames(
      [{ name: "a.jpg", timestamp: 0 }],
      "A",
      "",
      1,
    )[0].issues.includes("case-only"),
  );
});
test("generated Bash actually renames and rolls back tricky shell filenames, refuses overwrites", () => {
  const dir = mkdtempSync(join(tmpdir(), "batch2-renames-"));
  try {
    const original = "-O'Brien $(touch injected).jpg";
    writeFileSync(join(dir, original), "original");
    const rows = planRenames(
      [{ name: original, timestamp: 0 }],
      "{event}_{seq:03d}",
      "Safe",
      1,
    );
    assert.equal(rows[0].issues.length, 0);
    const run = (script) =>
      spawnSync("bash", ["-c", script], { cwd: dir, encoding: "utf8" });
    assert.equal(run(renameScript(rows, "bash")).status, 0);
    assert.equal(readFileSync(join(dir, "Safe_001.jpg"), "utf8"), "original");
    assert(!existsSync(join(dir, "injected")));
    assert.equal(run(renameScript(rows, "bash", true)).status, 0);
    assert(existsSync(join(dir, original)));
    writeFileSync(join(dir, "Safe_001.jpg"), "occupied");
    assert.notEqual(run(renameScript(rows, "bash")).status, 0);
    assert.equal(readFileSync(join(dir, "Safe_001.jpg"), "utf8"), "occupied");
    assert(existsSync(join(dir, original)));
    assert.match(renameScript(rows, "powershell"), /Rename-Item -LiteralPath/);
    assert.match(renameScript(rows, "powershell"), /O''Brien/);
    assert.match(renameScript(rows, "powershell", true), /-NewName '-O''Brien/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("Anki parses BOM, CRLF, escaped quotes, valid multiline and separator headers", () => {
  const d = inspectDeck(
    '\uFEFF#separator:comma\r\n"Question, one","Line one\r\nLine ""two"""\r\nTwo,Answer\r\n',
  );
  assert.equal(d.delimiter, ",");
  assert.equal(d.rows.length, 2);
  assert.equal(d.rows[0][0], "Question, one");
  assert.equal(d.rows[0][1], 'Line one\nLine "two"');
  assert.deepEqual(d.issues, []);
  const output = ankiTsv(d.rows);
  assert.match(output, /^#separator:tab\n#html:true\n/);
  assert.match(output, /<br>/);
  const again = inspectDeck(output);
  assert.equal(again.rows[0][0], d.rows[0][0]);
  assert.equal(again.rows[0][1], 'Line one<br>Line "two"');
});
test("Anki reports precise first-field collisions and supports explicit first/last deduplication", () => {
  const d = inspectDeck("same,first\nsame,last\nnew,third");
  assert(d.issues.some((i) => i.code === "duplicate" && i.row === 2));
  assert.equal(deduplicateDeck(d.rows, "first")[0][1], "first");
  assert.equal(deduplicateDeck(d.rows, "last")[0][1], "last");
  assert.throws(() => ankiTsv(d.rows));
  assert(
    inspectDeckRows([
      ["<b>same</b>", "a"],
      ["same", "b"],
    ]).some((i) => i.code === "duplicate"),
  );
});
test("Anki distinguishes broken cloze, broken quote, orphan row and wrong delimiter", () => {
  for (const text of [
    "{{c1::missing",
    "{{c1::}}",
    "{{c0::bad}}",
    "{{c1:bad}}",
    "text }}",
  ])
    assert(clozeErrors(text).length, text);
  assert.equal(clozeErrors("{{c1::outer {{c2::inner}} text::hint}}").length, 0);
  assert(
    inspectDeck('one,"broken\ntwo,answer').issues.some(
      (i) => i.code === "quote",
    ),
  );
  assert(
    inspectDeck('one,bad"quote\ntwo,answer').issues.some(
      (i) => i.code === "quote",
    ),
  );
  assert(
    inspectDeck("one,answer\norphan\ntwo,answer").issues.some(
      (i) => i.code === "columns" && i.row === 2,
    ),
  );
  assert(
    inspectDeck("one,answer\ntwo,answer", "\t").issues.some(
      (i) => i.code === "delimiter",
    ),
  );
  assert(inspectDeck("one,\uFFFD").issues.some((i) => i.code === "encoding"));
});
test("vault parses real YAML aliases, tags, title and converts Dataview while preserving existing values", () => {
  const note = parseVaultNote({
    path: "folder/Test.md",
    content:
      '---\ntitle: "A: title"\naliases:\n  - Alias One\n  - "Other, alias"\ntags: [wood, plans]\nStatus: done\n---\n# Body\nStatus:: active\nCost:: 42\nItems:: [one, two]\n',
  });
  assert.equal(note.title, "A: title");
  assert.deepEqual(note.aliases, ["Alias One", "Other, alias"]);
  assert.deepEqual(note.tags, ["wood", "plans"]);
  const converted = parseVaultNote({
    path: note.path,
    content: convertFrontmatter(note),
  });
  assert.equal(converted.fields.Status, "done");
  assert.equal(converted.fields.Cost, 42);
  assert.deepEqual(converted.fields.Items, ["one", "two"]);
  assert(!converted.body.includes("Cost::"));
  assert.match(converted.body, /# Body/);
  assert.throws(() =>
    convertFrontmatter(
      parseVaultNote({
        path: "bad.md",
        content: "---\naliases: [oops\n---\nbody",
      }),
    ),
  );
});
test("vault groups missing links, detects case/alias mismatch and incoming-link orphans", () => {
  const a = auditVault(VAULT_SAMPLE);
  assert.equal(a.missing["Missing plan"].length, 2);
  assert(a.links.some((l) => l.status === "alias" && l.target === "stock"));
  assert(a.orphans.includes("Orphan.md"));
  assert(!a.orphans.includes("Home.md"));
  const b = auditVault([
    {
      path: "A.md",
      content:
        "[[target|label]]\n[real](Target.md)\n[[Target#Absent]]\n`[[ignored]]`\n```md\n[[ignored too]]\n```\n[web](https://example.com)\n![image](photo.png)",
    },
    { path: "Target.md", content: "# Heading" },
  ]);
  assert.equal(b.links.length, 3);
  assert.equal(b.links[0].status, "case");
  assert.equal(b.links[1].status, "ok");
  assert.equal(b.links[2].status, "anchor");
  assert.throws(() =>
    auditVault([
      { path: "a.md", content: "" },
      { path: "a.md", content: "" },
    ]),
  );
});
test("cut planner has deterministic layouts, grain locks, exact kerf and no overlapping rectangles", () => {
  const parts = parseCutTable(CUT_PARTS_SAMPLE),
    stocks = parseCutTable(CUT_STOCK_SAMPLE, true),
    a = solveCuts(parts, stocks, "2d", 3.2);
  assert.equal(a.unplaced.length, 0);
  assert.equal(a.layouts.length, 1);
  assert.deepEqual(a, solveCuts(parts, stocks, "2d", 3.2));
  for (const l of a.layouts) {
    const rects = [...l.parts, ...l.offcuts, ...l.waste];
    near(
      rects.reduce((s, r) => s + r.w * r.h, 0),
      l.length * l.width,
      1e-6,
    );
    for (const r of rects) {
      assert(
        r.x >= 0 &&
          r.y >= 0 &&
          r.x + r.w <= l.length + 1e-8 &&
          r.y + r.h <= l.width + 1e-8,
      );
    }
    for (let i = 0; i < rects.length; i++)
      for (let j = i + 1; j < rects.length; j++) {
        const r = rects[i],
          s = rects[j];
        assert(
          Math.min(r.x + r.w, s.x + s.w) - Math.max(r.x, s.x) <= 1e-8 ||
            Math.min(r.y + r.h, s.y + s.h) - Math.max(r.y, s.y) <= 1e-8,
        );
      }
    assert(l.parts.filter((p) => p.name !== "Brace").every((p) => !p.rotated));
  }
  const part = {
      name: "rotate",
      length: 80,
      width: 40,
      quantity: 1,
      grain: true,
    },
    stock = { name: "stock", length: 50, width: 100, quantity: 1 };
  assert.equal(solveCuts([part], [stock], "2d", 3).unplaced.length, 1);
  assert.equal(
    solveCuts([{ ...part, grain: false }], [stock], "2d", 3).layouts[0].parts[0]
      .rotated,
    true,
  );
});
test("linear cuts include actual blade losses, expose stock shortage and preserve usable offcuts", () => {
  const part = {
      name: "rail",
      length: 500,
      width: 20,
      quantity: 2,
      grain: false,
    },
    stock = { name: "board", length: 1000, width: 20, quantity: 1 };
  assert.equal(solveCuts([part], [stock], "1d", 0).unplaced.length, 0);
  assert.equal(solveCuts([part], [stock], "1d", 3.2).unplaced.length, 1);
  const plan = solveCuts([{ ...part, length: 400 }], [stock], "1d", 3.2),
    l = plan.layouts[0];
  assert.equal(l.parts.length, 2);
  near(l.parts[1].x, 403.2);
  near(l.offcuts[0].w, 193.6);
  near(
    l.waste.reduce((s, r) => s + r.w, 0),
    6.4,
  );
  assert.match(cutLayoutSvg(l, "1d"), /1000mm/);
  assert.match(cutListCsv(plan), /"403.2"/);
  assert.match(cutSchedule(plan), /crosscut: x=400.00/);
  assert.throws(() => solveCuts([part], [stock], "1d", -1));
  assert.throws(() => parseCutTable("rail,NaN,20,1"));
  assert.throws(() =>
    solveCuts([{ ...part, quantity: 3000 }], [stock], "1d", 3),
  );
});
test("shop SVG escapes user-controlled labels instead of creating executable markup", () => {
  const plan = solveCuts(
      [
        {
          name: "<script>alert(1)</script>",
          length: 50,
          width: 30,
          quantity: 1,
          grain: false,
        },
      ],
      [{ name: "Stock", length: 100, width: 100, quantity: 1 }],
      "2d",
      3.2,
    ),
    svg = cutLayoutSvg(plan.layouts[0], "2d");
  assert(!svg.includes("<script>"));
  assert.match(svg, /&lt;script&gt;/);
  assert.match(svg, /Offcut/);
});

test("Anki preserves comment-like lines inside quoted cells", () => {
  const deck = inspectDeck(
    'front,"answer\n#this is content\nlast line"\n#ignored comment\nnext,answer',
  );
  assert.equal(deck.rows.length, 2);
  assert.equal(deck.rows[0][1], "answer\n#this is content\nlast line");
  assert.deepEqual(deck.issues, []);
});
test("vault resolves parent-relative paths and preserves Dataview-like code during conversion", () => {
  const files = [
    {
      path: "Folder/A.md",
      content:
        "[parent](../Target.md)\n[relative](Child.md)\n[case](../target.md)\nCount:: 2\n```text\nCount:: do not remove\n```\n",
    },
    { path: "Target.md", content: "# Top" },
    { path: "Folder/Child.md", content: "" },
  ];
  const a = auditVault(files);
  assert.deepEqual(
    a.links.map((l) => l.status),
    ["ok", "ok", "case"],
  );
  assert.equal(a.links[0].resolved, "Target.md");
  assert.equal(a.links[1].resolved, "Folder/Child.md");
  const converted = convertFrontmatter(a.notes[0]);
  assert.match(converted, /Count: 2/);
  assert.match(converted, /Count:: do not remove/);
  assert.throws(() =>
    convertFrontmatter(
      parseVaultNote({
        path: "Cyclic.md",
        content: "---\nloop: &loop [*loop]\n---\n",
      }),
    ),
  );
});
test("cut CSV supports quoted real labels and multiline fields", () => {
  const parsed = parseCutTable(
    '"Rail, long",100,20,2,yes\n"Brace\nshort",50,10,1,no',
  );
  assert.equal(parsed[0].name, "Rail, long");
  assert.equal(parsed[1].name, "Brace\nshort");
  assert.equal(parsed[0].grain, true);
});
test("rename placeholders expand once and Unicode-equivalent names collide portably", () => {
  const row = planRenames(
    [{ name: "x.jpg", timestamp: 0 }],
    "{event}_{seq:03d}",
    "{date}",
  )[0];
  assert.equal(row.target, "{date}_001.jpg");
  const rows = planRenames(
    [
      { name: "é.jpg", timestamp: 0 },
      { name: "e\u0301.jpg", timestamp: 1 },
    ],
    "{name}",
    "",
  );
  assert(rows[1].issues.includes("duplicate-source"));
  assert(rows.every((r) => r.issues.includes("collision")));
});

// Day 015 — projector calibration math, sparse coverage and nominal SVG geometry.
import {
  PROJECTOR_ZONES,
  analyzeProjector,
  projectorAdvice,
  projectorGrid,
  projectorCsv,
  toMillimeters,
} from "../src/lib/engines/projector.ts";
const matReadings = (widthMm = 50, heightMm = 50) =>
  PROJECTOR_ZONES.map((z) => ({ zone: z.id, widthMm, heightMm }));
test("projector perfect nine-zone mat and exact inch/cm conversion", () => {
  near(toMillimeters(1, "in"), 25.4);
  near(toMillimeters(5, "cm"), 50);
  const r = analyzeProjector(25.4, matReadings(25.4, 25.4));
  assert.equal(r.status, "within-tolerance");
  assert.equal(r.measuredZones, 9);
  for (const key of [
    "scaleErrorPct",
    "xErrorPct",
    "yErrorPct",
    "aspectStretchPct",
    "maxErrorPct",
  ])
    near(r[key], 0);
  near(r.correctionX, 1);
  near(r.correctionY, 1);
  near(r.verticalKeystone.differencePct, 0);
  assert.equal(r.verticalKeystone.pairs, 3);
});
test("projector separates scale, aspect stretch and reciprocal correction direction", () => {
  const r = analyzeProjector(50, matReadings(55, 45));
  near(r.scaleErrorPct, 0);
  near(r.xErrorPct, 10);
  near(r.yErrorPct, -10);
  near(r.aspectStretchPct, (55 / 45 - 1) * 100);
  near(r.maxErrorPct, 10);
  near(r.correctionX * 55, 50);
  near(r.correctionY * 45, 50);
  assert.equal(r.status, "adjust");
  assert(
    projectorAdvice(r).some(
      (a) =>
        a.en.includes("Reduce horizontal stretch") && a.zh.includes("横向"),
    ),
  );
  const large = projectorAdvice(analyzeProjector(50, matReadings(52, 52)));
  assert(large.some((a) => a.en.includes("lower it toward the mat")));
  const small = projectorAdvice(analyzeProjector(50, matReadings(48, 48)));
  assert(small.some((a) => a.en.includes("raise it away from the mat")));
});
test("projector opposite edges use matched positions and target-relative signed differences", () => {
  const readings = PROJECTOR_ZONES.map((z) => ({
    zone: z.id,
    widthMm: 49 + z.row,
    heightMm: 51 - z.col,
  }));
  const r = analyzeProjector(50, readings);
  near(r.verticalKeystone.differencePct, 4);
  near(r.horizontalKeystone.differencePct, -4);
  assert.equal(r.horizontalKeystone.pairs, 3);
  const advice = projectorAdvice(r)
    .map((a) => a.en)
    .join("\n");
  assert(advice.includes("compress the bottom edge"));
  assert(advice.includes("compress the left edge"));
  const reverse = analyzeProjector(
    50,
    PROJECTOR_ZONES.map((z) => ({
      zone: z.id,
      widthMm: 51 - z.row,
      heightMm: 49 + z.col,
    })),
  );
  const reverseAdvice = projectorAdvice(reverse)
    .map((a) => a.en)
    .join("\n");
  assert(reverseAdvice.includes("compress the top edge"));
  assert(reverseAdvice.includes("compress the right edge"));
  const sparse = analyzeProjector(50, [readings[0], readings[8]]);
  assert.deepEqual(sparse.verticalKeystone, { differencePct: null, pairs: 0 });
  assert.deepEqual(sparse.horizontalKeystone, {
    differencePct: null,
    pairs: 0,
  });
  const matched = analyzeProjector(50, [readings[0], readings[6], readings[8]]);
  near(matched.verticalKeystone.differencePct, 4);
  assert.equal(matched.verticalKeystone.pairs, 1);
});
test("projector missing zones never pass the whole mat; repeats cannot hide outliers", () => {
  const r = analyzeProjector(50, [
    { zone: "center", widthMm: 50, heightMm: 50 },
  ]);
  assert.equal(r.status, "incomplete");
  assert.equal(r.measuredZones, 1);
  assert.equal(r.verticalKeystone.differencePct, null);
  const repeats = analyzeProjector(50, [
    ...matReadings(),
    { zone: "center", widthMm: 51, heightMm: 50 },
    { zone: "center", widthMm: 49, heightMm: 50 },
  ]);
  near(repeats.scaleErrorPct, 0);
  near(repeats.maxErrorPct, 2);
  assert.equal(
    repeats.zones.find((z) => z.id === "center").withinTolerance,
    false,
  );
  assert.equal(repeats.status, "adjust");
  assert.equal(
    analyzeProjector(50, matReadings(50.25, 50), 0.5).status,
    "within-tolerance",
  );
});
test("projector rejects malformed measurements, nonfinite values and excessive charts", () => {
  for (const n of [0, -1, NaN, Infinity]) {
    assert.throws(() => toMillimeters(n, "mm"));
    assert.throws(() =>
      analyzeProjector(50, [{ zone: "center", widthMm: n, heightMm: 50 }]),
    );
  }
  assert.throws(() => toMillimeters(1, "feet"));
  assert.throws(() => analyzeProjector(50, []));
  assert.throws(() =>
    analyzeProjector(50, [{ zone: "unknown", widthMm: 50, heightMm: 50 }]),
  );
  assert.throws(() => analyzeProjector(0, matReadings()));
  assert.throws(() => analyzeProjector(50, matReadings(), NaN));
  assert.throws(() => analyzeProjector(50, matReadings(), -1));
  assert.throws(() => analyzeProjector(50, matReadings(), 11));
  assert.throws(() => analyzeProjector(50, Array(181).fill(matReadings()[0])));
  for (const chart of [
    { widthMm: 600, heightMm: 100, squareMm: 50 },
    { widthMm: 5000, heightMm: 450, squareMm: 50 },
    { widthMm: 600, heightMm: NaN, squareMm: 50 },
    { widthMm: 600, heightMm: 450, squareMm: 0 },
  ])
    assert.throws(() => projectorGrid(chart));
});
test("projector SVG has mm geometry, nine in-bounds nominal squares and long-span reference; CSV preserves real readings", () => {
  for (const s of [5, 25.4, 50, 80]) {
    const svg = projectorGrid({ widthMm: 600, heightMm: 450, squareMm: s });
    assert.match(svg, /width="600mm" height="450mm" viewBox="0 0 600 450"/);
    assert(!/<script|<foreignObject|href=|transform=/.test(svg));
    const squares = [
      ...svg.matchAll(
        /<g id="([\w-]+)"><rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g,
      ),
    ];
    assert.equal(squares.length, 9);
    assert.equal(new Set(squares.map((m) => `${m[2]},${m[3]}`)).size, 9);
    for (const [, , x, y, w, h] of squares) {
      near(Number(w), s);
      near(Number(h), s);
      assert(Number(x) >= 20 && Number(y) >= 20);
      assert(Number(x) + s <= 580 + 1e-8 && Number(y) + s <= 430 + 1e-8);
    }
    assert(
      svg.includes(
        `Grid span ${Math.floor(560 / s) * s} by ${Math.floor(410 / s) * s} mm`,
      ),
    );
  }
  const readings = [{ zone: "center", widthMm: 51, heightMm: 49 }];
  const csv = projectorCsv(readings, analyzeProjector(50, readings));
  const row = csv.split("\r\n")[1].split(",");
  assert.deepEqual(row.slice(0, 5), ["center", "1", "51", "49", "50"]);
  near(Number(row[5]), 2);
  near(Number(row[6]), -2);
  assert.equal(row[7], "false");
});

// Day 016: the same pure parser/scaler powers pasted text, imports and all exports.
import {
  RECIPE_SAMPLE,
  parseRecipeQuantity,
  parseRecipe,
  scaleRecipe,
  normalizeRecipeAmount,
  convertRecipeAmount,
  formatRecipeAmount,
  recipeText,
  recipeCsv,
} from "../src/lib/engines/recipe.ts";

test("recipe quantities parse decimals, improper, mixed and Unicode fractions completely", () => {
  for (const [text, expected] of [
    ["2", 2],
    [".25", 0.25],
    ["1.75", 1.75],
    ["1/2", 0.5],
    ["7/4", 1.75],
    ["1 1/2", 1.5],
    ["2-1/2", 2.5],
    ["½", 0.5],
    ["⅓", 1 / 3],
    ["¼", 0.25],
    ["¾", 0.75],
    ["⅛", 0.125],
    ["⅜", 0.375],
    ["⅝", 0.625],
    ["⅞", 0.875],
    ["2½", 2.5],
    ["1 ⅔", 1 + 2 / 3],
    ["1⁄2", 0.5],
  ])
    near(parseRecipeQuantity(text), expected);
  for (const raw of [
    "1/0",
    "1 2/0",
    "-1",
    "Infinity",
    "1e4",
    "1-2",
    "1/2/3",
    "1 3/2",
    "",
    "1.2.3",
  ]) {
    assert.throws(() => parseRecipeQuantity(raw));
  }
  assert.equal(formatRecipeAmount(1.5), "1 1/2");
  assert.equal(formatRecipeAmount(1 / 3), "1/3");
  assert.equal(formatRecipeAmount(0.00000001), "0.00000001");
  assert.equal(formatRecipeAmount(0.333), "0.333");
});

test("recipe parser recognizes unit aliases and preserves sections, notes and blank lines", () => {
  const rows = parseRecipe(
    "For the sauce:\n\n1 1/2 CUPS stock\n2-1/2 Tablespoons oil\n½ tsp salt\n250mL milk\n2 eggs\nsalt to taste\n3 fluid ounces water\n4 Ounces flour\n1 kilogram carrots\n2 litres broth\n1 teaspoon spice\n1 pound onions\n1 dash pepper\n• 1/4 cup yogurt",
  );
  assert.equal(rows[0].kind, "header");
  assert.equal(rows[1].kind, "blank");
  assert.equal(rows[2].amount, 1.5);
  assert.equal(rows[2].unit, "cup");
  assert.equal(rows[2].name, "stock");
  assert.equal(rows[3].amount, 2.5);
  assert.equal(rows[3].unit, "tbsp");
  assert.equal(rows[4].amount, 0.5);
  assert.equal(rows[5].unit, "ml");
  assert.equal(rows[6].family, "count");
  assert.equal(rows[7].kind, "note");
  assert.equal(rows[8].family, "volume");
  assert.equal(rows[9].family, "mass");
  assert.equal(rows[10].unit, "kg");
  assert.equal(rows[11].unit, "L");
  assert.equal(rows[12].unit, "tsp");
  assert.equal(rows[13].unit, "lb");
  assert.equal(rows[14].family, "symbolic");
  assert.equal(rows[15].amount, 0.25);
});

test("recipe serving math and unit ladders retain unrounded source-unit amounts", () => {
  const report = scaleRecipe({
    raw: RECIPE_SAMPLE,
    mode: "servings",
    originalServings: 4,
    targetServings: 8,
  });
  near(report.factor, 2);
  assert.equal(
    report.rows.find((r) => r.name === "vegetable stock").display,
    "3 cup vegetable stock",
  );
  const potatoes = report.rows.find((r) => r.name === "potatoes, diced");
  assert.equal(potatoes.scaledAmount, 1000);
  assert.equal(potatoes.normalizedAmount, 1);
  assert.equal(potatoes.normalizedUnit, "kg");
  assert.equal(normalizeRecipeAmount(48, "tsp").display, "1 cup");
  assert.equal(normalizeRecipeAmount(16, "tbsp").display, "1 cup");
  assert.equal(normalizeRecipeAmount(3, "tsp").display, "1 tbsp");
  assert.equal(normalizeRecipeAmount(8, "fl oz").display, "1 cup");
  assert.equal(normalizeRecipeAmount(1500, "ml").display, "1 1/2 L");
  assert.equal(normalizeRecipeAmount(0.5, "L").display, "500 ml");
  assert.equal(normalizeRecipeAmount(1500, "g").display, "1 1/2 kg");
  assert.equal(normalizeRecipeAmount(0.5, "kg").display, "500 g");
  assert.equal(normalizeRecipeAmount(16, "oz").display, "1 lb");
  assert.equal(normalizeRecipeAmount(0.5, "lb").display, "8 oz");
  assert.equal(report.warnings.find((w) => w.code === "symbolic").line, 10);
  for (const n of [0, -1, NaN, Infinity, 101, 0.01]) {
    assert.throws(() =>
      scaleRecipe({
        raw: RECIPE_SAMPLE,
        mode: "servings",
        originalServings: n,
        targetServings: 4,
      }),
    );
    assert.throws(() =>
      scaleRecipe({
        raw: RECIPE_SAMPLE,
        mode: "servings",
        originalServings: 4,
        targetServings: n,
      }),
    );
  }
});

test("recipe pivot converts only compatible units and scales every quantity uniformly", () => {
  const inputs = {
    raw: "500 g potatoes\n1 1/2 cups stock\n2 eggs",
    mode: "pivot",
    pivotLine: 1,
    desiredAmount: "3/4",
    desiredUnit: "kg",
  };
  const report = scaleRecipe(inputs);
  near(report.factor, 1.5);
  near(report.rows[0].scaledAmount, 750);
  near(report.rows[1].scaledAmount, 2.25);
  near(report.rows[2].scaledAmount, 3);
  const volume = scaleRecipe({
    ...inputs,
    pivotLine: 2,
    desiredAmount: "24",
    desiredUnit: "tbsp",
  });
  near(volume.factor, 1);
  const count = scaleRecipe({
    ...inputs,
    pivotLine: 3,
    desiredAmount: "3",
    desiredUnit: null,
  });
  near(count.factor, 1.5);
  for (const patch of [
    { desiredUnit: "cup" },
    { pivotLine: 4 },
    { desiredAmount: "0" },
    { desiredAmount: "1/0" },
    { desiredAmount: "-2" },
  ])
    assert.throws(() => scaleRecipe({ ...inputs, ...patch }));
  assert.throws(() =>
    scaleRecipe({ ...inputs, raw: "0 g potatoes", desiredAmount: "1" }),
  );
});

test("recipe recovery exports all unparsed quantitative lines unchanged with explicit warnings", () => {
  const invalid = [
    "1/0 cup flour",
    "1-2 cups stock",
    "1 to 2 tsp salt",
    "1.2.3 g pepper",
    "1/2/3 cup sugar",
    "-2 eggs",
    "1 cup + 2 tbsp oil",
  ];
  const raw = [
    "Sauce:",
    "",
    "1/2 cup yogurt",
    ...invalid,
    "salt to taste",
  ].join("\n");
  const report = scaleRecipe({
    raw,
    mode: "servings",
    originalServings: 2,
    targetServings: 4,
  });
  assert.equal(report.warnings.length, invalid.length);
  assert.equal(
    report.rows.filter((r) => r.kind === "unparsed").length,
    invalid.length,
  );
  const txt = recipeText(report);
  const json = JSON.parse(JSON.stringify(report));
  const csv = parseCsv(recipeCsv(report));
  for (const line of invalid) {
    assert(txt.includes(`[UNPARSED — NOT SCALED] ${line}`));
    assert(json.rows.some((r) => r.raw === line && r.scaledAmount === null));
    assert(
      csv.some(
        (r) =>
          r[2] === line && r[1] === "unparsed" && r[10].includes("preserved"),
      ),
    );
  }
  assert(txt.includes("1 cup yogurt"));
  assert(txt.includes("salt to taste"));
  assert(recipeText(report, "zh").includes("未解析，未缩放"));
  const quoted = scaleRecipe({
    raw: '1 g spice, "hot"',
    mode: "servings",
    originalServings: 1,
    targetServings: 2,
  });
  assert.equal(parseCsv(recipeCsv(quoted))[1][3], 'spice, "hot"');
  assert.throws(() => parseRecipe("x".repeat(200001)));
  assert.throws(() => parseRecipe("\n".repeat(2001)));
});

test("recipe volume and mass never cross families or infer ingredient density", () => {
  assert.throws(() => convertRecipeAmount(1, "cup", "g"));
  assert.throws(() => convertRecipeAmount(1, "g", "cup"));
  assert.throws(() => convertRecipeAmount(1, "oz", "fl oz"));
  assert.throws(() => convertRecipeAmount(1, "pinch", "tsp"));
  near(convertRecipeAmount(1, "cup", "ml"), 236.5882365);
  const report = scaleRecipe({
    raw: "1 cup flour\n236.5882365 g flour\n2 pinch salt",
    mode: "servings",
    originalServings: 1,
    targetServings: 2,
  });
  assert.equal(report.rows[0].normalizedUnit, "cup");
  assert.equal(report.rows[1].normalizedUnit, "g");
  assert.equal(report.rows[2].display, "4 pinch salt");
});

// Day 017: every percentage uses total flour, including flour inside starter.
import {
  splitStarter,
  resolveSourdough,
  calculateSourdough,
  sourdoughPercentInput,
  sourdoughText,
  sourdoughCsv,
  SOURDOUGH_SAMPLE,
} from "../src/lib/engines/sourdough.ts";

test("sourdough starter split conserves mass at 100%, 50% and 70% hydration", () => {
  for (const hydration of [50, 70, 100, 200]) {
    const split = splitStarter(100, hydration);
    near(split.flour, 100 / (1 + hydration / 100));
    near(split.flour + split.water, 100);
    near((split.water / split.flour) * 100, hydration);
  }
  near(splitStarter(100, 100).flour, 50);
  near(splitStarter(100, 50).flour, 200 / 3);
  assert.deepEqual(splitStarter(0, 100), { flour: 0, water: 0 });
});

test("sourdough true hydration, total-flour percentages and row sums do not double count starter", () => {
  const r = calculateSourdough(SOURDOUGH_SAMPLE);
  near(r.bowlFlour, 500);
  near(r.totalFlour, 550);
  near(r.totalWater, 425);
  near(r.trueHydrationPct, 77.27272727272727);
  near(r.doughWeight, 985);
  near(r.starterPct, (100 / 550) * 100);
  near(r.prefermentedFlourPct, (50 / 550) * 100);
  near(r.rowsBakersPctSum, (r.doughWeight / r.totalFlour) * 100);
  // Input flour rows sum to 90.909...%; starter flour supplies the rest of 100%.
  near(
    r.rows
      .filter((row) => row.kind === "flour")
      .reduce((sum, row) => sum + row.bakersPct, 0) + r.prefermentedFlourPct,
    100,
  );
  assert(r.rowsBakersPctSum > 100);
  const enriched = calculateSourdough({
    ...SOURDOUGH_SAMPLE,
    others: [
      { name: "Milk", amount: 100 },
      { name: "Oil", amount: 20 },
    ],
  });
  near(enriched.trueHydrationPct, r.trueHydrationPct);
  near(enriched.doughWeight, 1105);
});

test("sourdough dough/flour scaling conserves every ratio and the starter split", () => {
  for (const hydration of [50, 70, 100]) {
    const input = {
      ...SOURDOUGH_SAMPLE,
      starterHydrationPct: hydration,
      others: [{ name: "Seeds", amount: 30 }],
    };
    const base = calculateSourdough(input);
    for (const scale of [
      { mode: "dough", targetGrams: 2030 },
      { mode: "totalFlour", targetGrams: 750 },
    ]) {
      const r = calculateSourdough(input, scale);
      near(
        scale.mode === "dough" ? r.doughWeight : r.totalFlour,
        scale.targetGrams,
      );
      near(r.trueHydrationPct, base.trueHydrationPct);
      near(r.starterSplit.flour * (1 + hydration / 100), r.scaled.starter);
      r.rows.forEach((row, i) => {
        near(row.grams, base.rows[i].grams * r.factor);
        near(row.bakersPct, base.rows[i].bakersPct);
      });
    }
  }
});

test("sourdough percentage inputs roundtrip grams and support both weight anchors", () => {
  for (const hydration of [50, 70, 100]) {
    const input = { ...SOURDOUGH_SAMPLE, starterHydrationPct: hydration };
    const base = calculateSourdough(input);
    const percents = sourdoughPercentInput(input);
    const restored = calculateSourdough(percents);
    restored.rows.forEach((r, i) => near(r.grams, base.rows[i].grams));
    const doubled = calculateSourdough({
      ...percents,
      anchor: "dough",
      anchorGrams: base.doughWeight * 2,
    });
    doubled.rows.forEach((r, i) => near(r.grams, base.rows[i].grams * 2));
    near(doubled.trueHydrationPct, base.trueHydrationPct);
    near(
      calculateSourdough({ ...percents, anchorGrams: 1000 }).totalFlour,
      1000,
    );
  }
  // Directly entered percentages, rather than values manufactured by the converter.
  const r = calculateSourdough({
    ...SOURDOUGH_SAMPLE,
    mode: "percent",
    flours: [{ name: "Bread", amount: 90 }],
    water: 65,
    salt: 2,
    starter: 20,
    anchorGrams: 1000,
  });
  near(r.totalFlour, 1000);
  near(r.trueHydrationPct, 75);
  near(r.doughWeight, 1770);
  const edited = calculateSourdough({
    ...sourdoughPercentInput(SOURDOUGH_SAMPLE),
    water: 70,
  });
  near(edited.base.water, 385);
  assert.throws(
    () =>
      resolveSourdough({
        ...sourdoughPercentInput(SOURDOUGH_SAMPLE),
        starter: 25,
      }),
    /balance/,
  );
});

test("sourdough rejects invalid sizes, nonfinite, negative, impossible and unbalanced inputs", () => {
  for (const hydration of [0, -1, NaN, Infinity, 1001])
    assert.throws(() => splitStarter(100, hydration), /hydration/);
  for (const amount of [-1, NaN, Infinity, 1_000_001]) {
    assert.throws(() => splitStarter(amount, 100));
    for (const key of ["water", "salt", "starter"])
      assert.throws(() =>
        calculateSourdough({ ...SOURDOUGH_SAMPLE, [key]: amount }),
      );
    assert.throws(() =>
      calculateSourdough({
        ...SOURDOUGH_SAMPLE,
        flours: [{ name: "Flour", amount }],
      }),
    );
    assert.throws(() =>
      calculateSourdough({
        ...SOURDOUGH_SAMPLE,
        others: [{ name: "Seed", amount }],
      }),
    );
  }
  assert.throws(() =>
    calculateSourdough({ ...SOURDOUGH_SAMPLE, flours: [], starter: 0 }),
  );
  assert.throws(
    () =>
      calculateSourdough({
        ...SOURDOUGH_SAMPLE,
        flours: [{ name: "Flour", amount: 0 }],
        starter: 0,
      }),
    /flour/,
  );
  assert.throws(
    () =>
      calculateSourdough({
        ...SOURDOUGH_SAMPLE,
        flours: [{ name: "Flour", amount: Number.MIN_VALUE }],
        starter: 0,
      }),
    /flour/,
  );
  assert.throws(
    () =>
      calculateSourdough({
        ...SOURDOUGH_SAMPLE,
        flours: Array(21).fill({ name: "Flour", amount: 1 }),
      }),
    /count/,
  );
  assert.throws(
    () =>
      calculateSourdough({
        ...SOURDOUGH_SAMPLE,
        others: Array(21).fill({ name: "Seed", amount: 1 }),
      }),
    /count/,
  );
  for (const name of ["", " ", "a".repeat(101), "two\nlines"])
    assert.throws(
      () =>
        calculateSourdough({
          ...SOURDOUGH_SAMPLE,
          others: [{ name, amount: 1 }],
        }),
      /name/,
    );
  for (const targetGrams of [0, -1, NaN, Infinity, 10_000_001])
    assert.throws(
      () =>
        calculateSourdough(SOURDOUGH_SAMPLE, { mode: "dough", targetGrams }),
      /target/,
    );
  const pct = sourdoughPercentInput(SOURDOUGH_SAMPLE);
  for (const anchorGrams of [0, -1, NaN, Infinity, 10_000_001])
    assert.throws(() => calculateSourdough({ ...pct, anchorGrams }), /anchor/);
  assert.throws(() => calculateSourdough({ ...pct, water: 10001 }));
  assert.throws(
    () =>
      calculateSourdough(SOURDOUGH_SAMPLE, {
        mode: "totalFlour",
        targetGrams: 10_000_000,
      }),
    /amount/,
  );
  assert.throws(
    () => calculateSourdough({ ...SOURDOUGH_SAMPLE, mode: "unknown" }),
    /mode/,
  );
  assert.throws(
    () =>
      calculateSourdough(SOURDOUGH_SAMPLE, { mode: "unknown", targetGrams: 1 }),
    /scale/,
  );
});

test("sourdough warnings stay informational and exports carry real values and conventions", () => {
  assert(
    calculateSourdough({
      ...SOURDOUGH_SAMPLE,
      starterHydrationPct: 200,
    }).warnings.some((w) => w.code === "extreme-hydration"),
  );
  for (const starter of [0, 1000])
    assert(
      calculateSourdough({ ...SOURDOUGH_SAMPLE, starter }).warnings.some(
        (w) => w.code === "inoculation",
      ),
    );
  const r = calculateSourdough(
    { ...SOURDOUGH_SAMPLE, others: [{ name: 'Seed, "mix"', amount: 20 }] },
    { mode: "dough", targetGrams: 2010 },
  );
  const text = sourdoughText(r);
  assert(text.includes('Seed, "mix": 40 g'));
  assert(text.includes("not 100%"));
  assert(sourdoughText(r, "zh").includes("真实含水量"));
  assert(sourdoughText(r, "zh").includes("勿重复添加"));
  const csv = parseCsv(sourdoughCsv(r));
  assert.equal(csv.length, r.rows.length + 1);
  assert.equal(csv.at(-1)[1], 'Seed, "mix"');
  near(Number(csv.at(-1)[2]), 40);
  near(
    csv.slice(1).reduce((sum, row) => sum + Number(row[2]), 0),
    r.doughWeight,
  );
  near(
    csv.slice(1).reduce((sum, row) => sum + Number(row[4]), 0),
    r.totalWater,
  );
  const json = JSON.parse(JSON.stringify(r));
  near(json.trueHydrationPct, 77.27272727272727);
  assert.equal(json.inputs.others[0].amount, 20);
});

// Day 018: all modes share the same local parser, cent math and export gate.
import {
  BANK_DEFAULT,
  BANK_CSV_SAMPLE,
  parseBankCsv,
  bankAmountCents,
  bankDate,
  normalizeBankCsv,
  bankCsv,
  bankSummary,
} from "../src/lib/engines/bank-csv.ts";
const bank = (rawCsv, settings = {}) =>
  normalizeBankCsv({ ...BANK_DEFAULT, rawCsv, ...settings });

test("bank split signs, currency/parentheses, cent totals and running reconciliation", () => {
  const r = bank(BANK_CSV_SAMPLE, {
    openingBalance: "100.00",
    closingBalance: "1295.31",
  });
  assert.equal(r.hasErrors, false);
  assert.deepEqual(
    r.rows.map((x) => x.amountCents),
    [-4235, 125000, -1234],
  );
  assert.deepEqual(
    r.rows.map((x) => x.runningBalanceCents),
    [5765, 130765, 129531],
  );
  assert.equal(r.totalInflowCents, 125000);
  assert.equal(r.totalOutflowCents, -5469);
  assert.equal(r.netChangeCents, 119531);
  assert.equal(r.reconciled, true);
  assert.equal(r.deltaCents, 0);
  assert.equal(r.delta, 0);
  for (const [raw, cents] of [
    ["$1,234.56", 123456],
    ["(£ 12.34)", -1234],
    ["$ (12.34)", -1234],
    ["€12.34-", -1234],
    ["-¥12.34", -1234],
    ["+0.10", 10],
    ["1 234.56", 123456],
  ])
    assert.equal(bankAmountCents(raw), cents);
  for (const raw of [
    "",
    "wat",
    "1,23",
    "NaN",
    "Infinity",
    "--1",
    "(-1)",
    "1.234",
    "1000000001",
    "1e3",
    "1$2",
    "$$12",
  ])
    assert.equal(bankAmountCents(raw), null);
  const preserve = bank(BANK_CSV_SAMPLE, { preserveInternalSigns: true });
  assert.equal(preserve.rows[2].amountCents, 1234);
  const both = bank(
    "Date,Payee,Description,Debit,Credit\n04/05/2026,A,B,10,2\n04/06/2026,A,B,,0",
  );
  assert.equal(both.rows.length, 2);
  assert(both.hasErrors);
  assert(both.issues.some((i) => i.row === 2 && i.code === "both"));
  assert.throws(() => bankCsv(both), /errors/);
  assert.equal(both.rows[1].amountCents, 0);
});

test("bank type mode recognizes Credit/Debit/DR/CR and preserves unknown rows", () => {
  const raw =
    "Date,Payee,Description,Amount,Type\n04/05/2026,A,B,10,Credit\n04/06/2026,A,B,-2,Debit\n04/07/2026,A,B,(3),DR\n04/08/2026,A,B,4, cR \n04/09/2026,A,B,5,transfer";
  const r = bank(raw, { mode: "type" });
  assert.deepEqual(
    r.rows.map((x) => x.amountCents),
    [1000, -200, -300, 400, null],
  );
  assert.equal(r.rows.length, 5);
  assert.equal(r.rows[4].original[4], "transfer");
  assert(r.hasErrors);
  assert.equal(r.issues[0].code, "type");
  assert.equal(r.issues[0].row, 6);
  assert.throws(() => bankCsv(r));
  const fixed = bank(raw, {
    mode: "type",
    inflowTokens: BANK_DEFAULT.inflowTokens + ",transfer",
  });
  assert(!fixed.hasErrors);
  assert.equal(fixed.rows[4].amountCents, 500);
  assert(
    bank(raw, { mode: "type", inflowTokens: "debit,cr" }).issues.some(
      (i) => i.code === "tokens",
    ),
  );
});

test("bank signed credit-card inversion happens last and preserves zero", () => {
  const raw =
    "Date,Payee,Description,Amount\n2026-04-05,Store,Charge,12.34\n2026-04-06,Bank,Payment,12.34-\n2026-04-07,Bank,Zero,0";
  const normal = bank(raw, { mode: "signed" });
  const inverted = bank(raw, { mode: "signed", invertSigns: true });
  assert(!inverted.hasErrors);
  assert.deepEqual(
    normal.rows.map((x) => x.amountCents),
    [1234, -1234, 0],
  );
  assert.deepEqual(
    inverted.rows.map((x) => x.amountCents),
    [-1234, 1234, 0],
  );
  const type = bank(
    "Date,Payee,Description,Amount,Type\n04/05/2026,A,B,2,Debit",
    { mode: "type", invertSigns: true },
  );
  assert.equal(type.rows[0].amountCents, 200);
});

test("bank explicit MDY/DMY/YMD and strict calendar validation retain invalid dates", () => {
  assert.equal(bankDate("04/05/2026", "MDY"), "2026-04-05");
  assert.equal(bankDate("04/05/2026", "DMY"), "2026-05-04");
  assert.equal(bankDate("2026/04/05", "YMD"), "2026-04-05");
  assert.equal(bankDate("2026-04-05", "DMY"), "2026-04-05");
  assert.equal(bankDate("02/29/2024", "MDY"), "2024-02-29");
  for (const date of [
    "13/04/2026",
    "02/29/2026",
    "04/31/2026",
    "00/01/2026",
    "4/5/26",
    "2026-02-30",
  ])
    assert.equal(bankDate(date, "MDY"), null);
  const raw =
    "Date,Payee,Description,Debit,Credit\n13/04/2026,A,B,1,\n04/05/2026,C,D,,2";
  const bad = bank(raw, { openingBalance: "0", closingBalance: "1" });
  assert.equal(bad.rows.length, 2);
  assert.equal(bad.rows[0].date, null);
  assert.equal(bad.rows[0].status, "error");
  assert(bad.hasErrors);
  assert.equal(bad.reconciled, null);
  assert.equal(bad.rows[1].runningBalanceCents, null);
  assert(!bank(raw, { dateOrder: "DMY" }).hasErrors);
});

test("bank integer-cent balance and signed discrepancy are exact", () => {
  const raw =
    "Date,Payee,Description,Amount\n2026-04-05,A,B,0.10\n2026-04-06,A,B,0.20";
  const r = bank(raw, {
    mode: "signed",
    openingBalance: "0.10",
    closingBalance: "0.40",
  });
  assert.equal(r.netChangeCents, 30);
  assert.equal(r.calculatedClosingCents, 40);
  assert.equal(r.reconciled, true);
  const mismatch = bank(raw, {
    mode: "signed",
    openingBalance: "0.10",
    closingBalance: "0.41",
  });
  assert.equal(mismatch.reconciled, false);
  assert.equal(mismatch.deltaCents, -1);
  assert.equal(mismatch.delta, -0.01);
  assert(bankSummary(mismatch).includes("-0.01 (-1 cents)"));
  assert(bankSummary(r, "zh").includes("余额吻合"));
  assert.equal(
    bank(raw, { mode: "signed", openingBalance: "0.10" }).reconciled,
    null,
  );
  assert(bank(raw, { mode: "signed", openingBalance: "invalid" }).hasErrors);
  assert(bankCsv(mismatch).includes('"2026-04-05"'));
});

test("bank RFC-4180 multiline/quotes/BOM, blank records, malformed input, mapping and audit safety", () => {
  const raw =
    '\uFEFFDate,Payee,Description,Debit,Credit\r\n04/05/2026,"Shop, Inc.","Two\r\nlines and ""quotes""",1,\r\n';
  const r = bank(raw);
  assert(!r.hasErrors);
  assert.equal(r.rows.length, 1);
  assert.equal(r.rows[0].payee, "Shop, Inc.");
  assert.equal(r.rows[0].description, 'Two\r\nlines and "quotes"');
  const exported = parseCsv(bankCsv(r));
  assert.deepEqual(exported[0], ["Date", "Payee", "Amount", "Description"]);
  assert.equal(exported[1][3], r.rows[0].description);
  const audit = JSON.parse(JSON.stringify(r));
  assert.equal(audit.mapping.rawCsv, raw);
  assert.deepEqual(audit.rows[0].original, parseBankCsv(raw)[1]);
  const blank = bank(raw + "\r\n,,,,\r\n");
  assert.equal(blank.rows.length, 3);
  assert(blank.hasErrors);
  const ragged = bank("Date,Payee,Description,Debit,Credit\n04/05/2026,A,B,1");
  assert.equal(ragged.rows.length, 1);
  assert(ragged.issues.some((i) => i.code === "columns"));
  for (const bad of [
    'Date,Amount\n"unfinished',
    'Date,Amount\n"a"extra,1',
    'Date,Amount\na"b,1',
  ]) {
    const result = bank(bad);
    assert(result.hasErrors);
    assert.equal(result.mapping.rawCsv, bad);
    assert.throws(() => bankCsv(result));
  }
  assert(bank("Date,Amount").hasErrors);
  assert(bank(raw, { debitColumn: 0 }).hasErrors);
  assert(bank(raw, { dateColumn: 99 }).hasErrors);
  assert(!bank(raw, { payeeColumn: -1, descriptionColumn: -1 }).hasErrors);
  assert.throws(() => parseBankCsv("x".repeat(2 * 1024 * 1024 + 1)), /size/);
  assert.throws(() => parseBankCsv("a\n" + "x\n".repeat(10001)), /size/);
});

// Day 019: file offsets, never the host machine's timezone, determine instants.
import {
  ICS_DEFAULT,
  ICS_SAMPLE,
  unfoldIcs,
  parseIcsProperty,
  parseIcsOffset,
  inspectIcs,
  icsSummary,
} from "../src/lib/engines/ics.ts";
const invite = (body, zone = "") =>
  `BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${zone}\r\nBEGIN:VEVENT\r\n${body}\r\nEND:VEVENT\r\nEND:VCALENDAR`;
const inspectInvite = (rawIcs, extra = {}) =>
  inspectIcs({ ...ICS_DEFAULT, rawIcs, ...extra });
const customZone = `BEGIN:VTIMEZONE
TZID:Customized Time Zone
BEGIN:STANDARD
DTSTART:19700101T000000
TZOFFSETFROM:+0530
TZOFFSETTO:+0530
END:STANDARD
END:VTIMEZONE`;

test("ICS unfolds exactly one continuation whitespace and reads quoted TZID parameters", () => {
  assert.deepEqual(unfoldIcs("SUMMARY:Long\r\n line\r\n\t two\r\nEND:VEVENT"), [
    "SUMMARY:Longline two",
    "END:VEVENT",
  ]);
  const p = parseIcsProperty(
    'DTSTART;VALUE=DATE-TIME;TZID="Custom:Zone":20260928T133000',
  );
  assert.equal(p.name, "DTSTART");
  assert.equal(p.params.TZID, "Custom:Zone");
  assert.equal(p.value, "20260928T133000");
  const r = inspectInvite(
    invite("SUMMARY:Team\\, sync\n continues\nDTSTART:20260928T090000Z"),
  );
  assert.equal(r.events[0].summary, "Team, synccontinues");
  assert.equal(r.hasErrors, false);
});

test("ICS sample converts Z, embedded daylight, custom offsets, and flags floating times", () => {
  const r = inspectInvite(ICS_SAMPLE, {
    displayLabel: "Asia/Shanghai",
    displayOffsetMinutes: 480,
  });
  assert.equal(r.hasErrors, false);
  assert.equal(r.events.length, 4);
  assert.equal(r.events[0].start.kind, "utc");
  assert.equal(r.events[0].start.utc, "2026-09-28T09:00:00.000Z");
  assert.equal(r.events[0].start.preview, "2026-09-28 17:00:00");
  assert.equal(r.events[1].start.tzid, "America/Los_Angeles");
  assert.equal(r.events[1].start.offsetMinutes, -420);
  assert.equal(r.events[1].start.utc, "2026-09-28T20:30:00.000Z");
  assert.equal(r.events[1].start.preview, "2026-09-29 04:30:00");
  assert.equal(r.events[1].end.utc, "2026-09-28T21:15:00.000Z");
  assert.ok(r.events[1].start.warnings.some((w) => w.code === "approximate"));
  assert.equal(r.events[2].start.utc, "2026-09-28T08:00:00.000Z");
  assert.ok(r.events[2].start.warnings.some((w) => w.code === "customized"));
  assert.equal(r.events[3].start.kind, "floating");
  assert.equal(r.events[3].start.utc, null);
  assert.equal(r.events[3].start.preview, null);
  assert.equal(r.events[3].end.local, "2026-09-29 10:30:00");
  assert.ok(r.events[3].start.warnings.some((w) => w.code === "floating"));
  assert.ok(icsSummary(r).includes("DAYLIGHT UTC−07:00"));
  assert.ok(icsSummary(r, "zh").includes("无法确定"));
  assert.equal(r.original, ICS_SAMPLE);
});

test("ICS DTEND, DURATION, all-day and fractional-hour display offsets", () => {
  const r = inspectInvite(
    invite("DTSTART:20261231T233000Z\nDURATION:PT2H15M"),
    { displayOffsetMinutes: 330 },
  );
  assert.equal(r.events[0].end.utc, "2027-01-01T01:45:00.000Z");
  assert.equal(r.events[0].end.preview, "2027-01-01 07:15:00");
  const day = inspectInvite(
    invite("DTSTART;VALUE=DATE:20260928\nDURATION:P2D"),
  );
  assert.equal(day.events[0].end.local, "2026-09-30");
  assert.equal(day.events[0].start.utc, null);
  assert.equal(day.hasErrors, false);
  const week = inspectInvite(invite("DTSTART:20260928T090000Z\nDURATION:P1W"));
  assert.equal(week.events[0].end.utc, "2026-10-05T09:00:00.000Z");
  for (const body of [
    "DTSTART:20260928T090000Z\nDTEND:20260928T080000Z",
    "DTSTART:20260928T090000Z\nDTEND:20260928T100000Z\nDURATION:PT1H",
    "DTSTART:20260928T090000Z\nDURATION:-PT1H",
    "DTSTART:20260230T090000Z",
    "DTSTART;VALUE=DATE-TIME:20260928",
    "DTSTART;VALUE=DATE;TZID=Asia/Shanghai:20260928",
    "DTSTART:20260928T250000Z",
    "DTSTART:20260928T090000Z\nDTSTART:20260928T100000Z",
    "DTSTART;VALUE=DATE:20260928\nDURATION:PT1H",
    "DTSTART:20260928T090000Z\nDTEND;VALUE=DATE:20260929",
  ])
    assert.equal(inspectInvite(invite(body)).hasErrors, true, body);
  const empty = inspectInvite("not an invite");
  assert.equal(empty.hasErrors, true);
  assert.equal(empty.original, "not an invite");
});

test("ICS missing timezone stays unresolved; offset syntax and negative conversion work", () => {
  assert.equal(parseIcsOffset("-0730"), -450);
  assert.equal(parseIcsOffset("+054530"), 345.5);
  for (const value of ["+2460", "+9999", "0530", "no"])
    assert.equal(parseIcsOffset(value), null);
  const r = inspectInvite(
    invite("DTSTART;TZID=America/New_York:20260928T090000"),
  );
  assert.equal(r.events[0].start.utc, null);
  assert.ok(r.events[0].start.warnings.some((w) => w.code === "missing-zone"));
  const invalid = inspectInvite(
    invite(
      "DTSTART;TZID=Customized Time Zone:20260928T133000",
      customZone.replace("TZOFFSETTO:+0530", "TZOFFSETTO:broken"),
    ),
  );
  assert.equal(invalid.events[0].start.utc, null);
  assert.equal(invalid.rewritten, null);
  assert.equal(invalid.hasErrors, true);
});

test("ICS month rules support southern seasons, fallback warns, and historical eras are withheld", () => {
  const standard =
    "BEGIN:STANDARD\nTZOFFSETFROM:+1100\nTZOFFSETTO:+1000\nRRULE:FREQ=YEARLY;BYMONTH=4\nEND:STANDARD";
  const daylight =
    "BEGIN:DAYLIGHT\nTZOFFSETFROM:+1000\nTZOFFSETTO:+1100\nRRULE:FREQ=YEARLY;BYMONTH=10\nEND:DAYLIGHT";
  const zone = `BEGIN:VTIMEZONE\nTZID:Australia/Sydney\n${standard}\n${daylight}\nEND:VTIMEZONE`;
  for (const [month, offset] of [
    ["01", 660],
    ["07", 600],
    ["12", 660],
  ]) {
    const r = inspectInvite(
      invite(`DTSTART;TZID=Australia/Sydney:2026${month}15T090000`, zone),
    );
    assert.equal(r.events[0].start.offsetMinutes, offset);
  }
  const fallback = inspectInvite(
    invite(
      "DTSTART;TZID=Australia/Sydney:20260915T090000",
      zone.replaceAll(/RRULE:[^\n]+\n/g, ""),
    ),
  );
  assert.ok(fallback.events[0].start.offsetUsed.includes("fallback"));
  const historical = inspectInvite(
    invite(
      "DTSTART;TZID=Australia/Sydney:20260915T090000",
      zone.replace("END:VTIMEZONE", `${standard}\nEND:VTIMEZONE`),
    ),
  );
  assert.equal(historical.events[0].start.utc, null);
});

test("ICS invalid component recovery preserves good events, original lines and blocks rewriting", () => {
  const raw = invite(
    "SUMMARY:Still readable\nBROKEN LINE\nDTSTART:20260928T090000Z",
  ).replace("END:VEVENT", "");
  const r = inspectInvite(raw);
  assert.equal(r.hasErrors, true);
  assert.equal(r.events.length, 1);
  assert.equal(r.events[0].start.utc, "2026-09-28T09:00:00.000Z");
  assert.ok(r.warnings.some((w) => w.code === "syntax"));
  assert.ok(r.warnings.some((w) => w.code === "component"));
  assert.equal(r.original, raw);
  assert.equal(r.rewritten, null);
});

test("ICS guarded TZID relabel retains offsets, UTF-8 folded values, and original", () => {
  const raw = invite(
    `SUMMARY:${"时区".repeat(65)}\nDTSTART;TZID="Customized Time Zone":20260928T133000\nDTEND;TZID=Customized Time Zone:20260928T143000`,
    customZone,
  );
  const r = inspectInvite(raw);
  assert.ok(r.rewritten.includes("TZID:Asia/Kolkata"));
  assert.ok(r.rewritten.includes("TZID=Asia/Kolkata"));
  assert.ok(r.rewritten.includes("TZOFFSETTO:+0530"));
  assert.equal(r.original, raw);
  assert.equal(inspectInvite(r.rewritten).events[0].summary, "时区".repeat(65));
  assert.equal(
    inspectInvite(r.rewritten).events[0].start.utc,
    r.events[0].start.utc,
  );
  for (const line of r.rewritten.split("\r\n"))
    assert.ok(Buffer.byteLength(line) <= 75);
  assert.equal(
    inspectInvite(raw, { replacementTzid: "bad\nTZID:injection" }).rewritten,
    null,
  );
  assert.equal(
    inspectInvite(ICS_SAMPLE, { replacementTzid: "America/Los_Angeles" })
      .rewritten,
    null,
  );
  assert.equal(
    inspectInvite(
      raw.replace(
        'DTSTART;TZID="Customized Time Zone"',
        'RDATE;TZID="Customized Time Zone"',
      ),
    ).rewritten,
    null,
  );
  assert.equal(
    inspectInvite(raw, { displayOffsetMinutes: 9999 }).rewritten,
    null,
  );
});

import {
  MD_TABLE_DEFAULT,
  MD_TABLE_SAMPLE,
  MD_TABLE_SAMPLE_ALIGNMENTS,
  detectTableMode,
  parseTable,
  exportTable,
} from "../src/lib/engines/md-table.ts";
const convertTable = (raw, options = {}) =>
  parseTable({ ...MD_TABLE_DEFAULT, raw, ...options });

test("Day 020 detects TSV, quoted CSV and GFM; preserves zeros, empty cells and Chinese", () => {
  const raw = "编号\t选项\t备注\n00123\tA|B\t\n123\tC\t**bold**";
  const r = convertTable(raw);
  assert.equal(r.mode, "tsv");
  assert.equal(r.hasErrors, false);
  assert.deepEqual(r.grid[1], ["00123", "A|B", ""]);
  const md = exportTable(r, "md");
  assert.match(md, /00123/);
  assert.match(md, /A\\\|B/);
  assert.match(md, /\\\*\\\*bold\\\*\\\*/);
  const back = convertTable(md);
  assert.equal(back.mode, "markdown");
  assert.deepEqual(back.grid, r.grid);
  assert.equal(exportTable(back, "tsv"), raw.replaceAll("\n", "\r\n") + "\r\n");
  assert.equal(detectTableMode('name,note\nA,"inside\ttab"'), "csv");
});

test("Day 020 quoted CSV/TSV retain commas, quotes, CRLF, tabs and multiline data", () => {
  const r = convertTable(
    'ID,Note,Blank\r\n00123,"He said ""yes"", A|B",\r\n123,"first\r\nsecond\tline",\r\n',
  );
  assert.equal(r.hasErrors, false);
  assert.deepEqual(r.grid[1], ["00123", 'He said "yes", A|B', ""]);
  assert.equal(r.grid[2][1], "first\r\nsecond\tline");
  assert(r.issues.some((i) => /Multiline/.test(i.en) && !i.error));
  assert.match(exportTable(r, "md"), /first second\tline/);
  for (const format of ["csv", "tsv"]) {
    const output = exportTable(r, format);
    assert.deepEqual(convertTable(output, { mode: format }).grid, r.grid);
  }
});

test("Day 020 parses and emits all four GFM alignment markers", () => {
  const r = convertTable(
    "| 中文 | Center | Right | None |\n| :--- | :---: | ---: | --- |\n| 00123 | A\\|B | 7 | |\n",
  );
  assert.equal(r.hasErrors, false);
  assert.deepEqual(r.alignments, ["left", "center", "right", "none"]);
  assert.deepEqual(r.grid[1], ["00123", "A|B", "7", ""]);
  assert.match(exportTable(r, "md"), /\| :--- \| :---: \| ---: \| --- \|/);
  assert.deepEqual(convertTable(exportTable(r, "md")).alignments, r.alignments);
  const overridden = convertTable(exportTable(r, "md"), {
    alignments: ["right", "none", "left", "center"],
  });
  assert.match(
    exportTable(overridden, "md"),
    /\| ---: \| --- \| :--- \| :---: \|/,
  );
});

test("Day 020 Markdown roundtrip preserves literal escapes, HTML, entities and edge whitespace", () => {
  const cells = [
    "  padded  ",
    "\\",
    "\\|",
    "A|B",
    "**bold**",
    "_italics_",
    "`code`",
    "[link](https://example.com)",
    "<b>literal</b>",
    "&amp; &#32;",
    "~~strike~~",
    "\t tabs \t",
    "",
    "中文",
  ];
  const raw = [
    cells.map((_, i) => `Col ${i}`).join("\t"),
    cells
      .map((c) => (/[\t\n\r"]/.test(c) ? `"${c.replaceAll('"', '""')}"` : c))
      .join("\t"),
  ].join("\n");
  const r = convertTable(raw);
  assert.equal(r.hasErrors, false);
  assert.deepEqual(r.grid[1], cells);
  const back = convertTable(exportTable(r, "md"));
  assert.equal(back.hasErrors, false);
  assert.deepEqual(back.grid, r.grid);
  assert(!exportTable(r, "md").includes("<b>"));
});

test("Day 020 malformed Markdown retains every line and blocks exports, then recovers", () => {
  for (const raw of [
    "| H | Two |\n| --- | --- |\n| 00123 | A|B |\n| keep | this |",
    "| H | Two |\n| invalid | divider |\n| keep | this |",
    "| H | Two |\n| --- | --- |\n| only one |\n\ntrailing paragraph",
  ]) {
    const r = convertTable(raw, { mode: "markdown" });
    assert.equal(r.raw, raw);
    assert.equal(r.hasErrors, true);
    assert(r.grid.some((row) => row.some((c) => /keep|trailing/.test(c))));
    for (const format of ["md", "csv", "tsv"])
      assert.equal(exportTable(r, format), "");
  }
  assert.equal(
    convertTable("| H | Two |\n| --- | --- |\n| 00123 | A\\|B |").hasErrors,
    false,
  );
});

test("Day 020 incomplete CSV quotes and invalid characters never enable partial exports", () => {
  for (const raw of [
    'A,B\n"unclosed,00123',
    'A,B\n"closed"oops,00123',
    'A,B\nnon"quote,00123',
  ]) {
    const r = convertTable(raw, { mode: "csv" });
    assert.equal(r.raw, raw);
    assert.equal(r.hasErrors, true);
    assert.equal(exportTable(r, "csv"), "");
  }
});

test("Day 020 no-header and trim options preserve input; ragged CSV pads without discarding", () => {
  const raw = "00123,  A|B  ,\n123,second\n";
  const r = convertTable(raw, { firstRowHeader: false });
  assert.equal(r.hasErrors, false);
  assert.deepEqual(r.grid[1], ["123", "second", ""]);
  assert(r.issues.some((i) => /padded/.test(i.en)));
  const md = exportTable(r, "md");
  assert.match(md, /Column 1/);
  assert.equal(convertTable(md).grid.length, 3);
  assert.deepEqual(convertTable(exportTable(r, "csv")).grid, r.grid);
  const trimmed = convertTable(raw, { trimCells: true });
  assert.equal(trimmed.grid[0][1], "A|B");
  assert.equal(trimmed.raw, raw);
  assert.equal(r.grid[0][1], "  A|B  ");
});

test("Day 020 empty grids and oversized grids block export; blank records survive", () => {
  for (const raw of ["", "\n", "\t\n\t", ",\n,"]) {
    const r = convertTable(raw);
    assert.equal(r.hasErrors, true);
    assert.equal(exportTable(r, "md"), "");
  }
  const r = convertTable("A,B\n,\n00123,\n\n123,end\n");
  assert.equal(r.hasErrors, false);
  assert.equal(r.grid.length, 5);
  assert.deepEqual(convertTable(exportTable(r, "csv")).grid, r.grid);
  assert.equal(convertTable(Array(202).fill("x").join(",")).hasErrors, true);
  assert.equal(convertTable("x\n".repeat(10001)).hasErrors, true);
  assert.equal(convertTable("x".repeat(2 * 1024 * 1024 + 1)).hasErrors, true);
});

test("Day 020 real sample exercises multiline warning, mixed alignment and literal values", () => {
  const r = convertTable(MD_TABLE_SAMPLE, {
    alignments: MD_TABLE_SAMPLE_ALIGNMENTS,
  });
  assert.equal(r.hasErrors, false);
  assert.equal(r.grid[1][0], "00123");
  assert.equal(r.grid[1][1], "A|B");
  assert.equal(r.grid[2][2], "第一行\n第二行");
  assert.deepEqual(r.alignments, ["left", "center", "none", "right"]);
});

test("Day 020 auto-detection never consumes a one-column CSV value as a Markdown separator", () => {
  const r = convertTable("ID\n---\n00123\n");
  assert.equal(r.mode, "csv");
  assert.equal(r.hasErrors, false);
  assert.deepEqual(r.grid, [["ID"], ["---"], ["00123"]]);
  assert.deepEqual(convertTable(exportTable(r, "md")).grid, r.grid);
});

// Day 021: elapsed durations -> billed seconds -> integer cents, independent of bank signs.
import {
  TIMESHEET_DEFAULT,
  TIMESHEET_SAMPLE,
  parseTimesheet,
  parseDuration,
  wallTimeSeconds,
  roundSeconds,
  buildTimesheet,
  canExportTimesheet,
  exportTimesheet,
} from "../src/lib/engines/timesheet.ts";
const sheet = (raw, patch = {}) =>
  buildTimesheet({
    ...TIMESHEET_DEFAULT,
    raw,
    dateColumn: -1,
    clientColumn: 0,
    projectColumn: -1,
    descriptionColumn: -1,
    durationColumn: 1,
    billableColumn: -1,
    rateColumn: -1,
    ...patch,
  });

test("Day 021 all duration formats, day fractions and decimal comma are whole seconds", () => {
  for (const [text, format, seconds] of [
    ["01:10", "auto", 4200],
    ["27:03:04", "hms", 97384],
    ["1.5", "auto", 5400],
    ["1,5", "decimal", 5400],
    ["0.048611111111", "auto", 4200],
    ["0.048611111111", "day-fraction", 4200],
    ["0.5", "decimal", 1800],
    ["0.5", "auto", 43200],
    ["1", "auto", 86400],
    ["1", "decimal", 3600],
    ["0", "auto", 0],
  ])
    assert.equal(parseDuration(text, format), seconds, `${text} ${format}`);
  for (const text of [
    "-1:10",
    "-1.5",
    "1:60",
    "1:01:60",
    "",
    "oops",
    "Infinity",
    "1.2.3",
    "1e4",
    "999999999999999999:00",
  ])
    assert.equal(parseDuration(text), null, text);
  assert.equal(parseDuration("1.5", "day-fraction"), null);
  assert.equal(parseDuration("1.5", "hms"), null);
});

test("Day 021 RFC4180 BOM CRLF, escaped quotes, multiline CSV, TSV and blank records", () => {
  assert.deepEqual(
    parseTimesheet(
      '\uFEFFClient,Duration,Note\r\n"A, Inc",01:10,"He said ""yes""\r\nnext"\r\n',
    ),
    [
      ["Client", "Duration", "Note"],
      ["A, Inc", "01:10", 'He said "yes"\r\nnext'],
    ],
  );
  assert.deepEqual(parseTimesheet("Client\tDuration\nA\t1,5\n"), [
    ["Client", "Duration"],
    ["A", "1,5"],
  ]);
  assert.deepEqual(parseTimesheet("A,01:00\n\nB,02:00\n"), [
    ["A", "01:00"],
    [""],
    ["B", "02:00"],
  ]);
  assert.equal(sheet("Client\tDuration\nA\t1,5").totalCents, 9000);
  assert.equal(sheet('Client,Duration\nA,"1,5"').totalCents, 9000);
});

test("Day 021 optional header detection never consumes the first data record", () => {
  assert.equal(sheet("Client,Duration\nAcme,01:10").hasHeader, true);
  const r = sheet("Acme,01:10\nOther,00:30");
  assert.equal(r.hasHeader, false);
  assert.equal(r.rows.length, 2);
  assert.equal(r.totalCents, 10000);
  assert.equal(sheet("Client,01:00", { header: "no" }).rows.length, 1);
  assert.deepEqual(sheet("", { header: "yes" }).headers, []);
});

test("Day 021 overnight wall times wrap once; equal/invalid/negative times block exports", () => {
  assert.deepEqual(wallTimeSeconds("23:30", "01:00:00"), {
    seconds: 5400,
    overnight: true,
    equal: false,
  });
  assert.equal(wallTimeSeconds("24:00", "01:00"), null);
  assert.equal(wallTimeSeconds("-01:00", "01:00"), null);
  const r = sheet("Client,Start,End\nA,23:30,01:00", {
    durationColumn: -1,
    startColumn: 1,
    endColumn: 2,
  });
  assert.equal(r.hasErrors, false);
  assert.equal(r.totalCents, 9000);
  assert(
    r.issues.some((i) => i.code === "overnight" && i.severity === "warning"),
  );
  const equal = sheet("Client,Start,End\nA,01:00,01:00", {
    durationColumn: -1,
    startColumn: 1,
    endColumn: 2,
  });
  assert.equal(canExportTimesheet(equal), false);
  assert(equal.issues.some((i) => i.code === "equal-time"));
});

test("Day 021 rounding modes run on seconds before billing, including two-decimal hours", () => {
  for (const increment of [60, 360, 900, 36]) {
    assert.equal(roundSeconds(increment + 1, "none", increment), increment + 1);
    assert.equal(roundSeconds(increment + 1, "floor", increment), increment);
    assert.equal(roundSeconds(increment + 1, "ceil", increment), increment * 2);
    assert.equal(
      roundSeconds(increment * 1.5, "round", increment),
      increment * 2,
    );
    assert.equal(
      roundSeconds(Math.floor(increment * 1.4), "round", increment),
      increment,
    );
  }
  assert.throws(() => roundSeconds(60, "round", 0));
  const input = { ...TIMESHEET_DEFAULT, raw: TIMESHEET_SAMPLE };
  assert.equal(buildTimesheet(input).totalCents, 28800);
  assert.equal(
    buildTimesheet({ ...input, rounding: "round" }).totalCents,
    29000,
  );
  assert.equal(
    buildTimesheet({ ...input, rounding: "floor" }).totalCents,
    27800,
  );
  assert.equal(
    buildTimesheet({ ...input, rounding: "ceil" }).totalCents,
    29800,
  );
  assert.equal(
    buildTimesheet({ ...input, rounding: "round", increment: 36 }).totalCents,
    28880,
  );
  assert.equal(
    buildTimesheet({ ...input, rounding: "round" }).rows[0].roundingDelta,
    120,
  );
});

test("Day 021 money rounds half up per entry, grouping sums integer cents", () => {
  const r = sheet("Client,Duration\nA,00:00:01\nA,00:00:01\nA,00:00:01", {
    defaultRate: "18",
  });
  assert.equal(r.lines.length, 1);
  assert.equal(r.lines[0].seconds, 3);
  assert.equal(r.totalCents, 3); // Each entry = 0.5 cents -> 1 cent, not 2 cents total.
  assert.equal(r.lines[0].amountCents, 3);
  assert.deepEqual(r.lines[0].sourceRows, [2, 3, 4]);
});

test("Day 021 row override > exact client rate > default, distinct rates never blend", () => {
  const raw =
    "Client,Duration,Project,Rate,Description\nA,01:00,One,,Design\nA,01:00,Two,30,Build\nB,01:00,One,,Review\nA,00:30,One,0,Free";
  const opts = {
    projectColumn: 2,
    rateColumn: 3,
    descriptionColumn: 4,
    defaultRate: "10",
    clientRates: "client,rate\nA,20",
  };
  const r = sheet(raw, opts);
  assert.equal(r.hasErrors, false);
  assert.deepEqual(
    r.rows.map((r) => r.rateCents),
    [2000, 3000, 1000, 0],
  );
  assert.equal(r.totalCents, 6000);
  assert.equal(sheet(raw, { ...opts, group: "client" }).lines.length, 4);
  assert.equal(sheet(raw, { ...opts, group: "rows" }).lines.length, 4);
  const two = "Client,Duration,Project\nA,01:00,One\nA,01:00,Two";
  assert.equal(
    sheet(two, { projectColumn: 2, group: "project" }).lines.length,
    2,
  );
  assert.equal(
    sheet(two, { projectColumn: 2, group: "client" }).lines.length,
    1,
  );
  assert.equal(sheet(two, { projectColumn: 2, group: "rows" }).lines.length, 2);
  const missing = sheet("Client,Duration\nA,01:00", { defaultRate: "" });
  assert(missing.issues.some((i) => i.code === "rate"));
  assert.equal(canExportTimesheet(missing), false);
});

test("Day 021 per-row duration choice removes day-fraction ambiguity and preserves drafts", () => {
  const raw = "Client,Duration\nA,0.5\nA,0.048611111111";
  const r = sheet(raw, { rowFormats: ["decimal", ""] });
  assert.equal(r.rows[0].parsedSeconds, 1800);
  assert.equal(r.rows[1].parsedSeconds, 4200);
  assert.equal(r.totalCents, 10000);
  assert.deepEqual(r.input.rowFormats, ["decimal", ""]);
  assert(r.issues.some((i) => i.code === "fraction" && i.row === 3));
});

test("Day 021 inclusive date and billable filters preserve skipped rows in audit", () => {
  const raw =
    "Date,Client,Duration,Billable\n2026-10-01,A,01:00,yes\n2026-10-02,A,02:00,no\n2026-10-03,A,03:00,true";
  const options = {
    dateColumn: 0,
    clientColumn: 1,
    durationColumn: 2,
    billableColumn: 3,
    dateFrom: "2026-10-02",
    dateTo: "2026-10-03",
  };
  const r = sheet(raw, options);
  assert.equal(r.totalCents, 18000);
  assert.deepEqual(
    r.rows.map((r) => r.status),
    ["skipped", "skipped", "included"],
  );
  assert.equal(
    sheet(raw, { ...options, skipNonBillable: false }).totalCents,
    30000,
  );
  const empty = sheet(raw, { ...options, dateTo: "2026-10-02" });
  assert.equal(empty.hasErrors, false);
  assert.equal(canExportTimesheet(empty), false);
  assert.equal(exportTimesheet(empty, "csv"), "");
  assert.equal(JSON.parse(exportTimesheet(empty, "json")).rows.length, 3);
});

test("Day 021 malformed records remain auditable, gate exports and recover on correction", () => {
  for (const raw of [
    "Client,Duration\nA,-01:00\nB,01:00",
    "Client,Duration\nA,bad\nB,01:00",
    "Client,Duration\nA,1,5\nB,01:00",
    'Client,Duration\nA,"unclosed',
    'Client,Duration\nA,"01:00"oops',
  ]) {
    const r = sheet(raw);
    assert.equal(r.hasErrors, true, raw);
    assert.equal(exportTimesheet(r, "csv"), "");
    assert.equal(exportTimesheet(r, "md"), "");
    assert.equal(JSON.parse(exportTimesheet(r, "json")).input.raw, raw);
  }
  const recovered = sheet("Client,Duration\nA,01:10\nB,01:00");
  assert.equal(recovered.hasErrors, false);
  assert.equal(canExportTimesheet(recovered), true);
  assert.match(exportTimesheet(recovered, "csv"), /1\.166666667/);
});

test("Day 021 invalid mappings, rates, flags, dates and settings block invoice outputs", () => {
  for (const patch of [
    { clientColumn: 1 },
    { durationColumn: 99 },
    { durationColumn: -1 },
    { defaultRate: "-1" },
    { defaultRate: "1.001" },
    { defaultRate: "1000001" },
    { clientRates: "client,rate\nA,20\nA,30" },
    { clientRates: "A,bad" },
    { dateFrom: "2026-02-30" },
    { dateFrom: "2026-10-02", dateTo: "2026-10-01" },
    { increment: 0 },
    { rounding: "bogus" },
    { durationFormat: "bogus" },
    { group: "bogus" },
    { rowFormats: ["bogus"] },
  ])
    assert.equal(
      sheet("Client,Duration\nA,01:00", patch).hasErrors,
      true,
      JSON.stringify(patch),
    );
  assert.equal(
    sheet("Client,Duration,Billable\nA,01:00,maybe", { billableColumn: 2 })
      .hasErrors,
    true,
  );
  assert.equal(
    sheet("Client,Duration,Date\nA,01:00,2026-02-30", { dateColumn: 2 })
      .hasErrors,
    true,
  );
  assert.equal(sheet("x".repeat(2 * 1024 * 1024 + 1)).hasErrors, true);
  assert.equal(
    sheet("Client,Duration\n" + "A,01:00\n".repeat(10001)).hasErrors,
    true,
  );
});

test("Day 021 real sample exports cents, summary, full audit and display-math warnings", () => {
  const r = buildTimesheet({ ...TIMESHEET_DEFAULT, raw: TIMESHEET_SAMPLE });
  assert.equal(r.rows.length, 5);
  assert.equal(r.lines.length, 2);
  assert.equal(r.rows[4].status, "skipped");
  assert.equal(r.hasErrors, false);
  const csv = exportTimesheet(r, "csv");
  assert.deepEqual(parseTimesheet(csv)[0], [
    "client",
    "project",
    "description",
    "hours",
    "rate",
    "amount",
  ]);
  assert.equal(parseTimesheet(csv)[1][5], "230.00");
  assert.match(exportTimesheet(r, "md"), /Total amount: 288\.00/);
  assert.match(exportTimesheet(r, "md", "zh"), /工时发票摘要/);
  const audit = JSON.parse(exportTimesheet(r, "json"));
  assert.equal(audit.input.raw, TIMESHEET_SAMPLE);
  assert.equal(audit.rows[2].parsedSeconds, 4200);
  const mismatch = sheet("Client,Duration\nA,01:10", { defaultRate: "20" });
  assert.equal(mismatch.totalCents, 2333);
  assert(mismatch.issues.some((i) => i.code === "display"));
  const rounded = sheet("Client,Duration\nA,01:10", {
    defaultRate: "20",
    rounding: "round",
    increment: 36,
  });
  assert.equal(rounded.totalCents, 2340);
  assert.equal(
    rounded.issues.some((i) => i.code === "display"),
    false,
  );
});

import { timesheetMoney } from "../src/lib/engines/timesheet.ts";
test("Day 021 formats large safe-integer cents exactly and enforces no-header entry limit", () => {
  assert.equal(timesheetMoney(8784000000000099), "87840000000000.99");
  assert.equal(timesheetMoney(1), "0.01");
  assert.equal(timesheetMoney(0), "0.00");
  assert.equal(parseDuration("1.5", "unknown"), null);
  const r = sheet("A,01:00\n".repeat(10001), { header: "no" });
  assert.equal(r.hasErrors, true);
  assert.equal(exportTimesheet(r, "csv"), "");
});

import {
  parseBibtex,
  auditBibtex,
  normalizeDoi,
  braceAcronyms,
  BIBTEX_SAMPLE,
  remapCsv,
} from "../src/lib/engines/bibtex.ts";

test("BibTeX balances nested, quoted, escaped and multiline values and preserves special blocks", () => {
  const raw = String.raw`% shared library
@string{venue = "A" # "B"}
@preamble{"prefix"}
@comment{keep {nested} and \{escaped\}}
@book(one,
 title = {A {Nested} title with \{literal\} braces
 across lines},
 note = "A {quoted \"word\"} value",
 year = 2024,
 publisher = venue # { Press}
)
plain bibliography commentary`;
  const parsed = parseBibtex(raw);
  assert.equal(parsed.hasErrors, false, JSON.stringify(parsed.issues));
  assert.equal(parsed.entries.length, 1);
  assert.equal(parsed.entries[0].fields.length, 4);
  assert.equal(parsed.blocks.length, 3);
  assert.equal(auditBibtex(raw).merged, raw);
  assert.equal(
    parseBibtex("@comment(a (nested) comment)\n@book{k,title={x}}").hasErrors,
    false,
  );
});

test("BibTeX DOI, key and title/year matches form transitive clusters with primary selection and remaps", () => {
  assert.equal(normalizeDoi(" HTTPS://DX.DOI.ORG/10.1234/AbC "), "10.1234/abc");
  assert.equal(normalizeDoi("doi:10.1234/ABC"), "10.1234/abc");
  assert.equal(normalizeDoi("not-a-doi"), "");
  const report = auditBibtex(BIBTEX_SAMPLE);
  assert.equal(report.canExport, true);
  assert.equal(report.entries.length, 4);
  assert.equal(report.clusters.length, 2);
  assert.equal(report.clusters[0].primary, 0);
  assert.deepEqual(report.clusters[0].reasons, ["doi", "title+year"]);
  assert.deepEqual(
    report.remap.map((r) => [r.dropped_key, r.kept_key]),
    [
      ["attention2017", "vaswani2017"],
      ["sequence2020", "sequence2020"],
    ],
  );
  assert.equal(parseBibtex(report.merged).entries.length, 2);
  assert.match(report.merged, /@string/);
  assert.match(report.merged, /@preamble/);
  assert.match(report.merged, /@comment/);
  const selected = auditBibtex(BIBTEX_SAMPLE, {
    selections: [{ cluster: report.clusters[0].id, primary: 1 }],
  });
  assert.equal(selected.remap[0].kept_key, "attention2017");
  assert.match(
    remapCsv(selected.remap),
    /dropped_key,kept_key,reason\r\n"vaswani2017","attention2017"/,
  );
  const transitive = auditBibtex(
    "@misc{a,title={First},year=2020,doi={10.1234/x}}\n@misc{b,title={Second},year=2021,doi={10.1234/x}}\n@misc{c,title={{SECOND}!},year={2021}}",
  );
  assert.equal(transitive.clusters.length, 1);
  assert.deepEqual(transitive.clusters[0].entries, [0, 1, 2]);
});

test("BibTeX braces unprotected title and booktitle acronyms without double wrapping or touching macros", () => {
  const title = "{LSTM on GPU with {COVID} and 3D data}";
  const fixed = braceAcronyms(title);
  assert.equal(fixed, "{{LSTM} on {GPU} with {COVID} and {3D} data}");
  assert.equal(braceAcronyms(fixed), fixed);
  assert.equal(
    braceAcronyms('venue # "GPU and {LSTM}"'),
    'venue # "{GPU} and {LSTM}"',
  );
  const report = auditBibtex(BIBTEX_SAMPLE, { wrapAcronyms: true });
  assert.match(
    report.merged,
    /\{\{LSTM\} Models on \{GPU\} with \{COVID\} Data\}/,
  );
  assert.ok(report.issues.some((i) => i.en.includes("missing DOI")));
  assert.equal(auditBibtex(report.merged).acronyms.length, 0);
  assert.match(
    auditBibtex('@misc{a,booktitle="GPU Workshop"}', { wrapAcronyms: true })
      .merged,
    /"\{GPU\} Workshop"/,
  );
});

test("BibTeX syntax errors block merged exports and retain complete malformed source", () => {
  for (const raw of [
    "@string{}",
    "@article{broken, title={Unclosed}",
    '@book{x,title="unclosed}',
    "@book{x,title={a} year=2020}",
    "@book{x,title={a},title={b}}",
    '@string{foo = "bar"',
    '@preamble{"x"',
    "@comment{broken",
    "@article{x,title=}",
    "@misc{x,title={ok} # }",
  ]) {
    const report = auditBibtex(raw);
    assert.equal(report.hasErrors, true, raw);
    assert.equal(report.canExport, false, raw);
    assert.equal(report.merged, "", raw);
    assert.equal(report.raw, raw);
  }
  assert.equal(auditBibtex("").canExport, false);
});

test("BibTeX case-only keys warn without merging and unresolved macros cannot make false paper matches", () => {
  const report = auditBibtex(
    "@article{Key,title=shared,year=2024}\n@article{key,title=shared,year=2024}",
  );
  assert.equal(report.clusters.length, 0);
  assert.equal(report.keptCount, 2);
  assert.ok(report.issues.some((i) => i.en.includes("only by case")));
  const distinct = auditBibtex(
    "@misc{a,title={Same},year=2020}\n@misc{b,title={Same},year=2021}",
  );
  assert.equal(distinct.clusters.length, 0);
  const math =
    auditBibtex(String.raw`@misc{alpha,title={\alpha methods},year=2024}
@misc{beta,title={\beta methods},year=2024}`);
  assert.equal(
    math.clusters.length,
    0,
    "TeX command names retain semantic differences in titles",
  );
});
