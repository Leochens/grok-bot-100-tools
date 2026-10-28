import type { ToolEntry } from "./tools";
import { cardMetadata, type SourcePostLink } from "./source-types";
import researched from "./planned-sources.json";

const summaries = [
  [
    "A cook needs to reduce roughly 200 Word recipes from 8–10 servings to 4 without recalculating each ingredient by hand.",
    "一位家庭烹饪者想把约 200 份 Word 食谱从 8–10 人份改成 4 人份，不想逐味食材手算。",
  ],
  [
    "Batch sizes, leftover egg whites and oversized recipes prompt repeated scaling; spreadsheet entry takes time and can miss an ingredient.",
    "大批量制作、用掉剩余蛋白、缩小大配方都需要反复换算；录入表格费时，还容易漏乘一项。",
  ],
  [
    "Leftover apples and a larger chili gathering illustrate scaling by either an available ingredient or the number of guests.",
    "剩余苹果和聚会辣炖肉的例子，分别体现按手头食材量或就餐人数缩放的需要。",
  ],
];
const titlesZh = [
  "想找能随份数自动调整食材用量的食谱软件",
  "手算配方缩放太累了，所以我做了一个应用",
  "Recipe Scaler：按食材量或份数放大、缩小配方的网站",
];
const posts: SourcePostLink[] = researched["16"].map((p, i) => ({
  platform: "Reddit",
  author: "Reddit contributor",
  handleOrSubreddit: i === 1 ? "r/Baking" : "r/Cooking",
  date: "Exact date unavailable · see original",
  url: p.url,
  quote: `Editorial body summary: ${summaries[i][0]}`,
  quoteZh: `编辑整理的正文摘要：${summaries[i][1]}`,
  metricsLabel: "Counts unavailable · see original",
  context: "summary",
  verification: "reviewed",
}));
const pain =
  "Scaling a pasted ingredient list by servings (or leftover amount) while keeping fractions and kitchen units readable is error-prone by hand or spreadsheet.";
const painZh =
  "按人数或手头余料缩放整份食材表时，手算或表格容易漏乘，分数和常用单位也不好看。";
const local =
  "Parse and scale locally, preserve sections and unparsed lines with warnings, and download text, JSON or CSV. Use US customary volume and avoirdupois mass; never convert volume to mass without density. Pinch/dash stay symbolic. Only leading amounts scale; instructions, package sizes and cooking times need manual review.";
const localZh =
  "在本地解析和缩放，保留分区与未解析行并提示，支持文本、JSON、CSV 导出。采用美制杯勺及常衡重量；没有密度就不跨体积和重量换算。撮和少许按次数处理。仅缩放行首用量；步骤、包装规格和烹饪时间需手动检查。";
export function buildDaySixteen(base: ToolEntry): ToolEntry {
  if (base.day !== 16) return base;
  return {
    ...base,
    status: "built",
    tier: "daily",
    painPoint: pain,
    sourcePlatform: "Reddit",
    sourceAuthor: posts[0].author,
    sourceUrl: posts[0].url,
    sourceDate: posts[0].date,
    sourcePosts: posts,
    sourceCard: {
      ...cardMetadata(posts[0], researched["16"][0].title, titlesZh[0]),
      flair: "Editorial summary",
      flairZh: "编辑摘要",
    },
    originalComplaint: `Editorial summary: ${summaries[0][0]}`,
    originalPostFull: `Editorial source summaries, not full archived posts or verbatim quotations.\n\n${researched["16"].map((p, i) => `${p.title}\n${summaries[i][0]}\n${p.url}`).join("\n\n")}\n\nPublic thread titles and bodies reviewed on 2026-10-28. Exact dates and engagement are unavailable; author labels remain generic. The local ingredient-list workflow is our implementation interpretation, not an endorsement by the authors. Day 016 replaces the planned coffee-water concentrate blender under the niche filter: scaling dinner for a different number of people is understandable in one sentence.`,
    requirementsAnalysis: {
      who: base.nicheAudience,
      whyExistingToolsFail: pain,
      isolatedPainPoint: base.summary,
      localFirstDesign: local,
    },
    optimizations: [
      {
        date: "2026-10-28",
        source: `Initial implementation review · ${posts[2].url}`,
        complaint:
          "Fraction parsing and readable units need explicit handling; a failed quantity must never disappear from exports.",
        resolution:
          "Test mixed and Unicode fractions, preserve and mark unparsed lines in exports, retain exact numeric scaled amounts, and restrict conversions to the same unit family. This is an implementation review, not subsequent user feedback.",
        zh: {
          source: `首版实现复核 · ${posts[2].url}`,
          complaint:
            "分数解析和单位可读性需要专门处理；无法识别的数量不能在导出时消失。",
          resolution:
            "覆盖带分数与 Unicode 分数测试；导出时保留并标记未解析行；保留未取整的缩放数值，单位仅在同类内换算。这是实现复核，并非后续用户反馈。",
        },
      },
    ],
    zh: {
      ...base.zh,
      painPoint: painZh,
      sourceDate: "精确日期不可用，见原帖",
      originalComplaint: `编辑摘要：${summaries[0][1]}`,
      originalPostFull: `编辑整理的来源摘要，并非原帖完整存档或逐字引述。\n\n${researched["16"].map((p, i) => `${titlesZh[i]}\n${summaries[i][1]}\n${p.url}`).join("\n\n")}\n\n2026-10-28 已复核公开标题和正文。无法确认精确日期与互动数，作者使用通用标签。食材表本地缩放流程属于我们的实现解读，不代表作者背书。第 016 天按细分受众筛选规则，替换原定的咖啡矿物质母液配水工具：按就餐人数调整晚餐食材，一句话就能讲清痛点。`,
      requirementsAnalysis: {
        who: base.zh.nicheAudience,
        whyExistingToolsFail: painZh,
        isolatedPainPoint: base.zh.summary,
        localFirstDesign: localZh,
      },
    },
  };
}
