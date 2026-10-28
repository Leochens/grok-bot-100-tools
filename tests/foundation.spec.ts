import { test, expect } from "@playwright/test";
const routes = [
  "day-002-chapter-drift-shifter",
  "day-003-kicad-solder-sorter",
  "day-004-svg-glyph-normalizer",
  "day-005-knit-swatch-recalculator",
  "day-006-retro-palette-quantizer",
  "day-007-css-cascade-deduper",
];
async function downloadedText(download: import("@playwright/test").Download) {
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}
test("22 researched source sets, authentic X/Reddit cards and safe direct original links", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".built-card")).toHaveCount(7);
  await page.getByRole("button", { name: /Explore all 100/ }).click();
  await expect(page.locator(".tool-card")).toHaveCount(100);
  await expect(page.locator(".built-card")).toHaveCount(22);
  await expect(page.locator(".similar-posts-badge")).toHaveCount(22);
  await expect(page.locator(".planned-card")).toHaveCount(0);
  const links = page.locator(".post-source-link");
  await expect(links).toHaveCount(22);
  for (const link of await links.all()) {
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    await expect(link).toHaveAttribute(
      "href",
      /^https:\/\/(x\.com|www\.reddit\.com)\//,
    );
  }
  await page.locator("#slot-2 .inspect-link").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".source-full.source-x")).toBeVisible();
  await expect(dialog.locator(".x-metrics").first()).toContainText("Replies");
  await expect(dialog.locator(".post-x-mark").first()).toHaveText("𝕏");
  await expect(
    dialog.getByRole("heading", {
      name: "All Matching Original Posts (X & Reddit)",
    }),
  ).toBeVisible();
  await expect(dialog.locator(".matching-posts .source-post-card")).toHaveCount(
    4,
  );
  await expect(
    dialog.locator(".matching-posts a.post-source-link"),
  ).toHaveCount(4);
  await page.keyboard.press("Escape");
  await page.locator("#slot-3 .inspect-link").click();
  await expect(dialog.locator(".source-full .subreddit-pill")).toHaveText(
    "r/KiCad",
  );
  await expect(dialog.locator(".source-full .reddit-metrics")).toContainText(
    "upvotes",
  );
  await dialog.getByRole("button", { name: "中文", exact: true }).click();
  await expect(
    dialog.getByRole("heading", { name: "同款痛点原帖汇总（点击直达）" }),
  ).toBeVisible();
  await expect(dialog.locator(".source-full")).toContainText(
    "先从原理图导出 BOM",
  );
});
test("chapter import, ripple undo, strict last-chapter validation, format export and persistence", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/tools/" + routes[0]);
  await page
    .getByRole("button", { name: "Load Sample Data", exact: true })
    .click();
  await expect(page.getByLabel("Chapter 2 start seconds")).toHaveValue("32");
  await page.getByLabel("Ripple shift (seconds, ±)").fill("10");
  await page.getByRole("button", { name: "Apply shift once" }).click();
  await expect(page.getByLabel("Chapter 2 start seconds")).toHaveValue("43.5");
  await page.getByRole("button", { name: "Undo shift" }).click();
  await expect(page.getByLabel("Chapter 2 start seconds")).toHaveValue("32");
  await page
    .getByLabel("Chapter 2 title", { exact: true })
    .fill("Edited chapter");
  await page.getByLabel("Total media duration (seconds)").fill("290");
  await expect(
    page.getByRole("button", { name: "Download chapters.txt" }),
  ).toBeDisabled();
  await page.getByLabel("Total media duration (seconds)").fill("360");
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download chapters.txt" }).click();
  expect(await downloadedText(await dl)).toContain("00:32 Edited chapter");
  await page
    .getByLabel("Export format", { exact: true })
    .selectOption("ffmetadata");
  await page.getByRole("button", { name: "Copy output" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "TIMEBASE=1/1000",
  );
  await page.waitForTimeout(250);
  await page.reload();
  await expect(page.getByLabel("Chapter 2 title", { exact: true })).toHaveValue(
    "Edited chapter",
  );
  await page
    .getByLabel("YouTube timestamps, FFmetadata or Podlove JSON")
    .fill("00:00 Introduction\nthis is broken");
  await expect(page.locator("main [role=alert]")).toContainText("Cannot parse");
  await expect(
    page.getByRole("button", { name: "Download chapters.ffmetadata" }),
  ).toBeDisabled();
});
test("BOM file import, per-designator persisted progress, DNP and genuine checklist download", async ({
  page,
}) => {
  await page.goto("/tools/" + routes[1]);
  await page
    .getByRole("button", { name: "Load Sample Data", exact: true })
    .click();
  await page.getByRole("checkbox", { name: "R2", exact: true }).check();
  await page
    .getByRole("checkbox", { name: "Show DNP / do not populate" })
    .check();
  await expect(
    page.getByRole("checkbox", { name: "R9", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Stage for R1,R2,R3").selectOption("2");
  await page.waitForTimeout(250);
  await page.reload();
  await expect(
    page.getByRole("checkbox", { name: "R2", exact: true }),
  ).toBeChecked();
  await expect(page.getByLabel("Stage for R1,R2,R3")).toHaveValue("2");
  await page.getByLabel("Export format", { exact: true }).selectOption("md");
  const dl = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download bench-assembly.md" })
    .click();
  const md = await downloadedText(await dl);
  expect(md).toContain("- [x] R2");
  expect(md).toContain("DNP — do not populate");
  await page.getByLabel("Open a local file").setInputFiles({
    name: "bench.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      'Reference,Value,Footprint,Qty,DNP\r\n"R30,R31","10k, precision",R_0603,2,\r\n',
    ),
  });
  await expect(
    page.getByRole("checkbox", { name: "R30", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: "R31", exact: true }),
  ).toBeVisible();
});
test("SVG real geometry import, optical correction, ZIP and path dictionary exports stay safe", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/tools/" + routes[2]);
  await page
    .getByRole("button", { name: "Load Sample Data", exact: true })
    .click();
  await expect(page.locator(".wb-glyph")).toHaveCount(3);
  await page
    .locator(".wb-glyph")
    .nth(1)
    .getByLabel("Outline shape")
    .selectOption("round");
  await page.getByLabel("Target grid preset").selectOption("icon");
  await expect(page.locator(".wb-glyph svg").first()).toHaveAttribute(
    "viewBox",
    "0 0 24 24",
  );
  const jsonDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download glyph-paths.json" }).click();
  const dict = JSON.parse(await downloadedText(await jsonDownload));
  expect(dict.em).toBe(24);
  expect(dict.glyphs.O.kind).toBe("round");
  expect(dict.glyphs.O.bounds.maxY).toBeCloseTo(21.3);
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download all SVGs as ZIP" }).click();
  expect((await dl).suggestedFilename()).toBe("normalized-glyphs.zip");
  await page
    .getByLabel("SVGs or shape fragments (use SVG id as glyph name)")
    .fill(
      '<svg id="curve"><g transform="translate(10,20)"><path d="M0 0 C0 100 100 100 100 0 Z"/></g></svg>',
    );
  await expect(page.locator(".wb-glyph")).toHaveCount(1);
  await expect(page.locator(".wb-glyph")).toContainText(
    "10.000, 20.000, 110.000, 95.000",
  );
  await page
    .getByLabel("SVGs or shape fragments (use SVG id as glyph name)")
    .fill('<svg><script>alert(1)</script><path d="M0 0h10v10z"/></svg>');
  await expect(page.locator("main [role=alert]")).toContainText(
    "Scripts and external content are rejected",
  );
  await expect(
    page.getByRole("button", { name: "Download all SVGs as ZIP" }),
  ).toBeDisabled();
  expect(errors).toEqual([]);
});
test("knitting calculations respond to measured gauge and calibrated structure, restore and export", async ({
  page,
}) => {
  await page.goto("/tools/" + routes[3]);
  await page.getByLabel("Blocked width (cm)", { exact: true }).fill("12");
  await page.getByLabel("Swatch stitches counted").fill("24");
  await expect(page.locator(".wb-calculation").first()).toContainText(
    "202 stitches",
  );
  await page.getByLabel("Stitch structure").first().selectOption("cable");
  await expect(page.getByLabel("Yarn take-up ratio").first()).toHaveValue(
    "1.3",
  );
  const dl = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download knit-calculation.json" })
    .click();
  const report = JSON.parse(await downloadedText(await dl));
  expect(report.result.rows[0].stitches).toBe(202);
  expect(report.result.skeins).toBeGreaterThan(0);
  await page.waitForTimeout(250);
  await page.reload();
  await expect(
    page.getByLabel("Blocked width (cm)", { exact: true }),
  ).toHaveValue("12");
  await page.getByLabel("Blocked width (cm)", { exact: true }).fill("0");
  await expect(page.locator("main [role=alert]")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Download knit-sections.csv" }),
  ).toBeDisabled();
});
test("palette quantization, CSS extraction, accessible sprite painting and palette export", async ({
  page,
}) => {
  await page.goto("/tools/" + routes[4]);
  await page
    .getByRole("button", { name: "Load Sample Data", exact: true })
    .click();
  await expect(page.locator(".wb-color-mapping>div")).toHaveCount(6);
  await page
    .getByLabel("Hex list, CSS variables or palette text")
    .fill("#my-icon { color: #55ffff; background: #000000; }");
  await expect(page.locator(".wb-color-mapping>div")).toHaveCount(2);
  await expect(page.locator(".wb-color-mapping")).toContainText("ΔE 0.0000");
  await page.getByRole("button", { name: "Paint register 2: #ff55ff" }).click();
  await page.getByRole("button", { name: "Pixel 1, 1", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Pixel 1, 1", exact: true }),
  ).toHaveCSS("background-color", "rgb(255, 85, 255)");
  const dl = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download hardware-palette.gpl" })
    .click();
  expect(await downloadedText(await dl)).toContain("GIMP Palette");
  await page.waitForTimeout(250);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Pixel 1, 1", exact: true }),
  ).toHaveCSS("background-color", "rgb(255, 85, 255)");
  await page
    .getByLabel("Hex list, CSS variables or palette text")
    .fill("#notacolor");
  await expect(page.locator("main [role=alert]")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Download hardware-palette.gpl" }),
  ).toBeDisabled();
});
test("CSS prunes duplicates without changing rendered cascade and isolates network-capable input", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (r) => {
    if (r.url().startsWith("https://example.invalid")) requests.push(r.url());
  });
  await page.goto("/tools/" + routes[5]);
  await page
    .getByRole("button", { name: "Load Sample Data", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Shorthand / longhand cascade map" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Select equal-value duplicates" })
    .click();
  const before = page
      .frameLocator('iframe[title="Before CSS preview"]')
      .locator(".card"),
    after = page
      .frameLocator('iframe[title="After CSS preview"]')
      .locator(".card");
  await expect(before).toBeVisible();
  await expect(after).toBeVisible();
  const read = async (loc: typeof before) =>
    loc.evaluate((el) => {
      const s = getComputedStyle(el);
      return [s.margin, s.padding, s.color, s.border];
    });
  expect(await read(before)).toEqual(await read(after));
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download deduplicated.css" }).click();
  const output = await downloadedText(await dl);
  expect(output).toContain("!important");
  expect(output.length).toBeLessThan(460);
  await expect(page.locator(".diff-remove")).not.toHaveCount(0);
  await page
    .getByLabel("CSS source")
    .fill(
      '@import url("https://example.invalid/tracker.css"); .card { background:url("https://example.invalid/x.png"); content:"</style><script>alert(1)</script>"; }',
    );
  await page.waitForTimeout(200);
  expect(requests).toEqual([]);
  await page.getByLabel("CSS source").fill(".a{color:red");
  await expect(page.locator("main [role=alert]")).toContainText(
    "CSS parse error",
  );
  await expect(
    page.getByRole("button", { name: "Download deduplicated.css" }),
  ).toBeDisabled();
});
for (const slug of routes)
  test(`Chinese, offline workflow, reload and mobile layout: ${slug}`, async ({
    page,
    context,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/tools/" + slug);
    await page.getByRole("button", { name: "中文", exact: true }).click();
    await page
      .getByRole("button", { name: "加载示例数据", exact: true })
      .click();
    await context.setOffline(true);
    await expect(page.locator("html")).toHaveAttribute("lang", "zh");
    await expect(page.getByRole("heading", { level: 1 })).not.toContainText(
      "Workbench",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("button", { name: /^下载 / }).first(),
    ).toBeEnabled();
    const dl = page.waitForEvent("download");
    await page
      .getByRole("button", { name: /^下载 / })
      .first()
      .click();
    expect((await dl).suggestedFilename()).toBeTruthy();
    await context.setOffline(false);
    await page.waitForTimeout(250);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "zh");
    await page
      .getByRole("button", { name: "重置本地数据", exact: true })
      .click();
    expect(errors).toEqual([]);
  });

test("every Day 001–022 modal contains its primary and 2–3 distinct direct source links", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Explore all 100/ }).click();
  for (let day = 1; day <= 22; day++) {
    await page.locator(`#slot-${day} .similar-posts-badge`).click();
    const dialog = page.getByRole("dialog");
    const hrefs = await dialog
      .locator(".matching-posts .post-source-link")
      .evaluateAll((nodes) =>
        nodes.map((n) => ({
          href: (n as HTMLAnchorElement).href,
          target: (n as HTMLAnchorElement).target,
          rel: (n as HTMLAnchorElement).rel,
        })),
      );
    expect(hrefs.length).toBeGreaterThanOrEqual(3);
    expect(hrefs.length).toBeLessThanOrEqual(4);
    expect(new Set(hrefs.map((x) => x.href)).size).toBe(hrefs.length);
    await expect(
      dialog.locator(".source-full .post-source-link"),
    ).toHaveAttribute("href", hrefs[0].href);
    for (const link of hrefs) {
      expect(link.href).toMatch(/^https:\/\/(x\.com|www\.reddit\.com)\//);
      expect(link.target).toBe("_blank");
      expect(link.rel).toBe("noopener noreferrer");
    }
    await expect(dialog.locator(".dialog-launch")).toHaveCount(1);
    await page.keyboard.press("Escape");
  }
});
test("invalid chapter source stays blocked across reload and corrupt nested drafts cannot crash tools", async ({
  page,
}) => {
  await page.goto("/tools/" + routes[0]);
  await page
    .getByRole("button", { name: "Load Sample Data", exact: true })
    .click();
  await page
    .getByLabel("YouTube timestamps, FFmetadata or Podlove JSON")
    .fill("00:00 intro\nbroken");
  await page.waitForTimeout(250);
  await page.reload();
  await expect(page.locator("main [role=alert]")).toContainText("Cannot parse");
  await expect(
    page.getByRole("button", { name: "Download chapters.txt" }),
  ).toBeDisabled();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.evaluate(() => {
    localStorage.setItem(
      "one-hundred:chapters:v1",
      JSON.stringify({
        raw: "",
        chapters: [null, { title: 17, start: "bad" }],
      }),
    );
    localStorage.setItem(
      "one-hundred:knit:v1",
      JSON.stringify({ sections: [null] }),
    );
  });
  await page.reload();
  await page
    .getByRole("button", { name: "Load Sample Data", exact: true })
    .click();
  await expect(page.getByLabel("Chapter 2 title", { exact: true })).toHaveValue(
    "The first chapter",
  );
  await page.goto("/tools/" + routes[3]);
  await expect(page.locator(".wb-calculation")).toHaveCount(3);
  expect(errors).toEqual([]);
});
test("sprite JSON roundtrip restores the hardware registers and both pixel layers", async ({
  page,
}) => {
  await page.goto("/tools/" + routes[4]);
  await page
    .getByRole("button", { name: "Load Sample Data", exact: true })
    .click();
  await page.getByRole("button", { name: "Paint register 2: #ff55ff" }).click();
  await page.getByRole("button", { name: "Pixel 1, 1", exact: true }).focus();
  await page.keyboard.press("Enter");
  const exported = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download editable sprite JSON" })
    .click();
  const json = await downloadedText(await exported);
  await page
    .getByRole("button", { name: "Reset Local State", exact: true })
    .click();
  await page
    .getByText("Restore an editable sprite JSON", { exact: true })
    .click();
  await page.getByLabel("Sprite JSON", { exact: true }).fill(json);
  await page
    .getByRole("button", { name: "Restore sprite", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Pixel 1, 1", exact: true }),
  ).toHaveCSS("background-color", "rgb(255, 85, 255)");
  const png = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download sprite PNG" }).click();
  const stream = await (await png).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const bytes = Buffer.concat(chunks);
  expect(bytes.subarray(1, 4).toString()).toBe("PNG");
  expect(bytes.readUInt32BE(16)).toBe(8);
  expect(bytes.readUInt32BE(20)).toBe(8);
});
test("retired and unknown workbench routes return 404 instead of a fallback solver", async ({
  request,
}) => {
  expect(
    (await request.get("/tools/day-016-coffee-water-blender")).status(),
  ).toBe(404);
  expect(
    (await request.get("/tools/day-018-led-resistor-budget")).status(),
  ).toBe(404);
  expect((await request.get("/tools/not-a-real-tool")).status()).toBe(404);
});

test("projector real measurements, mm SVG/export, persistence, bilingual controls and reset", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/tools/day-015-projector-grid-calibrator");
  await expect(
    page.getByRole("heading", { name: "Pattern Projector Grid Calibrator." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Download projector-calibration.json" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Load Sample Data", exact: true })
    .click();
  await expect(
    page.getByLabel("Center width (cm)", { exact: true }),
  ).toHaveValue("5.09");
  await expect(page.locator(".wb-calculation")).toContainText("9/9");
  await page.getByLabel("Center width (cm)", { exact: true }).fill("5.2");
  const svgDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download projector-grid.svg" })
    .click();
  const svg = await downloadedText(await svgDownload);
  expect(svg).toContain('width="600mm" height="450mm" viewBox="0 0 600 450"');
  expect(svg).toContain('id="center"');
  const jsonDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download projector-calibration.json" })
    .click();
  const json = JSON.parse(await downloadedText(await jsonDownload));
  expect(
    json.readings.find((r: { zone: string }) => r.zone === "center").widthMm,
  ).toBe(52);
  expect(json.report.status).toBe("adjust");
  const csvDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download projector-measurements.csv" })
    .click();
  const csvRows = (await downloadedText(await csvDownload)).split("\r\n");
  const center = csvRows.find((row) => row.startsWith("center,"))!.split(",");
  expect(Number(center[2])).toBe(52);
  expect(Number(center[3])).toBeCloseTo(50.2, 8);
  await page.waitForTimeout(250);
  await page.reload();
  await expect(
    page.getByLabel("Center width (cm)", { exact: true }),
  ).toHaveValue("5.2");
  await page.getByLabel("Measurement unit", { exact: true }).selectOption("mm");
  await expect(
    page.getByLabel("Center width (mm)", { exact: true }),
  ).toHaveValue("52");
  await expect(
    page.getByLabel("Target square side (mm)", { exact: true }),
  ).toHaveValue("50");
  await page.getByLabel("Center height (mm)", { exact: true }).fill("");
  await expect(page.locator("main [role=alert]")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Download projector-calibration.json" }),
  ).toBeDisabled();
  await page.getByLabel("Center height (mm)", { exact: true }).fill("50");
  await page.getByLabel("Chart width (mm)", { exact: true }).fill("10");
  await expect(
    page.getByRole("button", { name: "Download projector-grid.svg" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Reset Local State", exact: true })
    .click();
  await page.getByRole("button", { name: "中文", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "缝纫投影网格校准器." }),
  ).toBeVisible();
  await expect(page.getByLabel("中心宽（cm）", { exact: true })).toHaveValue(
    "",
  );
  await expect(
    page.getByRole("button", { name: "下载 projector-calibration.json" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "加载示例数据", exact: true }).click();
  await expect(page.locator(".wb-calculation")).toContainText("需要调整");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await context.setOffline(true);
  await page.getByLabel("中心宽（cm）", { exact: true }).fill("5.3");
  await expect(page.locator(".wb-stats")).toContainText("6.00%");
  await context.setOffline(false);
  await page
    .getByRole("button", { name: "查看 Reddit 原帖", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").locator(".matching-posts a.post-source-link"),
  ).toHaveCount(3);
  expect(errors).toEqual([]);
});

test("recipe servings, pivot units, real imports/exports, recovery, Chinese and reset", async ({
  page,
  context,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const route = "/tools/day-016-recipe-serving-scaler";
  const ssr = await (await request.get(route)).text();
  expect(ssr).toContain("Recipe Serving &amp; Unit Scaler");
  await page.goto(route);
  await expect(
    page.getByRole("button", { name: "Download scaled-recipe.txt" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Load Sample Data", exact: true })
    .click();
  await page.getByLabel("Target servings", { exact: true }).fill("8");
  await expect(page.locator(".wb-calculation")).toContainText("×2");
  await expect(
    page.getByRole("cell", { name: "3 cup vegetable stock", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "1 kg potatoes, diced", exact: true }),
  ).toBeVisible();
  for (const filename of [
    "scaled-recipe.txt",
    "recipe-report.json",
    "recipe-ingredients.csv",
  ]) {
    const waiting = page.waitForEvent("download");
    await page
      .getByRole("button", { name: `Download ${filename}`, exact: true })
      .click();
    const download = await waiting;
    expect(download.suggestedFilename()).toBe(filename);
    const content = await downloadedText(download);
    if (filename.endsWith(".json")) {
      const report = JSON.parse(content);
      expect(report.factor).toBe(2);
      expect(report.inputs.targetServings).toBe(8);
      expect(
        report.rows.find((r: { name: string }) => r.name === "potatoes, diced")
          .scaledAmount,
      ).toBe(1000);
    } else if (filename.endsWith(".csv")) {
      expect(content).toContain('"scaled_amount_original_unit"');
      expect(content).toContain('"potatoes, diced","500","g","1000","1","kg"');
    } else expect(content).toContain("3 cup vegetable stock");
  }
  await page.waitForTimeout(250);
  await page.reload();
  await expect(page.getByLabel("Target servings", { exact: true })).toHaveValue(
    "8",
  );
  await page.getByLabel("Original servings", { exact: true }).fill("0");
  await expect(page.locator("main [role=alert]")).toContainText(
    "between 0.05 and 100",
  );
  await expect(
    page.getByRole("button", { name: "Download scaled-recipe.txt" }),
  ).toBeDisabled();
  await page.getByLabel("Original servings", { exact: true }).fill("4");
  await page.getByLabel("Scale mode", { exact: true }).selectOption("pivot");
  await page.getByLabel("Pivot ingredient", { exact: true }).selectOption("4");
  await page.getByLabel("Desired unit", { exact: true }).selectOption("kg");
  await page.getByLabel("Desired amount", { exact: true }).fill("3/4");
  await expect(page.locator(".wb-calculation")).toContainText("×1.5");
  await expect(
    page.getByRole("cell", { name: "750 g potatoes, diced", exact: true }),
  ).toBeVisible();
  expect(
    await page
      .getByLabel("Desired unit", { exact: true })
      .locator("option")
      .allTextContents(),
  ).not.toContain("cup");
  await page.getByRole("button", { name: "中文", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "食谱份量与单位换算器",
  );
  await expect(page.getByLabel("目标用量", { exact: true })).toHaveValue("3/4");
  await expect(page.getByLabel("缩放方式", { exact: true })).toHaveValue(
    "pivot",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await context.setOffline(true);
  await page.getByLabel("目标用量", { exact: true }).fill("1");
  await expect(page.locator(".wb-calculation")).toContainText("×2");
  await context.setOffline(false);
  await page.getByRole("button", { name: "重置本地数据", exact: true }).click();
  await expect(page.getByLabel("食材表", { exact: true })).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "下载 scaled-recipe.txt", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await page.getByLabel("Open a local file", { exact: true }).setInputFiles({
    name: "dinner.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Sauce:\n1/2 cup yogurt\n1-2 tsp salt\nsalt to taste"),
  });
  await page.getByLabel("Target servings", { exact: true }).fill("8");
  await expect(page.locator("main [role=alert]")).toContainText(
    "preserved unchanged",
  );
  await expect(
    page.getByRole("cell", { name: "1 cup yogurt", exact: true }),
  ).toBeVisible();
  const recovery = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download scaled-recipe.txt", exact: true })
    .click();
  expect(await downloadedText(await recovery)).toContain(
    "[UNPARSED — NOT SCALED] 1-2 tsp salt",
  );
  await page
    .getByRole("button", { name: "View Original Reddit Post", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").locator(".matching-posts a.post-source-link"),
  ).toHaveCount(3);
  expect(errors).toEqual([]);
});

test("sourdough true hydration, percentages, ratio scaling, exports, local drafts, Chinese and reset", async ({
  page,
  context,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const route = "/tools/day-017-sourdough-bakers-percent";
  expect(await (await request.get(route)).text()).toContain(
    "Sourdough Baker’s Percentage Recalculator",
  );
  await page.goto(route);
  await page
    .getByRole("button", { name: "View Original X Post", exact: true })
    .click();
  const sourceDialog = page.getByRole("dialog");
  await expect(sourceDialog.locator(".source-full.source-x")).toBeVisible();
  await expect(sourceDialog.locator(".matching-posts .source-x")).toHaveCount(
    2,
  );
  await expect(
    sourceDialog.locator(".matching-posts .source-reddit"),
  ).toHaveCount(2);
  expect(
    await sourceDialog
      .locator(".matching-posts a.post-source-link")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href"))),
  ).toEqual([
    "https://x.com/jakubbied/status/2108814998252277870",
    "https://x.com/samibobammie/status/2108731194556678499",
    "https://www.reddit.com/r/Sourdough/comments/1rvvigt/hydration_help/",
    "https://www.reddit.com/r/Sourdough/comments/1pjwrbs/i_have_a_dumb_question_how_is_hydration_calculated/",
  ]);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", {
      name: "Download sourdough-formula.txt",
      exact: true,
    }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Load Sample Data", exact: true })
    .click();
  await expect(page.locator(".wb-calculation")).toContainText(
    "True hydration: 77.273%",
  );
  await expect(page.locator(".wb-stats")).toContainText("Dough weight: 985 g");
  await page.getByLabel("Scale mode", { exact: true }).selectOption("dough");
  await page.getByLabel("Target weight (g)", { exact: true }).fill("1970");
  await expect(page.locator(".wb-calculation")).toContainText("×2");
  await expect(page.locator(".wb-stats")).toContainText("Total flour: 1,100 g");
  for (const filename of [
    "sourdough-formula.txt",
    "sourdough-report.json",
    "sourdough-ingredients.csv",
  ]) {
    const waiting = page.waitForEvent("download");
    await page
      .getByRole("button", { name: `Download ${filename}`, exact: true })
      .click();
    const download = await waiting;
    expect(download.suggestedFilename()).toBe(filename);
    const content = await downloadedText(download);
    if (filename.endsWith(".json")) {
      const r = JSON.parse(content);
      expect(r.factor).toBe(2);
      expect(r.doughWeight).toBe(1970);
      expect(r.trueHydrationPct).toBeCloseTo(77.27272727, 7);
      expect(r.starterSplit).toEqual({ flour: 100, water: 100 });
    } else if (filename.endsWith(".csv"))
      expect(content).toContain('"flour","Bread flour","900"');
    else {
      expect(content).toContain("True hydration: 77.2727272727%");
      expect(content).toContain("do not add again");
    }
  }
  await page.waitForTimeout(250);
  await page.reload();
  await expect(
    page.getByLabel("Target weight (g)", { exact: true }),
  ).toHaveValue("1970");
  await page
    .getByLabel("Scale mode", { exact: true })
    .selectOption("totalFlour");
  await page.getByLabel("Target weight (g)", { exact: true }).fill("825");
  await expect(page.locator(".wb-calculation")).toContainText("×1.5");
  await expect(page.locator(".wb-stats")).toContainText(
    "Dough weight: 1,477.5 g",
  );
  await page.getByLabel("Scale mode", { exact: true }).selectOption("none");
  await page.getByLabel("Input mode", { exact: true }).selectOption("percent");
  await page.getByLabel("Added water (%)", { exact: true }).fill("70");
  await expect(page.locator(".wb-calculation")).toContainText("79.091%");
  await page
    .getByLabel("Percentage anchor", { exact: true })
    .selectOption("dough");
  await page.getByLabel("Anchor weight (g)", { exact: true }).fill("2000");
  await expect(page.locator(".wb-stats")).toContainText(
    "Dough weight: 2,000 g",
  );
  await page.getByLabel("Starter hydration (%)", { exact: true }).fill("0");
  await expect(page.locator("main [role=alert]")).toContainText("1 to 1,000");
  await expect(
    page.getByRole("button", {
      name: "Download sourdough-formula.txt",
      exact: true,
    }),
  ).toBeDisabled();
  await page.getByLabel("Starter hydration (%)", { exact: true }).fill("100");
  await page.getByLabel("Flour 1 (%)", { exact: true }).fill("90");
  await expect(page.locator("main [role=alert]")).toContainText(
    "must equal 100%",
  );
  await page
    .getByRole("button", { name: "Load Sample Data", exact: true })
    .click();
  await page.getByRole("button", { name: "Add flour", exact: true }).click();
  await page.getByLabel("Flour 3 name", { exact: true }).fill("Rye");
  await page.getByLabel("Flour 3 (g)", { exact: true }).fill("50");
  await expect(page.locator(".wb-calculation")).toContainText("70.833%");
  await page
    .getByRole("button", { name: "Remove Flour 3", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add other ingredient", exact: true })
    .click();
  await page
    .getByLabel("Other ingredient 1 name", { exact: true })
    .fill("Milk");
  await page.getByLabel("Other ingredient 1 (g)", { exact: true }).fill("100");
  await expect(page.locator(".wb-calculation")).toContainText("77.273%");
  await expect(page.locator(".wb-stats")).toContainText(
    "Dough weight: 1,085 g",
  );
  await page.getByRole("button", { name: "中文", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "酸面包含水量和配方换算器",
  );
  await expect(page.getByLabel("其他食材 1 名称", { exact: true })).toHaveValue(
    "Milk",
  );
  await expect(page.locator(".wb-calculation")).toContainText("真实含水量");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await context.setOffline(true);
  await page.getByLabel("另加水量 (g)", { exact: true }).fill("400");
  await expect(page.locator(".wb-calculation")).toContainText("81.818%");
  await context.setOffline(false);
  await page.getByRole("button", { name: "查看 X 原帖", exact: true }).click();
  await expect(
    page.getByRole("dialog").locator(".matching-posts a.post-source-link"),
  ).toHaveCount(4);
  await expect(
    page.getByRole("dialog").locator(".source-full .post-source-link"),
  ).toHaveAttribute(
    "href",
    "https://x.com/jakubbied/status/2108814998252277870",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "重置本地数据", exact: true }).click();
  await expect(page.getByLabel("面粉 1 (g)", { exact: true })).toHaveValue("0");
  await expect(
    page.getByRole("button", {
      name: "下载 sourdough-formula.txt",
      exact: true,
    }),
  ).toBeDisabled();
  await page.waitForTimeout(250);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh");
  await expect(page.getByLabel("面粉 1 (g)", { exact: true })).toHaveValue("0");
  expect(errors).toEqual([]);
});

test("bank CSV normalization, reconciliation, error recovery, exports, local drafts, Chinese sources and reset", async ({
  page,
  request,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const route = "/tools/day-018-bank-csv-normalizer";
  const ssr = await request.get(route);
  expect(ssr.status()).toBe(200);
  expect(await ssr.text()).toContain(
    "Bank &amp; Card CSV Debit/Credit Normalizer",
  );
  await page.goto(route);
  const csvButton = page.getByRole("button", {
    name: "Download normalized-statement.csv",
    exact: true,
  });
  await expect(csvButton).toBeDisabled();
  await page
    .getByRole("button", { name: "Load Sample Data", exact: true })
    .click();
  await expect(page.locator(".wb-stats")).toContainText("Net change: 1195.31");
  await expect(page.locator(".wb-stats")).toContainText(
    "Total outflow: -54.69",
  );
  await expect(page.locator(".wb-calculation")).toHaveText("Balance matched");
  await expect(page.locator(".wb-table tbody tr")).toHaveCount(3);
  await expect(page.locator(".wb-table tbody")).toContainText("2026-04-05");
  await expect(page.locator(".wb-table tbody")).toContainText("1295.31");
  for (const filename of [
    "normalized-statement.csv",
    "bank-audit.json",
    "reconciliation-summary.txt",
  ]) {
    const waiting = page.waitForEvent("download");
    await page
      .getByRole("button", { name: `Download ${filename}`, exact: true })
      .click();
    const download = await waiting;
    expect(download.suggestedFilename()).toBe(filename);
    const content = await downloadedText(download);
    if (filename.endsWith(".json")) {
      const r = JSON.parse(content);
      expect(r.netChangeCents).toBe(119531);
      expect(r.reconciled).toBe(true);
      expect(r.rows[2].runningBalanceCents).toBe(129531);
      expect(r.mapping.rawCsv).toContain("Corner Market");
    } else if (filename.endsWith(".csv")) {
      expect(content).toContain('"Date","Payee","Amount","Description"');
      expect(content).toContain(
        '"2026-04-05","Corner Market, Downtown","-42.35"',
      );
    } else expect(content).toContain("Balance matched");
  }
  await page.getByLabel("Invert all signs", { exact: true }).check();
  await expect(page.locator(".wb-stats")).toContainText("Net change: -1195.31");
  await expect(page.locator(".wb-calculation")).toContainText(
    "-2390.62 (-239062 cents)",
  );
  await page.reload();
  await expect(
    page.getByLabel("Invert all signs", { exact: true }),
  ).toBeChecked();
  await page.getByLabel("Invert all signs", { exact: true }).uncheck();
  await page
    .getByLabel("Date order for slash dates", { exact: true })
    .selectOption("YMD");
  await expect(csvButton).toBeDisabled();
  await expect(page.locator(".wb-issues")).toContainText("Invalid date");
  await expect(page.locator(".wb-table tbody tr")).toHaveCount(3);
  const diagnosticWaiting = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download bank-audit.json", exact: true })
    .click();
  const diagnostic = JSON.parse(await downloadedText(await diagnosticWaiting));
  expect(diagnostic.hasErrors).toBe(true);
  expect(diagnostic.rows).toHaveLength(3);
  expect(
    diagnostic.issues.filter((i: { code: string }) => i.code === "date"),
  ).toHaveLength(3);
  await page
    .getByLabel("Date order for slash dates", { exact: true })
    .selectOption("DMY");
  await expect(csvButton).toBeEnabled();
  await expect(page.locator(".wb-table tbody")).toContainText("2026-05-04");
  // A real file follows the same parser; credit-card charges start positive.
  await page.getByLabel("Open a local file", { exact: true }).setInputFiles({
    name: "card.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "Date,Payee,Description,Amount\n2026-04-05,Store,Charge,25.10\n2026-04-06,Card payment,Payment,10.00-",
    ),
  });
  await page.getByLabel("Amount mode", { exact: true }).selectOption("signed");
  await page.getByLabel("Amount column", { exact: true }).selectOption("3");
  await page.getByLabel("Invert all signs", { exact: true }).check();
  await expect(page.locator(".wb-stats")).toContainText("Net change: -15.10");
  await expect(csvButton).toBeEnabled();
  await page
    .getByLabel("Raw statement CSV", { exact: true })
    .fill("Date,Payee,Description,Amount\n2026-02-30,Store,Charge,25.10");
  await expect(csvButton).toBeDisabled();
  await expect(page.locator(".wb-table tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "中文", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "银行与信用卡账单 CSV 正负号规整器",
  );
  await expect(page.locator(".wb-error")).toContainText("CSV 导出已暂停");
  await page.getByRole("button", { name: "查看 X 原帖", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".matching-posts .source-x")).toHaveCount(2);
  await expect(dialog.locator(".matching-posts .source-reddit")).toHaveCount(2);
  expect(
    await dialog
      .locator(".matching-posts a.post-source-link")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href"))),
  ).toEqual([
    "https://x.com/ZeraBooks/status/2112257475025965093",
    "https://x.com/akhilworks/status/2111334566699139278",
    "https://www.reddit.com/r/MonarchMoney/comments/1mtabox/csv_imports_theres_got_to_be_a_better_way/",
    "https://www.reddit.com/r/MonarchMoney/comments/18p9vot/imported_credit_card_transactions_showing_up_as/",
  ]);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "重置本地数据", exact: true }).click();
  await expect(page.getByLabel("原始账单 CSV", { exact: true })).toHaveValue(
    "",
  );
  await expect(
    page.getByRole("button", {
      name: "下载 normalized-statement.csv",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(page.getByLabel("期初余额", { exact: true })).toHaveValue("");
  await page.getByRole("button", { name: "加载示例数据", exact: true }).click();
  await expect(page.locator(".wb-calculation")).toHaveText("余额吻合");
  await context.setOffline(true);
  await page.getByLabel("反转全部正负号", { exact: true }).check();
  await expect(page.locator(".wb-stats")).toContainText("净变动: -1195.31");
  await context.setOffline(false);
  expect(errors).toEqual([]);
});

test("Day 019 ICS invite: real offsets, warnings, file bytes, exports, local draft and 中文", async ({
  page,
  request,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const route = "/tools/day-019-ics-timezone-preview";
  const ssr = await request.get(route);
  expect(ssr.status()).toBe(200);
  expect(await ssr.text()).toContain("Calendar Invite ICS Timezone Preview");
  expect(
    (await request.get("/tools/day-019-adif-log-reconciler")).status(),
  ).toBe(404);
  expect(
    (await request.get("/tools/day-020-ics-timezone-inspector")).status(),
  ).toBe(404);
  await page.goto(route);
  const rewrite = page.getByRole("button", {
    name: "Download invite-rewritten.ics",
    exact: true,
  });
  await expect(rewrite).toBeDisabled();
  await page
    .getByRole("button", { name: "Load Sample Data", exact: true })
    .click();
  await expect(page.locator(".ics-event")).toHaveCount(4);
  await expect(page.locator(".ics-event").nth(1)).toContainText(
    "2026-09-28T20:30:00.000Z",
  );
  await expect(page.locator(".ics-event").nth(2)).toContainText(
    "Customized Time Zone",
  );
  await expect(page.locator(".ics-event").nth(3)).toContainText(
    "Floating time: no timezone",
  );
  await page
    .getByLabel("Display-zone preset", { exact: true })
    .selectOption("1");
  await expect(page.locator(".ics-event").first()).toContainText(
    "2026-09-28 17:00:00",
  );
  await expect(rewrite).toBeEnabled();
  await page
    .locator(".ics-event")
    .nth(1)
    .screenshot({ path: test.info().outputPath("day-019-event.png") });
  for (const name of [
    "ics-audit.json",
    "ics-summary.txt",
    "invite-rewritten.ics",
    "invite-original.ics",
  ]) {
    const waiting = page.waitForEvent("download");
    await page
      .getByRole("button", { name: `Download ${name}`, exact: true })
      .click();
    const download = await waiting;
    expect(download.suggestedFilename()).toBe(name);
    const text = await downloadedText(download);
    if (name.endsWith(".json")) {
      const r = JSON.parse(text);
      expect(r.events).toHaveLength(4);
      expect(r.events[2].start.offsetMinutes).toBe(330);
      expect(r.displayOffsetMinutes).toBe(480);
      expect(r.original).toContain("Customized Time Zone");
    } else if (name === "invite-rewritten.ics") {
      expect(text).toContain("TZID:Asia/Kolkata");
      expect(text).not.toContain("Customized Time Zone");
    } else if (name === "ics-summary.txt")
      expect(text).toContain("Floating time");
    else expect(text).toContain("TZID:Customized Time Zone");
  }
  await page.reload();
  await expect(
    page.getByLabel("Display-zone preset", { exact: true }),
  ).toHaveValue("1");
  await expect(page.locator(".ics-event")).toHaveCount(4);
  // Include a UTF-8 BOM and CRLF: original file download must preserve every byte.
  const bytes = Buffer.from(
    "\uFEFFBEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nSUMMARY:Uploaded invite\r\nDTSTART:20260928T090000Z\r\nDURATION:PT1H\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n",
  );
  await page.getByLabel("Open a local file", { exact: true }).setInputFiles({
    name: "meeting.ics",
    mimeType: "text/calendar",
    buffer: bytes,
  });
  await expect(page.locator(".ics-event")).toHaveCount(1);
  await expect(page.locator(".ics-event")).toContainText(
    "2026-09-28T10:00:00.000Z",
  );
  const originalWaiting = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download invite-original.ics", exact: true })
    .click();
  expect(Buffer.from(await downloadedText(await originalWaiting))).toEqual(
    bytes,
  );
  await page.locator(".ics-drop").evaluate((element) => {
    const transfer = new DataTransfer();
    transfer.items.add(
      new File(
        [
          "BEGIN:VCALENDAR\nBEGIN:VEVENT\nSUMMARY:Dropped invite\nDTSTART:20260928T090000Z\nEND:VEVENT\nEND:VCALENDAR",
        ],
        "dropped.ics",
        { type: "text/calendar" },
      ),
    );
    element.dispatchEvent(
      new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        dataTransfer: transfer,
      }),
    );
  });
  await expect(page.locator(".ics-event")).toContainText("Dropped invite");
  await page
    .getByLabel("ICS invite text", { exact: true })
    .fill(
      "BEGIN:VCALENDAR\nBEGIN:VEVENT\nBAD LINE\nDTSTART:20260928T090000Z\nEND:VCALENDAR",
    );
  await expect(page.locator(".wb-error").first()).toBeVisible();
  await expect(rewrite).toBeDisabled();
  await page.getByRole("button", { name: "中文", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "日历邀请 ICS 时区预览器",
  );
  await expect(page.getByLabel("ICS 邀请原文", { exact: true })).toContainText(
    "BAD LINE",
  );
  await page.getByRole("button", { name: "查看 X 原帖", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".matching-posts .source-x")).toHaveCount(2);
  await expect(dialog.locator(".matching-posts .source-reddit")).toHaveCount(2);
  expect(
    await dialog
      .locator(".matching-posts a.post-source-link")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href"))),
  ).toEqual([
    "https://x.com/ramesh009144/status/2104495170054242471",
    "https://x.com/hecodesforme/status/2107017813667852309",
    "https://www.reddit.com/r/samsunggalaxy/comments/1u45mpf/calendar_invite_shows_wrong_time_when_opening_or/",
    "https://www.reddit.com/r/ProtonMail/comments/u6z9k5/unsupported_invitation_timezone_issues/",
  ]);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "重置本地数据", exact: true }).click();
  await expect(page.getByLabel("ICS 邀请原文", { exact: true })).toHaveValue(
    "",
  );
  await expect(
    page.getByRole("button", { name: "下载 ics-audit.json", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "加载示例数据", exact: true }).click();
  await context.setOffline(true);
  await page.getByLabel("显示时区预设", { exact: true }).selectOption("4");
  await expect(page.locator(".ics-event").first()).toContainText(
    "2026-09-28 14:30:00",
  );
  await context.setOffline(false);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("Day 020 spreadsheet ↔ Markdown: sample, real exports, literal cells, roundtrip, draft and 中文 sources", async ({
  page,
  request,
  context,
}) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const route = "/tools/day-020-md-table-converter";
  const response = await request.get(route);
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain(
    "Spreadsheet ↔ Markdown Table Converter",
  );
  for (const slug of [
    "day-020-ics-timezone-inspector",
    "day-021-vj-midi-map-workbench",
    "day-023-unbuilt",
  ]) {
    expect((await request.get(`/tools/${slug}`)).status()).toBe(404);
  }
  await page.goto(route);
  await expect(
    page.getByRole("button", { name: "Download table.md", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Load Sample Data", exact: true })
    .click();
  const preview = page.getByRole("table", { name: "Table preview" });
  await expect(
    preview.getByRole("cell", { name: "00123", exact: true }),
  ).toBeVisible();
  await expect(
    preview.getByRole("cell", { name: "A|B", exact: true }),
  ).toBeVisible();
  await expect(preview).toContainText("**bold** stays literal");
  await expect(
    page.getByText(/Multiline cells: Markdown export/),
  ).toBeVisible();
  await expect(
    page.getByLabel("Column 1 alignment", { exact: true }),
  ).toHaveValue("left");
  await expect(
    page.getByLabel("Column 2 alignment", { exact: true }),
  ).toHaveValue("center");
  await expect(
    page.getByLabel("Column 4 alignment", { exact: true }),
  ).toHaveValue("right");
  const outputs: Record<string, string> = {};
  for (const name of [
    "table.md",
    "table.tsv",
    "table.csv",
    "table-diagnostic.json",
  ]) {
    const waiting = page.waitForEvent("download");
    await page
      .getByRole("button", { name: `Download ${name}`, exact: true })
      .click();
    const file = await waiting;
    expect(file.suggestedFilename()).toBe(name);
    outputs[name] = await downloadedText(file);
  }
  expect(outputs["table.md"]).toContain("A\\|B");
  expect(outputs["table.md"]).toContain("\\*\\*bold\\*\\*");
  expect(outputs["table.md"]).toContain("第一行 第二行");
  expect(outputs["table.md"]).toContain("| :--- | :---: | --- | ---: |");
  expect(outputs["table.csv"]).toContain('"第一行\n第二行"');
  expect(outputs["table.tsv"]).toContain("00123\tA|B");
  const diagnostic = JSON.parse(outputs["table-diagnostic.json"]);
  expect(diagnostic.grid[1][0]).toBe("00123");
  expect(diagnostic.grid[2][2]).toBe("第一行\n第二行");
  expect(diagnostic.raw).toContain("00123");

  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page
    .locator(".wb-export")
    .first()
    .getByRole("button", { name: "Copy output", exact: true })
    .click();
  await expect(page.locator(".wb-export").first()).toContainText("Copied.");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    outputs["table.md"],
  );
  await page
    .getByLabel("Raw table text / file drop area", { exact: true })
    .fill(outputs["table.md"]);
  await expect(page.locator(".wb-stats")).toContainText(
    "Detected format: Markdown",
  );
  await expect(
    preview.getByRole("cell", { name: "A|B", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Column 2 alignment", { exact: true }),
  ).toHaveValue("center");
  await page
    .getByLabel("Column 2 alignment", { exact: true })
    .selectOption("right");
  await expect(page.getByLabel("Markdown output", { exact: true })).toHaveValue(
    /\| :--- \| ---: \| --- \| ---: \|/,
  );
  await page.getByLabel("Preview row limit", { exact: true }).fill("1");
  await expect(preview.locator("tbody tr")).toHaveCount(1);
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("one-hundred:md-table:v1") || "{}")
            .previewRows,
      ),
    )
    .toBe(1);
  await page.reload();
  await expect(
    page.getByLabel("Column 2 alignment", { exact: true }),
  ).toHaveValue("right");
  await expect(
    page.getByLabel("Preview row limit", { exact: true }),
  ).toHaveValue("1");
  await page.getByRole("button", { name: "中文", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "表格与 Markdown 互转器",
  );
  await expect(
    page.getByLabel("原始表格文本 / 文件拖放区", { exact: true }),
  ).toHaveValue(outputs["table.md"]);
  await expect(page.getByLabel("预览行数上限", { exact: true })).toHaveValue(
    "1",
  );
  await page.getByRole("button", { name: "查看 X 原帖", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const sourceLinks = dialog.locator(".matching-posts .post-source-link");
  await expect(sourceLinks).toHaveCount(4);
  await expect(dialog.locator(".matching-posts .source-x")).toHaveCount(2);
  await expect(dialog.locator(".matching-posts .source-reddit")).toHaveCount(2);
  await expect(sourceLinks.nth(0)).toHaveAttribute(
    "href",
    "https://x.com/himanshu19890/status/2113929704294289441",
  );
  await expect(sourceLinks.nth(1)).toHaveAttribute(
    "href",
    "https://x.com/himanshu19890/status/2115117421878976544",
  );
  await expect(dialog.locator(".source-full .x-metrics")).toContainText("41");
  await expect(dialog).toContainText("淘汰并替换 ICS");
  await page.keyboard.press("Escape");
  await context.setOffline(true);
  await page.getByLabel("将第一行作为表头", { exact: true }).uncheck();
  await expect(page.getByLabel("Markdown 输出", { exact: true })).toHaveValue(
    /Column 1/,
  );
  await expect(
    page.getByRole("button", { name: "下载 table.tsv", exact: true }),
  ).toBeEnabled();
  await context.setOffline(false);
  await page.getByRole("button", { name: "重置本地数据", exact: true }).click();
  await expect(
    page.getByLabel("原始表格文本 / 文件拖放区", { exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "下载 table.md", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "下载 table.csv", exact: true }),
  ).toBeDisabled();
  expect(errors).toEqual([]);
});

test("Day 020 imports and drops real files, blocks malformed rows, recovers, trims and fits mobile", async ({
  page,
}) => {
  await page.goto("/tools/day-020-md-table-converter");
  await page.getByLabel("Open a local file", { exact: true }).setInputFiles({
    name: "clipboard.tsv",
    mimeType: "text/tab-separated-values",
    buffer: Buffer.from(
      "编号\t选项\t备注\n00123\tA|B\t  padded  \n123\t\tplain\n",
    ),
  });
  const preview = page.getByRole("table", { name: "Table preview" });
  await expect(
    preview.getByRole("cell", { name: "00123", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Markdown output", { exact: true })).toHaveValue(
    /&#32;&#32;padded&#32;&#32;/,
  );
  await page.getByLabel("Trim cell whitespace", { exact: true }).check();
  await expect(page.getByLabel("Markdown output", { exact: true })).toHaveValue(
    /\| padded \|/,
  );
  await page.getByLabel("Treat first row as header", { exact: true }).uncheck();
  await expect(preview.locator("tbody tr")).toHaveCount(3);
  await expect(page.getByLabel("Markdown output", { exact: true })).toHaveValue(
    /Column 1/,
  );
  await page.getByLabel("Treat first row as header", { exact: true }).check();
  const raw = page.getByLabel("Raw table text / file drop area", {
    exact: true,
  });
  await raw.fill(
    "| ID | Note |\n| --- | --- |\n| 00123 | A|B |\n| keep | me |",
  );
  await expect(
    page.getByRole("button", { name: "Download table.md", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Download table.csv", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Download table.tsv", exact: true }),
  ).toBeDisabled();
  await expect(preview).toContainText("keep");
  const waiting = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: "Download table-diagnostic.json",
      exact: true,
    })
    .click();
  expect(JSON.parse(await downloadedText(await waiting)).raw).toContain("A|B");
  await raw.fill(
    "| ID | Note |\n| --- | --- |\n| 00123 | A\\|B |\n| keep | me |",
  );
  await expect(
    page.getByRole("button", { name: "Download table.md", exact: true }),
  ).toBeEnabled();
  await raw.fill('ID,Note\n00123,"unclosed');
  await expect(
    page.getByRole("button", { name: "Download table.csv", exact: true }),
  ).toBeDisabled();
  await expect(raw).toHaveValue('ID,Note\n00123,"unclosed');
  await page.getByLabel("Input format", { exact: true }).selectOption("csv");
  const transfer = await page.evaluateHandle(() => {
    const dt = new DataTransfer();
    dt.items.add(
      new File(['ID,Note\n00007,"He said ""hello"""\n'], "dropped.csv", {
        type: "text/csv",
      }),
    );
    return dt;
  });
  await raw.dispatchEvent("drop", { dataTransfer: transfer });
  await transfer.dispose();
  await expect(
    preview.getByRole("cell", { name: "00007", exact: true }),
  ).toBeVisible();
  await expect(preview).toContainText('He said "hello"');
  await expect(
    page.getByRole("button", { name: "Download table.csv", exact: true }),
  ).toBeEnabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    preview.getByRole("cell", { name: "00007", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("Day 022 BibTeX real sample: clusters, primary selection, acronym fixes, exports, drafts, 中文 and reset", async ({
  page,
  request,
  context,
}) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const route = "/tools/day-022-bibtex-merge-auditor";
  const response = await request.get(route);
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain("BibTeX Merge Auditor");
  await page.goto(route);
  const output = page.getByLabel("Merged BibTeX output", { exact: true });
  await expect(
    page.getByRole("button", { name: "Download merged.bib", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Load Sample Data", exact: true })
    .click();
  await expect(
    page.getByLabel("Duplicate clusters", { exact: true }).locator("select"),
  ).toHaveCount(2);
  await expect(page.locator(".wb-issues")).toContainText("unbraced acronyms");
  await expect(page.locator(".wb-issues")).toContainText("missing DOI");
  await expect(output).toHaveValue(/LSTM Models on GPU/);
  await page
    .getByLabel("Wrap title acronyms in {...}", { exact: true })
    .check();
  await expect(output).toHaveValue(/\{LSTM\} Models on \{GPU\}/);
  await expect(output).not.toHaveValue(/\{\{COVID\}\}/);
  await page
    .getByLabel("Cluster 1: keep primary record", { exact: true })
    .selectOption("1");
  await expect(output).toHaveValue(/@misc\{attention2017/);
  await expect(output).not.toHaveValue(/@inproceedings\{vaswani2017/);
  await expect(
    page.getByRole("table", { name: "Citation key remap table", exact: true }),
  ).toContainText("vaswani2017");
  const exports: Record<string, string> = {};
  for (const name of [
    "merged.bib",
    "citekey-remap.csv",
    "citekey-remap.json",
    "bibtex-audit.json",
  ]) {
    const waiting = page.waitForEvent("download");
    await page
      .getByRole("button", { name: `Download ${name}`, exact: true })
      .click();
    const download = await waiting;
    expect(download.suggestedFilename()).toBe(name);
    exports[name] = await downloadedText(download);
  }
  expect(exports["merged.bib"]).toContain("@string");
  expect(exports["merged.bib"]).toContain("@preamble");
  expect(exports["citekey-remap.csv"]).toContain(
    '"vaswani2017","attention2017"',
  );
  expect(JSON.parse(exports["citekey-remap.json"])[0].kept_key).toBe(
    "attention2017",
  );
  expect(JSON.parse(exports["bibtex-audit.json"]).keptCount).toBe(2);
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          JSON.parse(
            localStorage.getItem("one-hundred:bibtex-merge:v1") || "{}",
          ).wrapAcronyms,
      ),
    )
    .toBe(true);
  await page.reload();
  await expect(
    page.getByLabel("Cluster 1: keep primary record", { exact: true }),
  ).toHaveValue("1");
  await expect(
    page.getByLabel("Wrap title acronyms in {...}", { exact: true }),
  ).toBeChecked();
  await page.getByRole("button", { name: "中文", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "BibTeX 合并去重检查器",
  );
  await expect(page.getByLabel("合并后的 BibTeX", { exact: true })).toHaveValue(
    exports["merged.bib"],
  );
  await page.getByRole("button", { name: "查看 X 原帖", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".matching-posts .post-source-link")).toHaveCount(
    4,
  );
  await expect(dialog.locator(".matching-posts .source-x")).toHaveCount(2);
  await expect(dialog.locator(".matching-posts .source-reddit")).toHaveCount(2);
  await expect(
    dialog.locator(".matching-posts .post-source-link").first(),
  ).toHaveAttribute(
    "href",
    "https://x.com/hyoungne2124/status/2109648669104308714",
  );
  await expect(dialog).toContainText("保留 BibTeX");
  await page.keyboard.press("Escape");
  await context.setOffline(true);
  await page.getByLabel("给标题缩写加上 {...}", { exact: true }).uncheck();
  await expect(page.getByLabel("合并后的 BibTeX", { exact: true })).toHaveValue(
    /LSTM Models on GPU/,
  );
  await context.setOffline(false);
  await page.getByRole("button", { name: "重置本地数据", exact: true }).click();
  await expect(
    page.getByLabel("BibTeX 原文 / 文件拖放区", { exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "下载 merged.bib", exact: true }),
  ).toBeDisabled();
  expect(errors).toEqual([]);
});

test("Day 022 imports files, appends multi-file drops, blocks malformed exports, recovers and fits mobile", async ({
  page,
}) => {
  await page.goto("/tools/day-022-bibtex-merge-auditor");
  await page.getByLabel("Open a local file", { exact: true }).setInputFiles({
    name: "one.bib",
    mimeType: "application/x-bibtex",
    buffer: Buffer.from(
      "@article{one,title={GPU research},year=2024,doi={10.1234/same}}",
    ),
  });
  const raw = page.getByLabel("BibTeX input / file drop area", { exact: true });
  const transfer = await page.evaluateHandle(() => {
    const dt = new DataTransfer();
    dt.items.add(
      new File(
        ["@misc{two,title={Other title},doi={https://doi.org/10.1234/same}}"],
        "two.bib",
      ),
    );
    dt.items.add(
      new File(["@book{three,title={A book},year=2023}"], "three.bib"),
    );
    return dt;
  });
  await raw.dispatchEvent("drop", { dataTransfer: transfer });
  await transfer.dispose();
  await expect(
    page
      .getByRole("table", { name: "Bibliography entries", exact: true })
      .locator("tbody tr"),
  ).toHaveCount(3);
  await expect(
    page.getByLabel("Duplicate clusters", { exact: true }).locator("select"),
  ).toHaveCount(1);
  await page.getByLabel("Entry preview limit", { exact: true }).fill("1");
  await expect(
    page
      .getByRole("table", { name: "Bibliography entries", exact: true })
      .locator("tbody tr"),
  ).toHaveCount(1);
  await expect(
    page.getByLabel("Merged BibTeX output", { exact: true }),
  ).toHaveValue(/@book\{three/);
  await raw.fill("@article{broken,title={Unclosed}");
  await expect(page.locator(".wb-error[role=alert]")).toContainText(
    "export blocked",
  );
  await expect(
    page.getByRole("button", { name: "Download merged.bib", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", {
      name: "Download citekey-remap.csv",
      exact: true,
    }),
  ).toBeDisabled();
  const waiting = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download bibtex-audit.json", exact: true })
    .click();
  expect(JSON.parse(await downloadedText(await waiting)).raw).toBe(
    "@article{broken,title={Unclosed}",
  );
  await raw.fill("@article{fixed,title={GPU research},year={2024}}");
  await expect(
    page.getByRole("button", { name: "Download merged.bib", exact: true }),
  ).toBeEnabled();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
