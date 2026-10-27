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

const languageKey = "grok-bot-100-lang";

test("English is the default even with a Chinese browser locale", async ({
  browser,
}) => {
  const context = await browser.newContext({ locale: "zh-CN" });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("heading", { name: /Small tools/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "EN", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(
    await page.evaluate((key) => localStorage.getItem(key), languageKey),
  ).toBeNull();
  await context.close();
});

test("SSR stays English with a previously saved Chinese preference", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    storageState: {
      cookies: [],
      origins: [
        {
          origin: baseURL!,
          localStorage: [{ name: languageKey, value: "zh" }],
        },
      ],
    },
  });
  const page = await context.newPage();
  for (const path of ["/", toolPath]) {
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      path === "/" ? "Small tools." : "Subtitle CPS Fixer",
    );
    await expect(
      page.getByRole("button", { name: "EN", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  }
  await context.close();
});

test("Chinese copy follows directory → modal → tool → reload and switches back to English", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page.getByRole("button", { name: "中文", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh");
  await expect(page.getByRole("heading", { name: /工具小一点/ })).toBeVisible();
  await expect(page.locator(".progress-heading")).toContainText(
    "已完成 1 / 100 个工具",
  );
  await expect(page.locator(".schedule")).toContainText("每日凌晨 03:00");
  await expect(
    page.getByRole("button", { name: "每日微工具", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "每周中型工具", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: "显示 100 天路线图" }),
  ).toBeChecked();
  await page
    .getByRole("combobox", { name: "按来源筛选" })
    .selectOption("Reddit");
  await page.getByRole("textbox", { name: "搜索工具" }).fill("字幕");
  await expect(page.locator(".tool-card")).toHaveCount(1);
  await expect(page.locator(".built-card")).toContainText("做了什么");
  await expect(page.locator(".built-card")).toContainText(
    "用户当时的烦恼 / 愿望",
  );
  await expect(page.locator(".built-card")).toContainText(
    "字幕翻译与字幕组校对人员",
  );
  await page.getByRole("button", { name: "查看原帖与需求分析" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("原帖与需求分析");
  await expect(dialog).toContainText("原帖中文翻译");
  await expect(dialog).toContainText("这次只解决一个问题");
  await expect(dialog).toContainText("首版实现 · 需求复核");
  await expect(dialog).toContainText("智能断行保留原时间");
  await dialog.getByRole("link", { name: "打开字幕阅读速度检查器" }).click();
  await expect(page).toHaveURL(toolPath);
  await expect(page.locator("html")).toHaveAttribute("lang", "zh");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "字幕阅读速度检查器",
  );
  await expect(page.locator(".site-header .grok-showcase")).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "也可以粘贴 SRT 文本" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "加载示例字幕" }).first().click();
  await expect(page.locator(".cue")).toHaveCount(8);
  await expect(page.getByRole("status")).toContainText("已加载 8 条示例字幕");
  await page.getByRole("button", { name: "全部智能断行", exact: true }).click();
  const cue = page.getByRole("textbox", {
    name: "第 2 条字幕文本",
    exact: true,
  });
  await expect(cue).toHaveValue(/\n/);
  await expect(page.locator(".cue").nth(1)).toContainText("阅读速度过快");
  await cue.fill("We should go.");
  await page.getByLabel("检查标准", { exact: true }).selectOption("custom");
  await page.getByLabel("自定义 CPS 上限").fill("20");
  await page.getByRole("button", { name: "复制 SRT" }).click();
  await expect(page.getByRole("status")).toContainText("已复制到剪贴板");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载 SRT" }).click();
  expect((await download).suggestedFilename()).toBe(
    "sample-subtitles-balanced.srt",
  );
  expect(
    await page.evaluate((key) => localStorage.getItem(key), languageKey),
  ).toBe("zh");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh");
  await expect(cue).toHaveValue("We should go.");
  await expect(page.getByLabel("自定义 CPS 上限")).toHaveValue("20");
  await page.getByRole("button", { name: "查看 Reddit 原帖" }).click();
  await expect(dialog).toContainText("原帖全文与讨论背景");
  await page.getByRole("button", { name: "关闭原帖" }).click();
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Subtitle CPS Fixer",
  );
  await expect(
    page.getByRole("textbox", { name: "Cue 2 text", exact: true }),
  ).toHaveValue("We should go.");
  await expect(page.getByLabel("Custom maximum CPS")).toHaveValue("20");
  await page.getByRole("button", { name: "View Original Reddit Post" }).click();
  await expect(dialog).toContainText("Original Post & Requirements Analysis");
  await expect(dialog).toContainText(
    "Initial implementation · requirements review",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Back to Directory" }).click();
  await expect(
    page.getByRole("heading", { name: /Small tools/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "中文", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("heading", { name: /工具小一点/ })).toBeVisible();
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await page.getByRole("button", { name: /Inspect Original/ }).click();
  await expect(dialog).toContainText("I work for an agency");
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  expect(
    await page.evaluate((key) => localStorage.getItem(key), languageKey),
  ).toBe("en");
  expect(errors).toEqual([]);
});

test("Grok Bot orb tracks the page cursor with spherical eye foreshortening", async ({
  page,
}) => {
  await page.clock.install();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const brand = page.locator(".site-header .brand");
  const mascot = brand.locator(".grok-showcase");
  await expect(brand).toContainText("GROK BOT · 100 TOOLS");
  await expect(brand).toContainText("one hundred.");
  await expect(
    brand.getByRole("img", {
      name: "Grok Bot black orb mascot with two white pill eyes",
    }),
  ).toBeVisible();
  await expect(mascot.locator(".grok-orb")).toHaveCount(1);
  await expect(mascot.locator(".grok-eye")).toHaveCount(2);
  await expect(page.locator(".grok-prism, .grok-orbit")).toHaveCount(0);
  await expect(mascot).toHaveAttribute("style", /--head-x/);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));

  const readPose = () =>
    mascot.evaluate((node) => ({
      head: getComputedStyle(node.querySelector(".grok-depth")!).transform,
      eyes: [...node.querySelectorAll<SVGGElement>(".grok-eye-position")].map(
        (eye) => eye.getAttribute("transform"),
      ),
      widths: [...node.querySelectorAll<SVGRectElement>(".grok-eye")].map(
        (eye) => eye.width.baseVal.value,
      ),
    }));
  const initial = await readPose();
  expect(
    await mascot
      .locator(".grok-depth")
      .evaluate((node) => getComputedStyle(node).transformStyle),
  ).toBe("preserve-3d");
  expect(initial.head).toMatch(/^matrix3d\(/);
  const box = (await mascot.boundingBox())!;
  // Both points are outside the brand, proving tracking is page-wide.
  await page.mouse.move(1200, 650);
  await page.clock.runFor(800);
  const right = await readPose();
  expect(right.head).not.toBe(initial.head);
  expect(right.eyes).not.toEqual(initial.eyes);
  expect(right.widths[0]).toBeGreaterThan(initial.widths[0]);
  expect(right.widths[1]).toBeLessThan(initial.widths[1]);
  // Hold the pointer still briefly: the spring settles before idle takes over.
  await page.clock.runFor(200);
  const settled = await readPose();
  expect(Math.abs(settled.widths[1] - right.widths[1])).toBeLessThan(0.1);
  await page.mouse.move(0, box.y + box.height / 2);
  await page.clock.runFor(800);
  const left = await readPose();
  expect(left.head).not.toBe(right.head);
  expect(left.eyes).not.toEqual(right.eyes);
  expect(left.widths[0]).toBeLessThan(right.widths[0]);
  expect(left.widths[1]).toBeGreaterThan(right.widths[1]);
  expect(errors).toEqual([]);
});

test("Grok Bot has idle glances, natural single/double blinks and playful reactions", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  const mascot = page.locator(".site-header .grok-showcase");
  await expect(mascot).toHaveAttribute("style", /--head-x/);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  const initial = await mascot
    .locator(".grok-eye-position")
    .first()
    .getAttribute("transform");
  // Collect rendered eye heights, including open frames between double blinks.
  await mascot.evaluate((node) => {
    const history: number[][] = [];
    Object.assign(window, { grokBlinkSamples: history });
    const sample = () => {
      history.push(
        [...node.querySelectorAll(".grok-eye")].map(
          (eye) => new DOMMatrix(getComputedStyle(eye).transform).d,
        ),
      );
      if (history.length < 650) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.clock.runFor(7800);
  const history = await page.evaluate(
    () =>
      (window as unknown as { grokBlinkSamples: number[][] }).grokBlinkSamples,
  );
  const closures = history.reduce<number[]>((starts, frame, i) => {
    if (frame[0] < 0.2 && (i === 0 || history[i - 1][0] >= 0.2)) starts.push(i);
    expect(frame[0]).toBeCloseTo(frame[1], 5);
    return starts;
  }, []);
  expect(closures).toHaveLength(3);
  expect(closures[2] - closures[1]).toBeLessThan(20);
  expect(
    await mascot
      .locator(".grok-eye-position")
      .first()
      .getAttribute("transform"),
  ).not.toBe(initial);
  await mascot.hover();
  await page.clock.runFor(100);
  const squint = await mascot
    .locator(".grok-eye")
    .evaluateAll((eyes) =>
      eyes.map((eye) => new DOMMatrix(getComputedStyle(eye).transform).d),
    );
  expect(squint[0]).toBeCloseTo(0.5);
  expect(squint[1]).toBeCloseTo(0.75);
  // Press/release on the home link preserves its normal navigation semantics.
  await page.mouse.down();
  await page.clock.runFor(100);
  expect(
    await mascot.evaluate((node) =>
      Number.parseFloat(
        (node as HTMLElement).style.getPropertyValue("--bounce"),
      ),
    ),
  ).toBeGreaterThan(1.01);
  await page.mouse.move(600, 200);
  await page.mouse.up();
  await page.clock.runFor(1200);
  expect(
    await mascot.evaluate((node) =>
      (node as HTMLElement).style.getPropertyValue("--bounce"),
    ),
  ).toBe("1");
});

test("reduced motion matches the official reference geometry and retains static 3D on both pages", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  for (const path of ["/", toolPath]) {
    await page.goto(path);
    const mascot = page.locator(".site-header .grok-showcase");
    await expect(mascot).toHaveAttribute("style", /--head-x/);
    await expect(page.locator(".site-footer .grok-eye")).toHaveCount(2);
    const read = () =>
      mascot.evaluate((node) => ({
        head: getComputedStyle(node.querySelector(".grok-depth")!).transform,
        style: node.getAttribute("style"),
        face: node.querySelector("svg")!.outerHTML,
      }));
    const first = await read();
    expect(first.head).toMatch(/^matrix3d\(/);
    const geometry = await mascot.evaluate((node) => {
      const gaze = node.querySelector<SVGGElement>(".grok-gaze")!;
      const rotation = gaze.transform.baseVal.getItem(0);
      return [...node.querySelectorAll<SVGRectElement>(".grok-eye")].map(
        (eye) => {
          const position = (
            eye.parentNode as SVGGElement
          ).transform.baseVal.getItem(0).matrix;
          const center = new DOMPoint(0, 0).matrixTransform(
            rotation.matrix.multiply(position),
          );
          return {
            x: center.x,
            y: center.y,
            width: eye.width.baseVal.value,
            height: eye.height.baseVal.value,
            radius: eye.rx.baseVal.value,
            fill: getComputedStyle(eye).fill,
            roll: rotation.angle,
          };
        },
      );
    });
    for (const [i, expected] of [
      { x: 19.7, y: 41.8, width: 10.6 },
      { x: 48.6, y: 45.6, width: 13.2 },
    ].entries()) {
      expect(geometry[i].x).toBeCloseTo(expected.x, 3);
      expect(geometry[i].y).toBeCloseTo(expected.y, 3);
      expect(geometry[i].width).toBeCloseTo(expected.width, 3);
      expect(geometry[i].height).toBeCloseTo(27.8, 3);
      expect(geometry[i].radius).toBeCloseTo(expected.width / 2, 3);
      expect(geometry[i].fill).toBe("rgb(255, 255, 255)");
      expect(geometry[i].roll).toBeCloseTo(9.35, 3);
    }
    const orb = await mascot.locator(".grok-orb").evaluate((node) => ({
      width: node.getBoundingClientRect().width,
      height: node.getBoundingClientRect().height,
      radius: getComputedStyle(node).borderRadius,
      background: getComputedStyle(node).backgroundImage,
    }));
    expect(orb.width).toBeCloseTo(orb.height, 3);
    expect(orb.radius).toBe("50%");
    expect(orb.background).toContain("rgb(10, 10, 10)");
    await mascot.hover();
    await mascot.dispatchEvent("pointerdown");
    await page.mouse.move(1200, 650);
    await page.clock.runFor(8000);
    expect(await read()).toEqual(first);
  }
});

test("changing motion preference restores the reference pose and resumes cursor tracking", async ({
  page,
}) => {
  await page.goto("/");
  const mascot = page.locator(".site-header .grok-showcase");
  await expect(mascot).toHaveAttribute("style", /--head-x/);
  await page.mouse.move(1200, 650);
  await expect
    .poll(() =>
      mascot.evaluate((node) =>
        Number.parseFloat(
          (node as HTMLElement).style.getPropertyValue("--head-y"),
        ),
      ),
    )
    .toBeGreaterThan(5);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(mascot.locator(".grok-gaze")).toHaveAttribute(
    "transform",
    "rotate(9.35 50 50)",
  );
  await expect
    .poll(() =>
      mascot.evaluate((node) =>
        (node as HTMLElement).style.getPropertyValue("--head-y"),
      ),
    )
    .toBe("0deg");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.mouse.move(1100, 500);
  await expect
    .poll(() =>
      mascot.evaluate((node) =>
        Number.parseFloat(
          (node as HTMLElement).style.getPropertyValue("--head-y"),
        ),
      ),
    )
    .toBeGreaterThan(5);
});

test("favicon uses the same black orb and reference pill eyes", async ({
  page,
  request,
}) => {
  const response = await request.get("/icon.svg");
  expect(response.ok()).toBe(true);
  const source = await response.text();
  const icon = await page.evaluate((source) => {
    const svg = new DOMParser().parseFromString(source, "image/svg+xml");
    return {
      circle: svg.querySelector("circle")?.getAttribute("fill"),
      eyes: [...svg.querySelectorAll("rect")].map((eye) => ({
        width: eye.getAttribute("width"),
        height: eye.getAttribute("height"),
        transform: eye.getAttribute("transform"),
        fill: eye.getAttribute("fill"),
      })),
    };
  }, source);
  expect(icon.circle).toBe("#0a0a0a");
  expect(icon.eyes).toEqual([
    {
      width: "10.6",
      height: "27.8",
      transform: "rotate(9.35 19.7 41.8)",
      fill: "#fff",
    },
    {
      width: "13.2",
      height: "27.8",
      transform: "rotate(9.35 48.6 45.6)",
      fill: "#fff",
    },
  ]);
});

test("Chinese mobile directory, modal and loaded editor fit the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "中文", exact: true }).click();
  await expect(page.locator(".site-header .brand-badge")).toContainText(
    "Grok Bot · 100日造物实验",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "查看原帖与需求分析" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    await page
      .getByRole("dialog")
      .evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
  await page.getByRole("link", { name: "打开字幕阅读速度检查器" }).click();
  await page.getByRole("button", { name: "加载示例字幕" }).first().click();
  await expect(page.locator(".cue")).toHaveCount(8);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "重置本地数据" }).click();
  await expect(page.getByRole("status")).toContainText("本地草稿和设置已重置");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh");
});

test("Chinese validation and existing notices translate without changing the draft", async ({
  page,
}) => {
  await page.goto(toolPath);
  const input = page.getByRole("textbox", { name: "OR PASTE SRT TEXT" });
  await expect(input).toBeEnabled();
  await input.fill("1\nbroken timestamps\nKeep this text.");
  await page.getByRole("button", { name: "中文", exact: true }).click();
  await expect(page.locator(".parse-errors")).toContainText("第 1 个字幕块");
  await expect(
    page.getByRole("textbox", { name: "也可以粘贴 SRT 文本" }),
  ).toHaveValue(/Keep this text/);
  await expect(page.getByRole("button", { name: "下载 SRT" })).toBeDisabled();
  await page.getByRole("button", { name: "重置本地数据" }).click();
  await expect(page.getByRole("status")).toContainText("本地草稿和设置已重置");
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Local draft and settings reset",
  );
});

test("unavailable storage keeps language switching usable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("Storage unavailable");
    };
    Storage.prototype.setItem = () => {
      throw new Error("Storage unavailable");
    };
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.getByRole("button", { name: "中文", exact: true }).click();
  await expect(page.getByRole("heading", { name: /工具小一点/ })).toBeVisible();
  await page.getByRole("link", { name: "打开工具", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "字幕阅读速度检查器",
  );
  await expect(page.locator(".privacy-note")).toContainText("浏览器存储不可用");
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  expect(errors).toEqual([]);
});
