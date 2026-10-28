import { test, expect, type Download } from "@playwright/test";
const routes = [
  "day-008-filament-spool-budget",
  "day-009-laser-kerf-fit",
  "day-010-initiative-round-ledger",
  "day-011-photo-sequence-renamer",
  "day-012-anki-import-inspector",
  "day-013-vault-link-auditor",
  "day-014-workshop-cut-planner",
];
async function text(download: Download) {
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

test("filament reads a real local G-code, queues prints and exports measured inventory", async ({
  page,
}) => {
  await page.goto("/tools/" + routes[0]);
  await page.getByLabel("Open a local file").setInputFiles({
    name: "part.gcode",
    mimeType: "text/plain",
    buffer: Buffer.from("; filament used [g] = 90\n"),
  });
  await expect(page.locator("main")).toContainText("90.00 g");
  await page.getByLabel("Gross weight (g)").fill("300");
  await page.getByLabel("Empty spool tare (g)").fill("200");
  await page
    .getByRole("button", { name: "Add print to queue", exact: true })
    .click();
  await expect(page.locator(".wb-big-number")).toHaveText("Yes");
  await page.getByLabel("Job 1 copies").fill("2");
  await expect(page.locator(".wb-big-number")).toHaveText("No");
  await page.getByRole("button", { name: "Save spool to inventory" }).click();
  const dl = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download spool-inventory.json" })
    .click();
  const inventory = JSON.parse(await text(await dl));
  expect(inventory[0].net).toBe(100);
  await page.getByLabel("Job 1 copies").fill("0");
  await expect(page.locator("main [role=alert]")).toBeVisible();
  await page.getByLabel("Job 1 copies").fill("1");
  await expect(page.locator("main [role=alert]")).toHaveCount(0);
});
test("laser calculates inverse offsets and downloads a real millimeter coupon", async ({
  page,
}) => {
  await page.goto("/tools/" + routes[1]);
  await page
    .getByRole("button", { name: "Load Sample Data", exact: true })
    .click();
  await expect(page.locator("main")).toContainText("3.160 mm");
  await expect(page.locator("main")).toContainText("2.840 mm");
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download kerf-gauge.svg" }).click();
  expect(await text(await dl)).toContain('id="cut"');
  await page.getByLabel("Measurement method").selectOption("comb");
  await page.getByLabel("Nominal width (mm)", { exact: true }).fill("100");
  await page.getByLabel("Measured width (mm)", { exact: true }).fill("98.4");
  await expect(page.locator(".wb-big-number")).toContainText("0.160");
});
test("encounter applies concentration math, expires next-turn conditions and restores full JSON", async ({
  page,
}) => {
  await page.goto("/tools/" + routes[2]);
  await page
    .getByRole("button", { name: "Load Sample Data", exact: true })
    .click();
  await page.getByLabel("Elara HP math").fill("-24");
  await page.getByLabel("Elara HP math").press("Enter");
  await expect(page.locator(".wb-log")).toContainText("Concentration DC 12");
  await page.getByLabel("Condition name", { exact: true }).fill("Shield");
  await page.getByLabel("Expiry timing").selectOption("next-turn");
  await page
    .getByRole("button", { name: "Add condition", exact: true })
    .first()
    .click();
  for (let i = 0; i < 4; i++)
    await page
      .getByRole("button", { name: "End turn → next", exact: true })
      .click();
  await expect(page.locator(".wb-log")).toContainText("Expired: Elara: Shield");
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download encounter.json" }).click();
  const saved = await text(await dl);
  expect(JSON.parse(saved).round).toBe(2);
  await page
    .getByRole("button", { name: "Reset Local State", exact: true })
    .click();
  await page.getByText("Restore encounter JSON", { exact: true }).click();
  await page.getByLabel("Full encounter state JSON").fill(saved);
  await page
    .getByRole("button", { name: "Import encounter", exact: true })
    .click();
  await expect(page.locator("main")).toContainText("13/32");
});
test("photo renamer accepts actual file selections and blocks unsafe collisions before exporting scripts", async ({
  page,
}) => {
  await page.goto("/tools/" + routes[3]);
  await page.getByLabel("Choose local files").setInputFiles([
    { name: "a.jpg", mimeType: "image/jpeg", buffer: Buffer.from("a") },
    { name: "b.jpg", mimeType: "image/jpeg", buffer: Buffer.from("b") },
  ]);
  await page.getByLabel("Filename pattern").fill("same");
  await expect(
    page.getByRole("button", { name: "Download rename.sh" }),
  ).toBeDisabled();
  await page.getByLabel("Filename pattern").fill("{event}_{seq:03d}_{date}");
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download rename.sh" }).click();
  expect(await text(await dl)).toContain("mv -n --");
  await page.getByLabel("Script platform").selectOption("powershell");
  await expect(
    page.getByRole("button", { name: "Download undo-rename.ps1" }),
  ).toBeEnabled();
});
test("Anki inline fixes and deduplication produce a clean ready-to-import TSV", async ({
  page,
}) => {
  await page.goto("/tools/" + routes[4]);
  await page
    .getByRole("button", { name: "Load Sample Data", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Download anki-clean.tsv" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Deduplicate: keep first" }).click();
  await page
    .getByLabel("Row 2 field 1", { exact: true })
    .fill("{{c2::Nucleus}} contains DNA");
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download anki-clean.tsv" }).click();
  const output = await text(await dl);
  expect(output).toMatch(/^#separator:tab\n#html:true\n/);
  expect(output).toContain("<br>");
  expect(output).not.toContain("Duplicate note");
  await page.getByLabel("CSV / TSV flashcards").fill('one,"broken\ntwo,answer');
  await expect(
    page.getByRole("button", { name: "Download anki-clean.tsv" }),
  ).toBeDisabled();
});
test("vault imports multiple real Markdown files, groups missing targets and converts metadata", async ({
  page,
}) => {
  await page.goto("/tools/" + routes[5]);
  await page.getByLabel("Choose local files").setInputFiles([
    {
      name: "Home.md",
      mimeType: "text/markdown",
      buffer: Buffer.from("[[Missing]]\n[[Other]]\nCount:: 2\n"),
    },
    {
      name: "Other.md",
      mimeType: "text/markdown",
      buffer: Buffer.from("[[Missing]]\n"),
    },
  ]);
  await expect(page.locator("main")).toContainText("Missing × 2");
  const dl = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download Home.md", exact: true })
    .click();
  expect(await text(await dl)).toContain("Count: 2");
  const report = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download vault-audit.json" }).click();
  expect(JSON.parse(await text(await report)).missing.Missing).toHaveLength(2);
});
test("cut planner has keyboard-interactive SVG, exact kerf and real shop exports in both modes", async ({
  page,
}) => {
  await page.goto("/tools/" + routes[6]);
  await page
    .getByRole("button", { name: "Load Sample Data", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Calculate & review layouts" })
    .click();
  const part = page.locator("svg [role=button]").first();
  await part.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".wb-selection")).toContainText("x=0.00");
  const dl = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download cut-layout-1.svg", exact: true })
    .click();
  expect(await text(await dl)).toContain('width="2440mm"');
  await page.getByRole("button", { name: "Review cut sequence →" }).click();
  await expect(
    page.getByRole("button", { name: "Download cut-list.csv" }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "1. Stock & parts", exact: true })
    .click();
  await page.getByLabel("Planning mode").selectOption("1d");
  await page
    .getByLabel(
      "Parts CSV: name,length_mm,width_mm,quantity,grain_locked (yes/no)",
    )
    .fill("Rail,500,20,2,no");
  await page
    .getByLabel("Stock CSV: name,length_mm,width_mm,quantity")
    .fill("Board,1000,20,1");
  await expect(page.locator("main [role=alert]")).toContainText("Rail");
  await page.getByLabel("Blade kerf (mm)").fill("0");
  await expect(page.locator("main [role=alert]")).toHaveCount(0);
});
for (const [index, slug] of routes.entries())
  test(`bilingual, persisted draft, mobile and offline: ${slug}`, async ({
    page,
    context,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/tools/" + slug);
    await page
      .getByRole("button", { name: "Load Sample Data", exact: true })
      .click();
    if (index === 4) {
      await page
        .getByRole("button", { name: "Deduplicate: keep first" })
        .click();
      await page
        .getByLabel("Row 2 field 1", { exact: true })
        .fill("{{c2::Nucleus}} contains DNA");
    }
    if (index === 6)
      await page
        .getByRole("button", { name: "3. Shop schedule & export", exact: true })
        .click();
    await page.getByRole("button", { name: "中文", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "zh");
    await context.setOffline(true);
    await expect(
      page.getByRole("button", { name: /^下载 / }).first(),
    ).toBeEnabled();
    const dl = page.waitForEvent("download");
    await page
      .getByRole("button", { name: /^下载 / })
      .first()
      .click();
    expect((await dl).suggestedFilename()).toBeTruthy();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await context.setOffline(false);
    await page.waitForTimeout(250);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "zh");
    await expect(
      page.getByRole("button", { name: /^下载 / }).first(),
    ).toBeEnabled();
    await page
      .getByRole("button", { name: "重置本地数据", exact: true })
      .click();
    expect(errors).toEqual([]);
  });
