import { test, expect, type Download } from "@playwright/test";
async function downloadedText(file: Download) {
  const stream = await file.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}
const route = "/tools/day-021-timesheet-invoice-workbench";
test("Day 021 weekly sample: steps, rounding, rates, real exports, draft, 中文 sources and reset", async ({
  page,
  request,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const response = await request.get(route);
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain("Freelancer Timesheet");
  expect(await response.text()).toContain("Weekly Medium");
  expect(
    (await request.get("/tools/day-021-vj-midi-map-workbench")).status(),
  ).toBe(404);
  expect((await request.get("/tools/day-023-unbuilt")).status()).toBe(404);
  await page.goto(route);
  const steps = page.getByRole("navigation", { name: "Invoice steps" });
  await expect(steps.getByRole("button")).toHaveCount(4);
  await steps.getByRole("button", { name: "4. Export", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Download invoice-lines.csv",
      exact: true,
    }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Load Sample Data", exact: true })
    .click();
  await expect(
    page.getByLabel("Timesheet CSV / TSV / file drop area", { exact: true }),
  ).toContainText("Spreadsheet edge");
  await expect(page.locator(".wb-stats")).toContainText("Total amount: 288.00");
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  await expect(
    page.getByRole("table", { name: "Duration preview" }),
  ).toContainText("1.166666667");
  await page.getByLabel("Rounding mode", { exact: true }).selectOption("round");
  await expect(page.locator(".wb-stats")).toContainText("Total amount: 290.00");
  await expect(
    page.getByRole("table", { name: "Duration preview" }),
  ).toContainText("120");
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  await page
    .getByLabel("Client rate CSV (client,rate)", { exact: true })
    .fill("client,rate\nAcme,75");
  await expect(page.locator(".wb-stats")).toContainText("Total amount: 348.50");
  await page
    .getByLabel("Group invoice lines", { exact: true })
    .selectOption("rows");
  await expect(page.locator(".wb-stats")).toContainText("Invoice lines: 4");
  await page
    .getByLabel("Group invoice lines", { exact: true })
    .selectOption("project");
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  const table = page.getByRole("table", { name: "Invoice lines", exact: true });
  await expect(table.locator("tbody tr")).toHaveCount(2);
  const outputs: Record<string, string> = {};
  for (const name of [
    "invoice-lines.csv",
    "invoice-summary.md",
    "timesheet-audit.json",
  ]) {
    const waiting = page.waitForEvent("download");
    await page
      .getByRole("button", { name: `Download ${name}`, exact: true })
      .click();
    const file = await waiting;
    expect(file.suggestedFilename()).toBe(name);
    outputs[name] = await downloadedText(file);
  }
  expect(outputs["invoice-lines.csv"]).toContain('"3.9","75.00","292.50"');
  expect(outputs["invoice-summary.md"]).toContain("348.50");
  const audit = JSON.parse(outputs["timesheet-audit.json"]);
  expect(audit.rows[0].roundingDelta).toBe(120);
  expect(audit.rows[2].parsedSeconds).toBe(4200);
  expect(audit.rows[4].status).toBe("skipped");
  expect(audit.input.raw).toContain("Spreadsheet edge");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page
    .locator(".wb-export")
    .first()
    .getByRole("button", { name: "Copy output", exact: true })
    .click();
  await expect(page.locator(".wb-export").first()).toContainText("Copied.");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    outputs["invoice-lines.csv"],
  );
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(
            localStorage.getItem("one-hundred:timesheet-invoice:v1") || "{}",
          ).step,
      ),
    )
    .toBe(4);
  await page.reload();
  await expect(table).toContainText("292.50");
  await page.getByRole("button", { name: "中文", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "自由职业工时表转发票明细工作台",
  );
  await page.getByRole("button", { name: "查看 X 原帖", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".matching-posts .post-source-link")).toHaveCount(
    4,
  );
  await expect(dialog.locator(".matching-posts .source-x")).toHaveCount(2);
  await expect(dialog.locator(".matching-posts .source-reddit")).toHaveCount(2);
  await expect(
    dialog.locator(".matching-posts .post-source-link").nth(0),
  ).toHaveAttribute(
    "href",
    "https://x.com/itsjankoenig/status/2113543493888958885",
  );
  await expect(
    dialog.locator(".matching-posts .post-source-link").nth(1),
  ).toHaveAttribute(
    "href",
    "https://x.com/phillymac/status/2111559048319717680",
  );
  await expect(dialog.locator(".source-full .x-metrics")).toContainText("14");
  await expect(dialog).toContainText("淘汰并替换 VJ MIDI");
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh");
  await context.setOffline(true);
  await page
    .getByRole("button", { name: "2. 时长与取整", exact: true })
    .click();
  await page.getByLabel("取整方式", { exact: true }).selectOption("none");
  await expect(page.locator(".wb-stats")).toContainText("总金额: 345.50");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "重置本地数据", exact: true }).click();
  await expect(
    page.getByLabel("工时 CSV / TSV / 文件拖放区", { exact: true }),
  ).toHaveValue("");
  await page.getByRole("button", { name: "4. 导出", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "下载 invoice-lines.csv", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", {
      name: "下载 timesheet-audit.json",
      exact: true,
    }),
  ).toBeDisabled();
  expect(errors).toEqual([]);
});

test("Day 021 real file import/drop, per-row format, malformed recovery, filters and empty gate", async ({
  page,
}) => {
  await page.goto(route);
  await page.getByLabel("Open a local file", { exact: true }).setInputFiles({
    name: "hours.tsv",
    mimeType: "text/tab-separated-values",
    buffer: Buffer.from("Client\tDuration\nA\t0.5\nB\t1,5\n"),
  });
  await expect(page.getByLabel("Date column", { exact: true })).toHaveValue(
    "-1",
  );
  await page
    .getByRole("button", { name: "2. Duration & rounding", exact: true })
    .click();
  await page
    .getByLabel("Record 2 format", { exact: true })
    .selectOption("decimal");
  await expect(page.locator(".wb-stats")).toContainText("Total amount: 120.00");
  await page
    .getByRole("button", { name: "1. Import & map", exact: true })
    .click();
  const raw = page.getByLabel("Timesheet CSV / TSV / file drop area", {
    exact: true,
  });
  await raw.fill("Client,Duration\nA,-01:00\nB,01:00");
  await page.getByRole("button", { name: "4. Export", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Download invoice-lines.csv",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", {
      name: "Download invoice-summary.md",
      exact: true,
    }),
  ).toBeDisabled();
  const waiting = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download timesheet-audit.json", exact: true })
    .click();
  expect(JSON.parse(await downloadedText(await waiting)).input.raw).toContain(
    "-01:00",
  );
  await page
    .getByRole("button", { name: "1. Import & map", exact: true })
    .click();
  await raw.fill('Client,Duration\nA,"unclosed');
  await expect(raw).toHaveValue('Client,Duration\nA,"unclosed');
  const transfer = await page.evaluateHandle(() => {
    const dt = new DataTransfer();
    dt.items.add(
      new File(
        [
          'Date,Client,Duration,Billable\r\n2026-10-01,"A, Inc",01:10,yes\r\n2026-10-02,B,01:00,no\r\n',
        ],
        "hours.csv",
        { type: "text/csv" },
      ),
    );
    return dt;
  });
  await raw.dispatchEvent("drop", { dataTransfer: transfer });
  await transfer.dispose();
  await expect(raw).toHaveValue(/A, Inc/);
  await expect(page.locator(".wb-stats")).toContainText("Total amount: 70.00");
  await page
    .getByRole("button", { name: "2. Duration & rounding", exact: true })
    .click();
  await page.getByLabel("Skip non-billable entries", { exact: true }).uncheck();
  await expect(page.locator(".wb-stats")).toContainText("Total amount: 130.00");
  await page
    .getByLabel("From date (optional)", { exact: true })
    .fill("2026-10-03");
  await page.getByRole("button", { name: "4. Export", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Download invoice-lines.csv",
      exact: true,
    }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "2. Duration & rounding", exact: true })
    .click();
  await page
    .getByLabel("From date (optional)", { exact: true })
    .fill("2026-10-01");
  await page.getByRole("button", { name: "4. Export", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Download invoice-lines.csv",
      exact: true,
    }),
  ).toBeEnabled();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
