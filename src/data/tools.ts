import { batchOneTools, dayOnePosts } from "./batch-one";
import { plannedTools } from "./planned-tools";
import {
  cardMetadata,
  type SourcePostLink,
  type SourceCardMetadata,
} from "./source-types";
export type { SourcePostLink, SourceCardMetadata } from "./source-types";

type OptimizationCopy = {
  source: string;
  complaint: string;
  resolution: string;
};
export type ToolOptimization = OptimizationCopy & {
  zh: OptimizationCopy;
  date: string;
};

export type ToolEntry = {
  zh: Pick<
    ToolEntry,
    | "title"
    | "nicheAudience"
    | "painPoint"
    | "summary"
    | "sourceDate"
    | "originalComplaint"
    | "originalPostFull"
    | "requirementsAnalysis"
  >;
  day: number;
  status: "built" | "planned";
  sourcePosts: SourcePostLink[];
  sourceCard: SourceCardMetadata;
  slug: string;
  title: string;
  tier: "daily" | "weekly";
  nicheAudience: string;
  painPoint: string;
  summary: string;
  sourcePlatform: "X" | "Reddit";
  sourceAuthor: string;
  sourceUrl: string;
  sourceDate: string;
  originalComplaint: string;
  originalPostFull: string;
  requirementsAnalysis: {
    who: string;
    whyExistingToolsFail: string;
    isolatedPainPoint: string;
    localFirstDesign: string;
  };
  optimizations: ToolOptimization[];
};

export const tools: ToolEntry[] = [
  {
    zh: {
      title: "字幕阅读速度检查器",
      nicheAudience: "字幕翻译与字幕组校对人员",
      painPoint: "找出读不完、单行太长的 SRT 字幕，顺手调整文字和断行。",
      summary: "字幕太快看不清？找出问题，理顺断行，再安心交片。",
      sourceDate: "2026 年 3 月 27 日",
      originalComplaint:
        "你们有没有什么办法，能让整个剪辑团队的字幕质量更稳定，项目多了也能应付？有什么诀窍能让第一版就少出点错？",
      originalPostFull: `字幕问题 — u/C_vansky，r/editors（原帖中文翻译）

我在一家代理公司工作，以前很少做字幕。新的 ADA 规定下个月就要生效了，我们突然什么片子都得加字幕，来回修改的次数也跟着多了起来。

现在的流程是先用 Premiere 转录，再根据转录生成字幕，最后手动修正识别不准之类的问题。
按理说这套流程应该没问题，但我收到了太多关于标点、大小写的修改意见，也确实漏掉了一些该改的地方。有些我明明记得改过，回头看却好像没改。

你们有没有什么办法，能让整个剪辑团队的字幕质量更稳定，项目多了也能应付？有什么诀窍能让第一版就少出点错？

讨论背景（编辑整理）
评论里聊到了字幕校对，包括阅读速度（CPS）和断行。有人推荐 Netflix 字幕规范，也有人会先导出到 Subtitle Edit，处理后再导回剪辑软件。原帖关心的是整体质量的一致性；这个 CPS 检查器是我们结合讨论和项目要求提炼出的切入点，并不是楼主直接提出的功能需求。楼主也说明了自己的工作不涉及翻译，我们把同类校对问题延伸到了字幕翻译和字幕组。

来源说明
2026 年 10 月 27 日查看时，Reddit 显示“7 个月前”；2026 年 10 月 28 日复核搜索索引时获得 2026 年 3 月 27 日的日期。这是真实的公开讨论，不代表发帖人为本工具背书。英文原文可切换 EN 或点击原帖链接查看。`,
      requirementsAnalysis: {
        who: "面向交付前检查 .srt 文件的影视字幕翻译和字幕组校对人员。原讨论中也有负责字幕质检的代理公司视频剪辑师。",
        whyExistingToolsFail:
          "原帖提到字幕反复返工，以及导出到桌面字幕软件再检查的流程。只是想快速查一遍阅读速度，却得打开完整编辑项目，有点费劲。这里专门检查数值问题，语言质量和画面对时仍需人工把关。",
        isolatedPainPoint:
          "马上找出超过 CPS 或单行字数上限的字幕，直接改文字、改时间，或均衡分成两行。断行只改变排版，不会让观众多出阅读时间。",
        localFirstDesign:
          "解析 SRT、统计 Unicode 字符、实时检查和均衡断行都在浏览器内完成。本地文件直接读取，草稿与设置保存在 localStorage，导出使用浏览器的下载和剪贴板功能。不用注册，不连 API，没有数据库、追踪或上传。",
      },
    },
    day: 1,
    status: "built",
    sourcePosts: dayOnePosts,
    sourceCard: cardMetadata(dayOnePosts[0], "Subtitles", "字幕问题"),
    slug: "day-001-subtitle-cps-fixer",
    title: "Subtitle CPS Fixer",
    tier: "daily",
    nicheAudience: "Subtitle translators & fansub QC editors",
    painPoint:
      "Spot and rebalance SRT cues that exceed reading-speed and line-length limits.",
    summary: "Catch too-fast subtitles. Rebalance the lines. Keep your flow.",
    sourcePlatform: "Reddit",
    sourceAuthor: "r/editors · u/C_vansky",
    sourceUrl: "https://www.reddit.com/r/editors/comments/1s5gosy/subtitles/",
    sourceDate: "2026-03-27",
    originalComplaint:
      "With that said is there a way to keep this more consistent and scalable throughout a team of editors that you have found? Is there any tips for getting this more correct on the first try?",
    originalPostFull: `Subtitles — u/C_vansky, r/editors

I work for an agency that historically we haven't done many subtitles. With the new ADA regulations coming into affect next month we all of a sudden are subtitling everything and it is causing a bunch of revisions.

Our current process is to have premiere transcribe, use that transcription to generate subtitles and then go through and edit the bad translations, etc.
The process it seems should be fine, but I have gotten so many notes on different ways to punctuate, capitalize and just generally I miss some things that should've been edited. Some I swear I edited, but seem to look like I haven't.

With that said is there a way to keep this more consistent and scalable throughout a team of editors that you have found? Is there any tips for getting this more correct on the first try?

THREAD CONTEXT (editorial summary)
Commenters discuss the craft of caption QC, including CPS and line breaks, recommend Netflix's timed-text style guide, and describe exporting to Subtitle Edit before importing back into an NLE. The post is about general consistency; the specific CPS inspector is our isolated interpretation of that discussion and the project brief, rather than a verbatim feature request. The original poster clarified that their own job did not involve translation. We extend the same QC bottleneck to subtitle translators and fansub editors.

SOURCE NOTE
Reddit displayed “7mo ago” when reviewed on October 27, 2026; a search-index review on October 28 exposed the March 27, 2026 posting date. This is a real public thread, not an endorsement.`,
    requirementsAnalysis: {
      who: "Broadcast & streaming subtitle translators and fansub QC editors reviewing exported .srt files before delivery. The source thread also includes agency video editors handling caption QC.",
      whyExistingToolsFail:
        "The thread describes QC revisions and a workflow that exports captions to a separate desktop editor. For a quick reading-speed pass, opening a full editing project adds friction. Our tool isolates numerical checks; it does not replace linguistic review or video synchronization.",
      isolatedPainPoint:
        "Immediately find cues over a chosen CPS or characters-per-line limit, edit their wording or timestamps, and balance them into two lines. Wrapping changes layout, not the time available to read the words.",
      localFirstDesign:
        "SRT parsing, Unicode character counting, live checks and balanced wrapping run entirely in the browser. File API reads local files, localStorage saves the working draft and settings, and Blob/Clipboard APIs export it. No account, API, database, telemetry, or upload.",
    },
    optimizations: [
      {
        zh: {
          source: "首版实现 · 需求复核",
          complaint:
            "字幕分成两行之后，还是可能快得读不完。自动断行不能把 CPS 超标的问题藏起来。",
          resolution:
            "把阅读速度、单行长度、行数和时间问题分开提示。智能断行保留原时间，每次编辑后重新计算所有指标。这条记录来自实现复核，并非后续用户反馈。",
        },
        date: "2026-10-27",
        source: "Initial implementation · requirements review",
        complaint:
          "A cue can fit on two lines and still be too fast to read. An automatic line break must not conceal a CPS violation.",
        resolution:
          "Separate CPS, line-length, line-count and timing warnings. Keep timing unchanged during auto-wrap, and recalculate all metrics after every edit. This is an implementation review, not a later user report.",
      },
    ],
  },
  ...batchOneTools,
  ...plannedTools,
];

export type RoadmapSlot = {
  day: number;
  tier: ToolEntry["tier"];
  status: "built" | "upcoming";
  tool?: ToolEntry;
};
export const roadmap: RoadmapSlot[] = Array.from(
  { length: 100 },
  (_, index) => {
    const day = index + 1;
    const tool = tools.find((entry) => entry.day === day);
    return {
      day,
      tier: day % 7 === 0 ? "weekly" : "daily",
      status: tool?.status === "built" ? "built" : "upcoming",
      tool,
    };
  },
);
export const formatDay = (day: number) => String(day).padStart(3, "0");

/** Keep source metadata and route identity unchanged when presenting translated copy. */
export function localizeTool(
  tool: ToolEntry,
  language: "en" | "zh",
): ToolEntry {
  return language === "zh" ? { ...tool, ...tool.zh } : tool;
}
