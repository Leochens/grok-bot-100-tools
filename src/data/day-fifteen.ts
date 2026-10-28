import type { ToolEntry } from "./tools";
import { cardMetadata, type SourcePostLink } from "./source-types";
const posts: SourcePostLink[] = [
  {
    platform: "Reddit",
    author: "u/Puppysnot",
    handleOrSubreddit: "r/sewing",
    date: "Exact date unavailable · see original",
    url: "https://www.reddit.com/r/sewing/comments/1q6w8c5/projector_sewing_questions/",
    quote: "Projector sewing questions",
    quoteZh: "缝纫投影的几个问题",
    metricsLabel: "Counts unavailable · see original",
    context: "title",
    verification: "reviewed",
  },
  {
    platform: "Reddit",
    author: "u/Shriver95",
    handleOrSubreddit: "r/sewing",
    date: "Exact date unavailable · see original",
    url: "https://www.reddit.com/r/sewing/comments/1fs94xo",
    quote: "Calibrating ultra short throw projector?",
    quoteZh: "超短焦投影仪怎么校准？",
    metricsLabel: "Counts unavailable · see original",
    context: "title",
    verification: "reviewed",
  },
  {
    platform: "Reddit",
    author: "u/Nlitvak87",
    handleOrSubreddit: "r/ProjectorsForSewing",
    date: "Exact date unavailable · see original",
    url: "https://www.reddit.com/r/ProjectorsForSewing/comments/1wrqjun/help_with_pattern_projection/",
    quote: "Help with pattern projection",
    quoteZh: "纸样投影需要帮忙",
    metricsLabel: "Counts unavailable · see original",
    context: "title",
    verification: "reviewed",
  },
];
const pain =
  "One matching square cannot establish accuracy across a cutting mat; scale, aspect stretch and edge differences need separate checks.";
const painZh =
  "一个方格对齐不代表整张裁剪垫准确；整体比例、宽高拉伸和边缘差异需要分别检查。";
const behavior =
  "Measure nine labeled zones, compare scale and keystone indicators, and export a true millimeter SVG chart with JSON/CSV measurements.";
const behaviorZh =
  "测量九个标记区域，分别检查比例和梯形失真指示，导出真实毫米 SVG 校准图及 JSON/CSV 测量结果。";
const limits =
  "All calculations and drafts stay in the browser. Missing readings remain unmeasured; edge comparisons require matched opposite zones. Advice gives correction direction, not a mount angle or model-specific dial value. Verify the projected SVG with a ruler and remeasure after any setup change.";
const limitsZh =
  "全部计算和草稿保留在浏览器。缺失读数不视为合格；边缘比较需要相对位置配对。建议给出调整方向，不反推安装角度或特定型号的刻度值。投影 SVG 后必须用尺核验，设置改变后需复测。";
export function buildDayFifteen(base: ToolEntry): ToolEntry {
  if (base.day !== 15) return base;
  return {
    ...base,
    status: "built",
    tier: "daily",
    painPoint: pain,
    summary: behavior,
    sourcePlatform: "Reddit",
    sourceAuthor: posts[0].author,
    sourceUrl: posts[0].url,
    sourceDate: posts[0].date,
    sourcePosts: posts,
    sourceCard: {
      ...cardMetadata(posts[0]),
      flair: "Pattern Question",
      flairZh: "纸样问题",
    },
    originalComplaint:
      "Everytime i try to pan around the PP calibration grid, it ends up skewing and hence un-calibrating everything.",
    originalPostFull: `Editorial source summary, not a full archived post.\n\nThe primary discussion concerns phone casting: a restricted calibration viewport and alignment drifting while panning. Its follow-up reports a landscape/browser workaround.\n\nThe ultra-short-throw discussion reports a small reference matching while larger spans remain undersized. The pattern-projection discussion describes a calibrated small mat with larger pieces clipped from view; replies discuss mobile display behavior. These are separate accuracy and coverage problems.\n\nThis tool's nine-zone measurement workflow is our interpretation of those discussions, not a feature request or endorsement by their authors. It helps distinguish scale and spatial variation; it cannot repair another viewer's clipping. Titles, authors and thread bodies were reviewed on 2026-10-28. Exact dates and engagement counts were unavailable and are not invented.`,
    requirementsAnalysis: {
      who: base.nicheAudience,
      whyExistingToolsFail: pain,
      isolatedPainPoint: behavior,
      localFirstDesign: limits,
    },
    optimizations: [
      {
        date: "2026-10-28",
        source:
          "Initial implementation review · https://www.reddit.com/r/sewing/comments/1fs94xo",
        complaint:
          "An average near zero can hide opposite errors, and a correct center does not establish accuracy at the edges.",
        resolution:
          "Report every zone and the worst measured deviation; leave missing edge comparisons unavailable and require all nine zones before a whole-mat tolerance result. Preserve nominal SVG dimensions instead of baking a guessed warp into the chart. This is an implementation review, not subsequent user feedback.",
        zh: {
          source:
            "首版实现复核 · https://www.reddit.com/r/sewing/comments/1fs94xo",
          complaint:
            "平均误差接近零可能掩盖正负偏差；中心准确不能代表边缘准确。",
          resolution:
            "显示各区及最大实测偏差；缺失的边缘比较保持不可用，只有九区完整测量才给出整垫容差结果。SVG 保留标称尺寸，不将推测变形写入校准图。这是实现复核，并非后续用户反馈。",
        },
      },
    ],
    zh: {
      ...base.zh,
      painPoint: painZh,
      summary: behaviorZh,
      sourceDate: "精确日期不可用，见原帖",
      originalComplaint:
        "每次想平移 PP 校准网格，网格都会歪斜，之前的校准也就失效了。",
      originalPostFull:
        "编辑整理的来源摘要，并非原帖完整存档。\n\n主帖讨论手机投屏时校准视野有限、平移时对齐发生漂移；楼主后续提到横屏及更换浏览器的解决办法。\n\n超短焦帖子描述小方格已对齐，较长跨度却仍偏小。纸样投影帖子描述小垫校准后，大纸样显示不全；回复讨论手机显示问题。比例准确和显示覆盖属于不同问题。\n\n九区测量流程是我们结合讨论提炼的方案，不是作者的直接功能要求或背书。它帮助区分比例与空间差异，不能修复其他阅读器的裁切。2026-10-28 已复核标题、作者和正文；无法确认精确日期及互动数，因此不编造。",
      requirementsAnalysis: {
        who: base.zh.nicheAudience,
        whyExistingToolsFail: painZh,
        isolatedPainPoint: behaviorZh,
        localFirstDesign: limitsZh,
      },
    },
  };
}
