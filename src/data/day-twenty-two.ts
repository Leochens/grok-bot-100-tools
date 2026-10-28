import type { ToolEntry } from "./tools";
import { cardMetadata, type SourcePostLink } from "./source-types";
import researched from "./planned-sources.json";
const posts: SourcePostLink[] = researched["22"].map((p) => ({
  ...p,
  platform: p.platform as "X" | "Reddit",
  context: p.context as "excerpt" | "summary",
  verification: "reviewed",
}));
const audience =
  "Students and co-authors merging `.bib` files for Overleaf or LaTeX papers";
const audienceZh = "合并 `.bib` 文献库写 Overleaf 或 LaTeX 论文的学生与合著者";
const pain =
  "Co-authors paste references from Zotero, Scholar, and arXiv into a shared `.bib`, creating duplicate citation keys, same-DOI papers under different keys, missing DOIs, and unbraced title acronyms that silently turn `LSTM` into `Lstm`.";
const painZh =
  "合著者各自从 Zotero、Google Scholar、arXiv 往同一个 `.bib` 里贴文献，结果出现重复引用键、同一篇论文不同键名、缺 DOI，以及标题缩写漏加花括号把 `LSTM` 印成 `Lstm`。";
const summary =
  "Paste or drop `.bib` files, spot duplicate keys and same-paper entries (by DOI or normalized title+year), flag unbraced acronyms, choose which record to keep, and export a clean `.bib` plus key-remap map.";
const summaryZh =
  "粘贴或拖入 `.bib` 文件，找出重复引用键、同篇论文异键重复（按 DOI 或标题+年份）、未加括号的大写缩写，选择保留条目并导出干净 `.bib` 与引用键替换表。";
const design =
  "Balanced local BibTeX parsing retains source text and special blocks. Review transitive duplicate clusters by exact key, normalized DOI or title+year; case-only keys receive a warning. Keep a primary record, optionally brace title/booktitle acronyms, and export merged BibTeX, CSV/JSON key remaps and an audit JSON. Malformed input blocks clean exports. Macros remain intact and are not expanded for matching. No uploads or network.";
const designZh =
  "本地解析嵌套 BibTeX，保留原文和特殊块。按同名键、规范化 DOI 或标题和年份归并重复组，仅大小写不同的键会单独提醒。选择每组保留项，可给 title/booktitle 缩写加括号，导出合并文献库、CSV/JSON 引用键替换表及检查 JSON。语法错误会暂停干净文件导出。宏原样保留，不展开参与匹配。无需上传或联网。";
export function buildDayTwentyTwo(base: ToolEntry): ToolEntry {
  if (base.day !== 22) return base;
  return {
    ...base,
    slug: "day-022-bibtex-merge-auditor",
    status: "built",
    tier: "daily",
    title: "BibTeX Merge Auditor",
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
      views: 2,
    },
    originalComplaint: posts[0].quote,
    originalPostFull: `X excerpts verified via the X API on 2026-10-28 and supplied in the implementation brief, not complete post archives. Hung: 2026-10-12, 0 replies, 0 reposts, 0 likes, 2 views. PRUTHVI GEEDH: 2026-09-30, 1 reply, 195 views; other counts unavailable. Reddit records are reviewed editorial body summaries; exact dates and engagement are unavailable.\n\n${posts.map((p) => `${p.author} · ${p.handleOrSubreddit}\n${p.quote}\n${p.url}`).join("\n\n")}\n\nNiche filter: KEEP BibTeX Merge Auditor (bibtex-merge-auditor). Graduate students, academic co-authors and technical writers using Overleaf/Zotero/LaTeX form a large, well-known workflow group. Duplicate bibliographies are a classic collaboration pain. The implementation is editorial interpretation, not an author endorsement.`,
    requirementsAnalysis: {
      who: audience,
      whyExistingToolsFail: pain,
      isolatedPainPoint: summary,
      localFirstDesign: design,
    },
    optimizations: [],
    zh: {
      ...base.zh,
      title: "BibTeX 合并去重检查器",
      nicheAudience: audienceZh,
      painPoint: painZh,
      summary: summaryZh,
      sourceDate: posts[0].date,
      originalComplaint: posts[0].quoteZh,
      originalPostFull: `简报提供的 X 节选已于 2026-10-28 通过 X API 核实，并非完整原帖存档。Hung：2026-10-12，0 条回复、0 次转发、0 个喜欢、2 次浏览。PRUTHVI GEEDH：2026-09-30，1 条回复、195 次浏览，其他互动数未知。Reddit 为已复核的编辑正文摘要，精确日期和互动数不可用。\n\n${posts.map((p) => `${p.author} · ${p.handleOrSubreddit}\n${p.quoteZh}\n${p.url}`).join("\n\n")}\n\n细分受众筛选：保留 BibTeX 合并去重检查器（bibtex-merge-auditor）。使用 Overleaf、Zotero 和 LaTeX 的研究生、学术合著者及技术写作者是规模可观、容易理解的工作流群体，合并文献时重复录入是典型协作痛点。工具是我们的实现解读，不代表原作者背书。`,
      requirementsAnalysis: {
        who: audienceZh,
        whyExistingToolsFail: painZh,
        isolatedPainPoint: summaryZh,
        localFirstDesign: designZh,
      },
    },
  };
}
