import type { ToolEntry } from "./tools";
import { cardMetadata, type SourcePostLink } from "./source-types";
import researched from "./planned-sources.json";

const posts: SourcePostLink[] = researched["20"].map((p) => ({
  ...p,
  platform: p.platform as "X" | "Reddit",
  context: p.context as "excerpt" | "summary",
  verification: "reviewed",
}));
const audience =
  "Writers, students, and builders pasting tables into notes or AI chats";
const audienceZh = "把表格贴进笔记或 AI 对话的写作者、学生和开发者";
const pain =
  "Copying Excel/Sheets cells into Markdown, Notion, Obsidian, or ChatGPT scrambles columns, drops leading zeros, breaks on pipe characters, or pastes as an image—so people rebuild tables by hand.";
const painZh =
  "从 Excel/Sheets 复制到 Markdown、Notion、Obsidian 或 ChatGPT 时，列会错位、前导零丢失、竖线拆列，甚至整表变成图片，只好手工重排。";
const summary =
  "Paste TSV/CSV or a Markdown table, preview the grid, fix alignment and escapes, and export clean `.md`, `.tsv`, and `.csv` without uploading anything.";
const summaryZh =
  "粘贴 TSV/CSV 或 Markdown 表格，预览网格，修好对齐与转义，导出干净的 `.md`、`.tsv`、`.csv`，全程不上传。";
const design =
  "Local format detection, quoted CSV/TSV and GFM parsing preserve strings, empty cells and leading zeros. Preview the grid, choose headers, whitespace trimming and column alignment. Markdown escapes pipes and literal formatting; multiline cells flatten to spaces with a warning, while CSV/TSV retain line breaks. Malformed input blocks table exports; JSON diagnostics retain raw text and recovered cells. No upload or account.";
const designZh =
  "本地识别格式，解析带引号的 CSV/TSV 和 GFM，保留文本、空单元格及前导零。预览网格，可选表头、首尾空白处理和逐列对齐。Markdown 会转义竖线和格式标记；多行单元格会提示并用空格连接，CSV/TSV 则保留换行。格式错误时暂停表格导出，JSON 诊断保留原文和已恢复的单元格。无需上传或登录。";

export function buildDayTwenty(base: ToolEntry): ToolEntry {
  if (base.day !== 20) return base;
  return {
    ...base,
    slug: "day-020-md-table-converter",
    status: "built",
    tier: "daily",
    title: "Spreadsheet ↔ Markdown Table Converter",
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
      replies: 2,
      reposts: 0,
      likes: 0,
      views: 41,
    },
    originalComplaint: posts[0].quote,
    originalPostFull: `X excerpts verified via the X API on 2026-10-28, supplied in the implementation brief; not complete post archives. Himanshu Rathore: 2026-10-24, 2 replies, 0 reposts, 0 likes, 41 views; 2026-10-27, 1 reply, 11 views (other counts unavailable). Reddit entries are reviewed editorial body summaries; exact dates and engagement are unavailable.\n\n${posts.map((p) => `${p.author} · ${p.handleOrSubreddit}\n${p.quote}\n${p.url}`).join("\n\n")}\n\nNiche filter: REJECT / REPLACE ICS Timezone Inspector (ics-timezone-inspector). Day 019 Calendar Invite ICS Timezone Preview superseded that topic; another ICS timezone tool would duplicate its pain point. Spreadsheet ↔ Markdown conversion serves a distinct, broadly understandable writing and AI-chat workflow. This converter is our implementation interpretation, not an author endorsement.`,
    requirementsAnalysis: {
      who: audience,
      whyExistingToolsFail: pain,
      isolatedPainPoint: summary,
      localFirstDesign: design,
    },
    optimizations: [],
    zh: {
      ...base.zh,
      title: "表格与 Markdown 互转器",
      nicheAudience: audienceZh,
      painPoint: painZh,
      summary: summaryZh,
      sourceDate: posts[0].date,
      originalComplaint: posts[0].quoteZh,
      originalPostFull: `实现简报提供的 X 节选已于 2026-10-28 通过 X API 核实，并非完整原帖存档。Himanshu Rathore：2026-10-24 发布，取得时为 2 条回复、0 次转发、0 个喜欢、41 次浏览；2026-10-27 发布，为 1 条回复、11 次浏览，其他互动数未知。Reddit 条目为已复核的编辑正文摘要，精确日期与互动数不可用。\n\n${posts.map((p) => `${p.author} · ${p.handleOrSubreddit}\n${p.quoteZh}\n${p.url}`).join("\n\n")}\n\n细分受众筛选：淘汰并替换 ICS 日历时区检查器（ics-timezone-inspector）。第 019 天的日历邀请 ICS 时区预览器已覆盖该痛点，再做同类工具会重复。表格与 Markdown 互转服务于另一个容易理解的写作、笔记和 AI 对话场景。本工具是我们的实现解读，不代表原作者背书。`,
      requirementsAnalysis: {
        who: audienceZh,
        whyExistingToolsFail: painZh,
        isolatedPainPoint: summaryZh,
        localFirstDesign: designZh,
      },
    },
  };
}
