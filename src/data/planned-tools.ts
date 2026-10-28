import { buildDayTwentyTwo } from "./day-twenty-two";
import { buildDayTwentyOne } from "./day-twenty-one";
import { buildDayTwenty } from "./day-twenty";
import { buildDayNineteen } from "./day-nineteen";
import { buildDayEighteen } from "./day-eighteen";
import { buildDaySeventeen } from "./day-seventeen";
import { buildDaySixteen } from "./day-sixteen";
import { buildDayFifteen } from "./day-fifteen";
import { buildBatchTwo } from "./batch-two";
import type { ToolEntry } from "./tools";
import { cardMetadata, type SourcePostLink } from "./source-types";
import researched from "./planned-sources.json";
import authors from "./source-authors.json";
const extra: Record<string, { title?: string; url: string }[]> = {
  "8": [
    {
      title: "How do you actually know how much filament is left on a spool?",
      url: "https://www.reddit.com/r/3Dprinting/comments/1wlbgml/how_do_you_actually_know_how_much_filament_is/",
    },
    {
      title:
        "PSA To companies making filament! Please tell us how much the spool weighs, not only the filament on it!",
      url: "https://www.reddit.com/r/3Dprinting/comments/1hsooar/",
    },
    {
      title: "How much filament do I have left?",
      url: "https://www.reddit.com/r/3Dprinting/comments/17ysckf/",
    },
  ],
  "14": [
    {
      title: "What do folks use to plan builds, cut lists, buy lists?",
      url: "https://www.reddit.com/r/woodworking/comments/1qsa1t1/what_do_folks_use_to_plan_builds_cut_lists_buy/",
    },
    {
      title: "Cut calculator app",
      url: "https://www.reddit.com/r/woodworking/comments/1444rjb/cut_calculator_app/",
    },
    {
      title: "What software tool are you missing?",
      url: "https://www.reddit.com/r/woodworking/comments/1g4pkho/",
    },
  ],
};
const plannedSpecs: [
  number,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string[],
][] = [
  [
    8,
    "filament-spool-budget",
    "Filament Spool Budget",
    "剩余耗材够不够打印",
    "3D printing makers",
    "桌面 3D 打印玩家",
    "Compare measured net filament with the next print and a reserve.",
    "称一下剩余耗材，对照下一单用量，留好余量再开打。",
    [
      "怎么知道一卷还剩多少耗材？",
      "希望厂商把空线盘重量标出来",
      "还有多少耗材没用完？",
    ],
  ],
  [
    9,
    "laser-kerf-fit",
    "Laser Kerf & Joint Fit Planner",
    "激光切缝和榫接配合计算器",
    "Laser-cut enclosure builders",
    "激光切割外壳制作人",
    "Calibrate measured kerf and plan tab/slot clearance.",
    "测好切缝，算清榫头和槽口该留多少间隙。",
    [
      "切缝到底该怎么算？",
      "胶合板指接的榫头和槽口都要补偿吗？",
      "切缝补偿把我绕晕了",
    ],
  ],
  [
    10,
    "initiative-round-ledger",
    "Initiative & Round Ledger",
    "先攻和回合记录台",
    "Tabletop game masters",
    "跑团主持人",
    "Keep turn order, conditions and round transitions together.",
    "顺好先攻，记住状态和回合变化，不打断跑团节奏。",
    [
      "想找一个简单的先攻记录器",
      "做了个免费的浏览器先攻记录器",
      "有没有更好的先攻记录方式？",
    ],
  ],
  [
    11,
    "photo-sequence-renamer",
    "Photo Sequence Rename Planner",
    "照片批量序号命名器",
    "Event photo editors",
    "活动照片后期师",
    "Preview collision-free file names before a batch export.",
    "批量命名前先看清新文件名，避免重名覆盖。",
    [
      "每天导出三百多张图，手动改名累坏了",
      "想按手工排好的照片顺序批量命名",
      "导出照片时大家怎么给文件命名？",
    ],
  ],
  [
    12,
    "anki-import-inspector",
    "Anki CSV Import Inspector",
    "Anki CSV 导入检查器",
    "Flashcard deck curators",
    "抽认卡牌组整理者",
    "Inspect first-field collisions and encoding before importing notes.",
    "导入前先查首字段冲突和编码，别让卡片悄悄漏掉。",
    [
      "为什么想保留重复卡片这么难？",
      "导入重复内容是不是做不到？",
      "CSV 文件怎么导不进去？",
    ],
  ],
  [
    13,
    "vault-link-auditor",
    "Markdown Vault Link Auditor",
    "笔记库内部链接检查器",
    "Markdown knowledge-base maintainers",
    "Markdown 知识库维护者",
    "Find unresolved internal links and group them by missing target.",
    "找出指向空处的内部链接，按缺失目标归并整理。",
    [
      "能找出被引用最多的失效链接吗？",
      "如何找出无效链接",
      "Obsidian 有些内部链接失效了",
    ],
  ],
  [
    14,
    "workshop-cut-planner",
    "Workshop Cut-List Workbench",
    "木工下料清单工作台",
    "Small-workshop cabinet makers",
    "小型木作工作室",
    "Plan stock, kerf, cut order and reusable offcuts locally.",
    "把原料、锯缝、切割顺序和可复用余料放在一起算。",
    [
      "大家用什么安排制作、下料和采购清单？",
      "有没有下料计算工具？",
      "你还缺什么木工软件工具？",
    ],
  ],
  [
    15,
    "projector-grid-calibrator",
    "Pattern Projector Grid Calibrator",
    "缝纫投影网格校准器",
    "Projector-sewing pattern cutters",
    "用投影裁纸样的缝纫爱好者",
    "Compare calibration squares across the projected work surface.",
    "对照投影台面的校准方格，看清哪里比例不准。",
    ["缝纫投影的几个问题", "超短焦投影仪怎么校准？", "纸样投影需要帮忙"],
  ],
  [
    16,
    "recipe-serving-scaler",
    "Recipe Serving & Unit Scaler",
    "食谱份量与单位换算器",
    "Home cooks scaling weeknight recipes",
    "要按人数改份量的家庭烹饪者",
    "Paste an ingredient list, set original vs target servings (or scale from one pivot amount), normalize kitchen units, and export the scaled recipe.",
    "粘贴食材表，按原份量/目标份量（或按某一味余料）等比缩放，整理常用单位，再导出新配方。",
    [
      "想找能随份数自动调整食材用量的食谱软件",
      "手算配方缩放太累了，所以我做了一个应用",
      "Recipe Scaler：按食材量或份数放大、缩小配方的网站",
    ],
  ],
  [
    17,
    "sourdough-bakers-percent",
    "Sourdough Baker’s Percentage Recalculator",
    "酸面包含水量和配方换算器",
    "Sourdough home bakers",
    "家庭酸面包烘焙者",
    "Account for starter flour and water when scaling a dough.",
    "把酵种里的面粉和水也算进去，放大缩小配方不乱套。",
    [
      "含水量需要帮忙",
      "问个基础问题：含水量到底怎么算？",
      "酸面包配方里的“20% 酵种”到底该怎么算？",
    ],
  ],
  [
    18,
    "bank-csv-normalizer",
    "Bank & Card CSV Debit/Credit Normalizer",
    "银行与信用卡账单 CSV 正负号规整器",
    "Freelancers & budgeters importing bank CSVs",
    "导入银行账单记账的自由职业者与个人对账者",
    "Map date, payee and debit/credit or type columns locally, normalize into one signed amount, verify the closing balance, and export a clean CSV.",
    "在本地映射日期、商户和借贷/类型列，合成单一带正负号金额，核对期初期末余额后导出标准 CSV。",
    ["CSV 导入有没有更省事的办法？", "导入信用卡交易后消费变成了收入"],
  ],
  [
    19,
    "ics-timezone-preview",
    "Calendar Invite ICS Timezone Preview",
    "日历邀请 ICS 时区预览器",
    "Remote workers checking calendar invites",
    "核对会议邀请时间的远程工作者",
    "Paste or upload an `.ics` invite, inspect DTSTART/DTEND and TZID, preview the event in UTC and your local zone, and export a diagnostic report.",
    "粘贴或上传 `.ics` 邀请，检查开始/结束时间和 TZID，预览 UTC 与本地时区下的会议时间，并导出诊断报告。",
    [
      "邮件和日历里的邀请时间对不上",
      "邀请时区不对",
      "打开和保存邀请时显示不同时间",
      "邀请时区不受支持",
    ],
  ],
  [
    20,
    "md-table-converter",
    "Spreadsheet ↔ Markdown Table Converter",
    "表格与 Markdown 互转器",
    "Writers, students, and builders pasting tables into notes or AI chats",
    "把表格贴进笔记或 AI 对话的写作者、学生和开发者",
    "Paste TSV/CSV or a Markdown table, preview the grid, fix alignment and escapes, and export clean `.md`, `.tsv`, and `.csv` without uploading anything.",
    "粘贴 TSV/CSV 或 Markdown 表格，预览网格，修好对齐与转义，导出干净的 `.md`、`.tsv`、`.csv`，全程不上传。",
    [
      "从 Obsidian 复制表格到其他软件会丢失结构",
      "Markdown 表格贴回 Google Sheets 后无法恢复列",
    ],
  ],
  [
    21,
    "timesheet-invoice-workbench",
    "Freelancer Timesheet → Invoice Lines Workbench",
    "自由职业工时表转发票明细工作台",
    "Freelancers turning tracker exports into invoice lines",
    "要把工时导出整理成发票明细的自由职业者",
    "Import a timesheet CSV/TSV, map columns, normalize durations with billing increments, apply per-client rates, group lines, and export invoice-ready CSV/Markdown plus an audit JSON—all local.",
    "导入工时 CSV/TSV，映射列，按计费粒度规整时长，套用客户单价，汇总明细，导出可开票的 CSV/Markdown 与审计 JSON，全程本地。",
    ["小时制项目怎么开票？", "发票表算出的金额不对"],
  ],
  [
    22,
    "bibtex-merge-auditor",
    "BibTeX Merge Auditor",
    "BibTeX 合并去重检查器",
    "Students and co-authors merging `.bib` files for Overleaf or LaTeX papers",
    "合并 `.bib` 文献库写 Overleaf 或 LaTeX 论文的学生与合著者",
    "Paste or drop `.bib` files, spot duplicate keys and same-paper entries (by DOI or normalized title+year), flag unbraced acronyms, choose which record to keep, and export a clean `.bib` plus key-remap map.",
    "粘贴或拖入 `.bib` 文件，找出重复引用键、同篇论文异键重复（按 DOI 或标题+年份）、未加括号的大写缩写，选择保留条目并导出干净 `.bib` 与引用键替换表。",
    [
      "怎么找到和管理重复文献？",
      "org-cite 导出时不要带上全局文献库",
      "Better BibTeX 的自动导出管理器去哪了？",
    ],
  ],
];
export const plannedTools: ToolEntry[] = plannedSpecs
  .map<ToolEntry>(
    ([
      day,
      slug,
      title,
      titleZh,
      audience,
      audienceZh,
      summary,
      summaryZh,
      titlesZh,
    ]) => {
      const records =
        (day === 19
          ? researched["19"].filter((p) => p.platform === "Reddit")
          : day === 20 || day === 21 || day === 22
            ? researched[String(day) as "20" | "21" | "22"]
                .filter((p) => p.platform === "Reddit")
                .map((p) => ({ title: p.quote, url: p.url }))
            : undefined) ??
        extra[String(day)] ??
        (researched as Record<string, { title?: string; url: string }[]>)[
          String(day)
        ];
      const sourcePosts: SourcePostLink[] = records.map((p, i) => ({
        platform: "Reddit",
        author:
          (authors as Record<string, string>)[p.url] ?? "Reddit contributor",
        handleOrSubreddit: "r/" + p.url.split("/r/")[1].split("/")[0],
        date: "See original for date",
        url: p.url,
        quote: p.title ?? "",
        quoteZh: titlesZh[i],
        metricsLabel: "Counts unavailable · see original",
        context: "title",
        verification: "reviewed",
      }));
      const primary = sourcePosts[0];
      const requirementsAnalysis = {
        who: audience,
        whyExistingToolsFail: summary,
        isolatedPainPoint: summary,
        localFirstDesign:
          "Planned for a later foundation batch. Must ship with a complete browser engine, editable local draft and downloadable output before being marked built.",
      };
      return {
        day,
        slug: `day-${String(day).padStart(3, "0")}-${slug}`,
        status: "planned",
        title,
        tier: day % 7 === 0 ? "weekly" : "daily",
        nicheAudience: audience,
        painPoint: summary,
        summary,
        sourcePlatform: "Reddit",
        sourceAuthor: primary.author,
        sourceUrl: primary.url,
        sourceDate: primary.date,
        sourcePosts,
        sourceCard: cardMetadata(primary),
        originalComplaint: primary.quote,
        originalPostFull: `Thread title: ${primary.quote}\n\nResearch entry for a later batch. Titles and links were found in public Reddit search. Verified author labels are shown when retrievable; missing identities, exact dates and engagement are not invented. The proposed solver is editorial interpretation; supporting discussions may cover adjacent aspects of the workflow.`,
        requirementsAnalysis,
        optimizations: [],
        zh: {
          title: titleZh,
          nicheAudience: audienceZh,
          painPoint: summaryZh,
          summary: summaryZh,
          sourceDate: "具体日期见原帖",
          originalComplaint: primary.quoteZh,
          originalPostFull: `原帖标题翻译：${primary.quoteZh}\n\n这是后续批次的需求调研条目。标题和链接来自公开 Reddit 搜索；没有冒认作者、精确日期或互动数。拟定的工具方案属于编辑分析，相关帖子可能只讨论了工作流的某个环节。`,
          requirementsAnalysis: {
            who: audienceZh,
            whyExistingToolsFail: summaryZh,
            isolatedPainPoint: summaryZh,
            localFirstDesign:
              "安排在后续基础批次。必须做好完整浏览器引擎、本地可编辑草稿和文件导出，才会标记为已上线。",
          },
        },
      };
    },
  )
  .map(buildBatchTwo)
  .map(buildDayFifteen)
  .map(buildDaySixteen)
  .map(buildDaySeventeen)
  .map(buildDayEighteen)
  .map(buildDayNineteen)
  .map(buildDayTwenty)
  .map(buildDayTwentyOne)
  .map(buildDayTwentyTwo);
