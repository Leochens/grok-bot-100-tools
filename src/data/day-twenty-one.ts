import type { ToolEntry } from "./tools";
import { cardMetadata, type SourcePostLink } from "./source-types";
import researched from "./planned-sources.json";

const posts: SourcePostLink[] = researched["21"].map((p) => ({
  ...p,
  platform: p.platform as "X" | "Reddit",
  context: p.context as "excerpt" | "summary",
  verification: "reviewed",
}));
const audience = "Freelancers turning tracker exports into invoice lines";
const audienceZh = "要把工时导出整理成发票明细的自由职业者";
const pain =
  "Month-end means exporting Clockify/Toggl/Sheets hours, hand-copying into an invoice, and fighting HH:MM vs decimal-hour rounding so clients see wrong fees.";
const painZh =
  "月底要从 Clockify/Toggl/表格导出工时，再手工抄进发票；HH:MM 和小数小时一搞错，客户看到的金额就不对。";
const summary =
  "Import a timesheet CSV/TSV, map columns, normalize durations with billing increments, apply per-client rates, group lines, and export invoice-ready CSV/Markdown plus an audit JSON—all local.";
const summaryZh =
  "导入工时 CSV/TSV，映射列，按计费粒度规整时长，套用客户单价，汇总明细，导出可开票的 CSV/Markdown 与审计 JSON，全程本地。";
const design =
  "A four-step local workbench parses quoted CSV/TSV with editable mapping, HH:MM[:SS], decimal hours, spreadsheet day fractions and overnight wall times. Round whole seconds per entry before computing integer cents, apply row/client/default rates, filter dates and billable entries, and group without mixing rates. Export invoice CSV, Markdown totals and a full audit JSON. Errors block invoice export while preserving raw input. EN/中文, local drafts and sample/reset need no upload or account.";
const designZh =
  "四步本地工作台解析带引号的 CSV/TSV，可映射列，支持时分秒、小数小时、表格天数小数及跨午夜时间。逐行先按秒取整再算分金额，依次使用本行、客户、默认单价，可筛选日期和计费工时，不同单价分开汇总。导出发票 CSV、Markdown 摘要及完整审计 JSON；有错误时暂停发票导出，保留原始输入。中英切换、本地草稿、示例和重置均无需上传或登录。";
export function buildDayTwentyOne(base: ToolEntry): ToolEntry {
  if (base.day !== 21) return base;
  return {
    ...base,
    slug: "day-021-timesheet-invoice-workbench",
    status: "built",
    tier: "weekly",
    title: "Freelancer Timesheet → Invoice Lines Workbench",
    nicheAudience: audience,
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
      likes: 1,
      views: 14,
    },
    originalComplaint: posts[0].quote,
    originalPostFull: `X excerpts verified through the X API on 2026-10-28 and supplied in the implementation brief; not full post archives. Jan Koenig: 2026-10-23, 1 reply, 0 reposts, 1 like, 14 views. Phillip Zannini: 2026-10-17, 18 views; other counts unavailable. Reddit entries are reviewed editorial body summaries; exact dates, identities and engagement are unavailable.\n\n${posts.map((p) => `${p.author} · ${p.handleOrSubreddit}\n${p.quote}\n${p.url}`).join("\n\n")}\n\nNiche filter: REJECT / REPLACE VJ MIDI Mapping Workbench (vj-midi-map-workbench). Live-visual MIDI mapping is too specialist. Freelancers translating tracked hours into invoice lines face a broadly understandable recurring workflow. This engine converts duration to billable hours to money, distinct from Day 018 bank CSV sign normalization. The workbench is our implementation interpretation, not an author endorsement.`,
    requirementsAnalysis: {
      who: audience,
      whyExistingToolsFail: pain,
      isolatedPainPoint: summary,
      localFirstDesign: design,
    },
    optimizations: [],
    zh: {
      ...base.zh,
      title: "自由职业工时表转发票明细工作台",
      nicheAudience: audienceZh,
      painPoint: painZh,
      summary: summaryZh,
      sourceDate: posts[0].date,
      originalComplaint: posts[0].quoteZh,
      originalPostFull: `实现简报提供的 X 节选已于 2026-10-28 通过 X API 核实，并非完整原帖存档。Jan Koenig：2026-10-23，1 条回复、0 次转发、1 个喜欢、14 次浏览。Phillip Zannini：2026-10-17，18 次浏览，其他互动数未知。Reddit 条目为已复核的编辑正文摘要，精确日期、作者身份和互动数不可用。\n\n${posts.map((p) => `${p.author} · ${p.handleOrSubreddit}\n${p.quoteZh}\n${p.url}`).join("\n\n")}\n\n细分受众筛选：淘汰并替换 VJ MIDI 映射工作台（vj-midi-map-workbench）。现场视觉演出的 MIDI 映射过于专业。自由职业者把已记录工时整理成发票明细，是容易理解且反复发生的需求。本引擎处理“时长→计费小时→金额”，有别于第 018 天的银行 CSV 正负号规整。本工具是我们的实现解读，不代表原作者背书。`,
      requirementsAnalysis: {
        who: audienceZh,
        whyExistingToolsFail: painZh,
        isolatedPainPoint: summaryZh,
        localFirstDesign: designZh,
      },
    },
  };
}
