import type { ToolEntry } from "./tools";
import { cardMetadata, type SourcePostLink } from "./source-types";
import researched from "./planned-sources.json";

const summaries = [
  [
    "A home baker asks how to calculate hydration and account for a mixed-flour recipe; replies distinguish bowl hydration from starter-inclusive hydration.",
    "一位家庭烘焙者询问如何计算含水量以及混合面粉配方；回复区区分了直接投料与计入酵种后的真实含水量。",
  ],
  [
    "A baker is confused by differing hydration assessments. Replies explain that starter flour and water belong in the full formula; the worked example gives roughly 77.27% instead of 75%.",
    "一位烘焙者对不同的含水量判断感到困惑。回复说明完整配方要计入酵种中的面粉和水，举例结果约为 77.27%，而非 75%。",
  ],
];
const titlesZh = ["含水量需要帮忙", "问个基础问题：含水量到底怎么算？"];
const redditPosts: SourcePostLink[] = researched["17"].map((p, i) => ({
  platform: "Reddit",
  author: i === 0 ? "u/-SpiritusMundi-" : "Reddit contributor",
  handleOrSubreddit: "r/Sourdough",
  date: "Exact date unavailable · see original",
  url: p.url,
  quote: `Editorial body summary: ${summaries[i][0]}`,
  quoteZh: `编辑整理的正文摘要：${summaries[i][1]}`,
  metricsLabel: "Counts unavailable · see original",
  context: "summary",
  verification: "reviewed",
}));
const posts: SourcePostLink[] = [
  {
    platform: "X",
    author: "Jakub Biedrzycki",
    handleOrSubreddit: "@jakubbied",
    date: "2026-10-10",
    url: "https://x.com/jakubbied/status/2108814998252277870",
    quote:
      "Your sourdough isn't sticky because of the flour. It's the water, including the water hiding in your starter. Count it and the same recipe handles the way you expect.",
    quoteZh:
      "酸面包发黏往往不是面粉的问题，而是水——包括藏在酵种里的水。把这部分算进去，同一份配方的手感才对得上。",
    metricsLabel: "1 reply · 11 views",
    context: "excerpt",
    verification: "reviewed",
  },
  {
    platform: "X",
    author: "Sami Co",
    handleOrSubreddit: "@samibobammie",
    date: "2026-10-10",
    url: "https://x.com/samibobammie/status/2108731194556678499",
    quote:
      "Changed the starter hydration and the ratios in the dough… definitely gonna need more stretch and folds to build gluten.",
    quoteZh:
      "同时改了酵种含水量和主面团配比，面筋状态完全变了，得靠更多折叠去补。",
    metricsLabel: "1 reply · 10 likes · 265 views",
    context: "excerpt",
    verification: "reviewed",
  },
  ...redditPosts,
];
const pain =
  "Starter flour and water are easy to omit when reading hydration or scaling a dough, so the true formula drifts.";
const painZh =
  "算含水量或放大缩小面团时，很容易漏掉酵种里的面粉和水，真实配方就偏了。";
const summary =
  "Split starter into flour and water, recompute true baker’s percentages and hydration, then scale to a target dough or flour weight.";
const summaryZh =
  "把酵种拆成面粉和水，重算真实烘焙百分比和含水量，再按目标面团或面粉重量缩放。";
const local =
  "Pure browser math, editable grams or baker’s percentages with a total-flour/dough anchor, ratio-preserving scaling, local drafts, printable text and JSON/CSV. Every percentage uses total flour including starter flour. Other ingredients contribute weight but not hydration; starter contributions are never counted twice.";
const localZh =
  "浏览器本地计算，可编辑克数，或以总面粉/面团重量为基准编辑烘焙百分比；等比缩放、本地草稿，支持可打印文本及 JSON/CSV。所有百分比以含酵种面粉的总面粉为基准。其他食材只计重量、不计含水量；酵种成分不重复相加。";
export function buildDaySeventeen(base: ToolEntry): ToolEntry {
  if (base.day !== 17) return base;
  return {
    ...base,
    status: "built",
    tier: "daily",
    title: "Sourdough Baker’s Percentage Recalculator",
    nicheAudience: "Sourdough home bakers",
    painPoint: pain,
    summary,
    sourcePlatform: "X",
    sourceAuthor: posts[0].author,
    sourceUrl: posts[0].url,
    sourceDate: posts[0].date,
    sourcePosts: posts,
    sourceCard: {
      ...cardMetadata(posts[0]),
      replies: 1,
      reposts: 0,
      likes: 0,
      views: 11,
    },
    originalComplaint: posts[0].quote,
    originalPostFull: `Verified X excerpts, retrieved via the built-in X API on 2026-10-28; these are excerpts, not full archived posts. Reddit discussions are corroborating editorial summaries.\n\n${posts.map((p) => `${p.author} · ${p.handleOrSubreddit}\n${p.quote}\n${p.url}`).join("\n\n")}\n\nBoth X posts are dated 2026-10-10. Verified X engagement at retrieval: Jakub Biedrzycki — 1 reply, 0 reposts, 0 likes, 11 views; Sami Co — 1 reply, 10 likes, 265 views. Reddit titles and bodies were reviewed on 2026-10-28; exact Reddit dates and engagement are unavailable, and unverified authors refer readers to the original. The calculator is our implementation interpretation, not an author endorsement. Niche filter: KEEP sourdough. Large r/Sourdough and r/Breadit communities make the home-baking workflow broadly understandable: true hydration must include flour and water inside the starter. This differs from Day 016’s weeknight serving scaler.`,
    requirementsAnalysis: {
      who: "Sourdough home bakers",
      whyExistingToolsFail: pain,
      isolatedPainPoint: summary,
      localFirstDesign: local,
    },
    optimizations: [
      {
        date: "2026-10-28",
        source: `Initial implementation review · ${posts[3].url}`,
        complaint:
          "Ambiguous starter percentages and double-counted starter splits can produce a plausible but incorrect formula.",
        resolution:
          "Use one total-flour denominator, distinguish the weigh-out list from informational contributions, validate percentage balance and anchors, and test starter splits and scale conservation. This is an implementation review, not subsequent user feedback.",
        zh: {
          source: `首版实现复核 · ${posts[3].url}`,
          complaint:
            "酵种比例基准不明、拆分后重复相加，都会让错误配方看起来像是对的。",
          resolution:
            "统一使用总面粉基准，区分实际投料表与成分核对表，校验百分比合计和基准重量，并测试酵种拆分及缩放比例守恒。这是实现复核，并非后续用户反馈。",
        },
      },
    ],
    zh: {
      ...base.zh,
      title: "酸面包含水量和配方换算器",
      nicheAudience: "家庭酸面包烘焙者",
      painPoint: painZh,
      summary: summaryZh,
      sourceDate: posts[0].date,
      originalComplaint: posts[0].quoteZh,
      originalPostFull: `X 帖文节选已于 2026-10-28 通过内置 X API 取得并核实，并非原帖完整存档。Reddit 讨论作为补充佐证，正文由编辑整理成摘要。\n\n${posts.map((p, i) => `${p.author} · ${p.handleOrSubreddit}\n${i >= 2 ? `${titlesZh[i - 2]}\n` : ""}${p.quoteZh}\n${p.url}`).join("\n\n")}\n\n两条 X 帖文均发布于 2026-10-10。取得时核实的互动数：Jakub Biedrzycki 为 1 条回复、0 次转发、0 个喜欢、11 次浏览；Sami Co 为 1 条回复、10 个喜欢、265 次浏览。Reddit 公开标题和正文已于 2026-10-28 复核；无法确认其精确日期与互动数，未核实的作者请见原帖。计算器属于我们的实现解读，不代表作者背书。细分受众筛选：保留酸面包主题。r/Sourdough、r/Breadit 等公开社区的家庭烘焙场景容易理解：算真实含水量必须计入酵种里的面粉和水。这与第 016 天按就餐人数缩放食材表的工作流不同。`,
      requirementsAnalysis: {
        who: "家庭酸面包烘焙者",
        whyExistingToolsFail: painZh,
        isolatedPainPoint: summaryZh,
        localFirstDesign: localZh,
      },
    },
  };
}
