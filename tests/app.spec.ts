import { test, expect } from "@playwright/test";
const toolPath = "/tools/day-001-subtitle-cps-fixer";
test("directory filters, roadmap, keyboard search and source dialog", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Small tools/ }),
  ).toBeVisible();
  await expect(page.locator(".progress-slot")).toHaveCount(100);
  await expect(page.locator(".progress-slot.weekly")).toHaveCount(14);
  await page.keyboard.press("/");
  await expect(
    page.getByRole("textbox", { name: "Search tools" }),
  ).toBeFocused();
  await page.getByRole("textbox", { name: "Search tools" }).fill("subtitle");
  await expect(page.locator(".tool-card")).toHaveCount(1);
  await page.getByRole("button", { name: /Inspect Original/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "100% local-first architecture" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("textbox", { name: "Search tools" }).fill("");
  await page.getByRole("checkbox", { name: "Show upcoming slots" }).uncheck();
  await expect(page.locator(".tool-card")).toHaveCount(1);
  await page
    .getByRole("combobox", { name: "Filter by source" })
    .selectOption("X");
  await expect(page.getByText("No tools in this corner. Yet.")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByRole("checkbox", { name: "Show upcoming slots" }).check();
  await page.getByRole("button", { name: /Explore all 100/ }).click();
  await expect(page.locator(".tool-card")).toHaveCount(100);
  await page
    .getByRole("button", { name: "Weekly Medium-Scale Tool", exact: true })
    .click();
  await expect(page.locator(".weekly-card")).toHaveCount(14);
});
test("sample, inline editing, wrap, persistence, export and reset work locally", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(toolPath);
  await expect(
    page.getByRole("textbox", { name: "OR PASTE SRT TEXT" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Load Sample Data" }).first().click();
  await expect(page.locator(".cue")).toHaveCount(8);
  await page
    .getByRole("button", { name: "Auto-wrap all", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Cue 2 text", exact: true }),
  ).toHaveValue(/\n/);
  await expect(page.locator(".cue").nth(1)).toContainText("Reading speed");
  await page
    .getByRole("textbox", { name: "Cue 2 text", exact: true })
    .fill("We should go.");
  await expect(page.locator(".cue").nth(1)).toContainText("Within limits");
  await page.getByRole("textbox", { name: "Cue 2 start timestamp" }).fill("");
  await expect(page.locator(".cue").nth(1)).toContainText("Invalid timing");
  await expect(
    page.getByRole("button", { name: "Download SRT" }),
  ).toBeDisabled();
  await page
    .getByRole("textbox", { name: "Cue 2 start timestamp" })
    .fill("00:00:04,800");
  await page
    .getByLabel("Target standard", { exact: true })
    .selectOption("custom");
  await page.getByLabel("Custom maximum CPS").fill("20");
  await page.waitForTimeout(500);
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Cue 2 text", exact: true }),
  ).toHaveValue("We should go.");
  await expect(page.getByLabel("Custom maximum CPS")).toHaveValue("20");
  await page.getByRole("button", { name: /Violations Only/ }).click();
  await expect(page.locator(".cue")).toHaveCount(3);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download SRT" }).click();
  expect((await download).suggestedFilename()).toBe(
    "sample-subtitles-balanced.srt",
  );
  await page.getByRole("button", { name: "View Original Reddit Post" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close original post" }).click();
  await page.getByRole("button", { name: "Reset Local State" }).click();
  await expect(page.locator(".cue")).toHaveCount(0);
  await expect(page.getByLabel("Target standard", { exact: true })).toHaveValue(
    "netflix",
  );
  expect(errors).toEqual([]);
});
test("file input, paste validation and clipboard export", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(toolPath);
  await expect(
    page.getByRole("textbox", { name: "OR PASTE SRT TEXT" }),
  ).toBeEnabled();
  await page.getByLabel("Upload SRT file").setInputFiles({
    name: "my-film.srt",
    mimeType: "text/plain",
    buffer: Buffer.from("1\n00:00:01,000 --> 00:00:03,000\nA quiet morning."),
  });
  await expect(page.locator(".cue")).toHaveCount(1);
  await page.getByRole("button", { name: "Copy SRT" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "A quiet morning.",
  );
  await page
    .getByRole("textbox", { name: "OR PASTE SRT TEXT" })
    .fill("1\nbroken timestamps\nDon't silently lose me.");
  await expect(page.locator(".parse-errors")).toContainText("Block 1");
  await expect(
    page.getByRole("button", { name: "Download SRT" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("textbox", { name: "OR PASTE SRT TEXT" }),
  ).toHaveValue(/Don't silently lose me/);
});
test("mobile directory and editor fit the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "Open Tool", exact: true }).click();
  await page.getByRole("button", { name: "Load Sample Data" }).first().click();
  await expect(page.locator(".cue")).toHaveCount(8);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("last-cue typing and drag/drop continue to work without a network", async ({
  page,
  context,
}) => {
  await page.goto(toolPath);
  await expect(
    page.getByRole("textbox", { name: "OR PASTE SRT TEXT" }),
  ).toBeEnabled();
  await context.setOffline(true);
  const data = await page.evaluateHandle(() => {
    const transfer = new DataTransfer();
    transfer.items.add(
      new File(["1\n00:00:01,000 --> 00:00:10,000\nHello"], "offline.srt", {
        type: "text/plain",
      }),
    );
    return transfer;
  });
  await page.locator(".dropzone").dispatchEvent("drop", { dataTransfer: data });
  const text = page.getByRole("textbox", { name: "Cue 1 text", exact: true });
  await expect(text).toHaveValue("Hello");
  await text.focus();
  await text.press("End");
  await text.pressSequentially(" there");
  await text.press("Enter");
  await text.pressSequentially("Stay awhile.");
  await expect(text).toHaveValue("Hello there\nStay awhile.");
  await expect(
    page.getByRole("button", { name: "Download SRT" }),
  ).toBeEnabled();
  await context.setOffline(false);
  await page.getByRole("link", { name: "Back to Directory" }).click();
  await page.goto(toolPath);
  await expect(text).toHaveValue("Hello there\nStay awhile.");
  await page.getByRole("button", { name: "Reset Local State" }).click();
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "OR PASTE SRT TEXT" }),
  ).toHaveValue("");
});
