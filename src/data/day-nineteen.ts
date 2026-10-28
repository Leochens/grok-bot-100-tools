import type { ToolEntry } from "./tools";
import { cardMetadata, type SourcePostLink } from "./source-types";
import researched from "./planned-sources.json";
const posts: SourcePostLink[] = researched["19"].map((p) => ({
  ...p,
  platform: p.platform as "X" | "Reddit",
  context: p.context as "excerpt" | "summary",
  verification: "reviewed",
}));
const audience = "Remote workers checking calendar invites";
const audienceZh = "核对会议邀请时间的远程工作者";
const pain =
  "Calendar invites arrive with missing, custom, or mismatched TZIDs, so the email time and the calendar time disagree by an hour (or more) before anyone notices.";
const painZh =
  "会议邀请的 ICS 常缺时区、用自定义 TZID 或与本地时区不一致，邮件显示的时间和日历里的时间差一小时甚至更多，开会前才发现。";
const summary =
  "Paste or upload an `.ics` invite, inspect DTSTART/DTEND and TZID, preview the event in UTC and your local zone, and export a diagnostic report.";
const summaryZh =
  "粘贴或上传 `.ics` 邀请，检查开始/结束时间和 TZID，预览 UTC 与本地时区下的会议时间，并导出诊断报告。";
const design =
  "Local line unfolding and component parsing retain original input. UTC Z and embedded VTIMEZONE offsets power UTC and fixed-offset display previews. Floating times remain unresolved; DST month selection is labeled approximate. Inspect offset rules and export JSON/text, original bytes, or a guarded custom-TZID relabel that retains embedded rules. No IANA history lookup or network.";
const designZh =
  "本地展开折行并解析组件，保留原文。依据 UTC Z 或文件内 VTIMEZONE 偏移，预览 UTC 与固定偏移下的时间。浮动时间不强行换算；按月份选夏令时会明确标为近似值。可检查偏移规则，导出 JSON/文本、原始字节，或在条件满足时重命名自定义 TZID 并保留内嵌规则。不查询 IANA 历史时区，无需联网。";
export function buildDayNineteen(base: ToolEntry): ToolEntry {
  if (base.day !== 19) return base;
  return {
    ...base,
    slug: "day-019-ics-timezone-preview",
    status: "built",
    tier: "daily",
    title: "Calendar Invite ICS Timezone Preview",
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
      replies: 0,
      reposts: 0,
      likes: 0,
      views: 1,
    },
    originalComplaint: posts[0].quote,
    originalPostFull: `X excerpts verified via the X API on 2026-10-28, supplied in the implementation brief; not complete post archives. RameshKrishnamoorthy: 2026-09-28, 0 replies, 0 reposts, 0 likes, 1 view. Sujal: 2026-10-05, 5 views; other counts unavailable. Reddit entries are reviewed editorial body summaries; exact dates and engagement are unavailable.\n\n${posts.map((p) => `${p.author} · ${p.handleOrSubreddit}\n${p.quote}\n${p.url}`).join("\n\n")}\n\nNiche filter: REJECT / REPLACE ADIF Contact Log Reconciler (adif-log-reconciler). Amateur-radio ADIF reconciliation is too specialist. Invite timezone mismatches are a broadly understandable remote-work problem. This inspector is our implementation interpretation, not an author endorsement. Day 020’s former ICS research is superseded and must be replaced on its turn; it remains planned.`,
    requirementsAnalysis: {
      who: audience,
      whyExistingToolsFail: pain,
      isolatedPainPoint: summary,
      localFirstDesign: design,
    },
    optimizations: [],
    zh: {
      ...base.zh,
      title: "日历邀请 ICS 时区预览器",
      nicheAudience: audienceZh,
      painPoint: painZh,
      summary: summaryZh,
      sourceDate: posts[0].date,
      originalComplaint: posts[0].quoteZh,
      originalPostFull: `实现简报提供的 X 节选已于 2026-10-28 通过 X API 核实，并非完整原帖存档。RameshKrishnamoorthy 发布于 2026-09-28，取得时为 0 条回复、0 次转发、0 个喜欢、1 次浏览。Sujal 发布于 2026-10-05，为 5 次浏览，其他互动数未知。Reddit 条目为已复核的编辑正文摘要，精确日期与互动数不可用。\n\n${posts.map((p) => `${p.author} · ${p.handleOrSubreddit}\n${p.quoteZh}\n${p.url}`).join("\n\n")}\n\n细分受众筛选：淘汰并替换 ADIF 通联日志对账器（adif-log-reconciler），业余无线电 ADIF 日志对账过于专业。邀请时区错位是远程工作者容易理解的问题。本工具属于我们的实现解读，不代表原作者背书。第 020 天原有 ICS 调研已被本工具覆盖，轮到该天时必须重新选题，目前仍为计划中。`,
      requirementsAnalysis: {
        who: audienceZh,
        whyExistingToolsFail: painZh,
        isolatedPainPoint: summaryZh,
        localFirstDesign: designZh,
      },
    },
  };
}
