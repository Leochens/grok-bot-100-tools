import type { ToolEntry } from "./tools";
import { cardMetadata, type SourcePostLink } from "./source-types";
import researched from "./planned-sources.json";

const posts: SourcePostLink[] = [
  {
    platform: "X",
    author: "ZeraBooks",
    handleOrSubreddit: "@ZeraBooks",
    date: "2026-10-19",
    url: "https://x.com/ZeraBooks/status/2112257475025965093",
    quote:
      "Xero bank statement import keeps failing? Strip the CSV back to Date, Amount and Payee, confirm the date format when you assign the columns, and make money out negative.",
    quoteZh:
      "Xero 银行账单导入总失败？先把 CSV 精简为日期、金额和收付款方，映射列时确认日期格式，并把支出统一改成负数。",
    metricsLabel: "2 views",
    context: "excerpt",
    verification: "reviewed",
  },
  {
    platform: "X",
    author: "Akhil",
    handleOrSubreddit: "@akhilworks",
    date: "2026-10-17",
    url: "https://x.com/akhilworks/status/2111334566699139278",
    quote:
      "We will upload our bank statement in CSV format, map which columns from statement corresponds to debit/credit/description etc. and generate.",
    quoteZh:
      "上传 CSV 格式的银行流水，映射哪几列对应借方、贷方和摘要，再生成标准表。",
    metricsLabel: "1 reply · 1 like · 14 views",
    context: "excerpt",
    verification: "reviewed",
  },
  ...researched["18"].map((p): SourcePostLink => ({
    platform: "Reddit",
    author: p.author,
    handleOrSubreddit: p.handleOrSubreddit,
    date: p.date,
    url: p.url,
    quote: p.quote,
    quoteZh: p.quoteZh,
    metricsLabel: p.metricsLabel,
    context: "summary",
    verification: "reviewed",
  })),
];
const pain =
  'Bank and card CSV exports split debits and credits, use a "Debit/Credit" type column, or flip charge signs, causing bookkeeping imports to fail or invert balances.';
const painZh =
  "银行和信用卡导出的 CSV 常把借贷拆成两列、用「借/贷」类型列或把消费标成正数，直接导入记账软件会报错或正负颠倒。";
const summary =
  "Map date, payee and debit/credit or type columns locally, normalize into one signed amount, verify the closing balance, and export a clean CSV.";
const summaryZh =
  "在本地映射日期、商户和借贷/类型列，合成单一带正负号金额，核对期初期末余额后导出标准 CSV。";
const audience = "Freelancers & budgeters importing bank CSVs";
const audienceZh = "导入银行账单记账的自由职业者与个人对账者";
const design =
  "Local RFC-4180 parsing with editable column mapping, split/type/signed modes, explicit date order and final sign inversion. Integer cents power totals, running balances and opening-to-closing reconciliation. Every record stays in diagnostics; row or mapping errors block clean CSV export. Local drafts, JSON audit with original CSV and text summary need no upload or account.";
const designZh =
  "本地解析 RFC-4180 CSV，可编辑列映射，支持借贷分列、类型列、带符号金额，以及明确的日期顺序和整体反转。用整数分计算收支合计、逐行余额及期初期末对账。诊断保留每条记录；行内容或映射错误会暂停标准 CSV 导出。本地草稿、含原始 CSV 的 JSON 核对报告和文本摘要均无需上传或登录。";
export function buildDayEighteen(base: ToolEntry): ToolEntry {
  if (base.day !== 18) return base;
  return {
    ...base,
    slug: "day-018-bank-csv-normalizer",
    status: "built",
    tier: "daily",
    title: "Bank & Card CSV Debit/Credit Normalizer",
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
    originalPostFull: `X excerpts verified via the X API on 2026-10-28, as supplied in the implementation brief; these are excerpts, not complete post archives. ZeraBooks: posted 2026-10-19, 0 replies, 0 reposts, 0 likes, 2 views. Akhil: posted 2026-10-17, 1 reply, 1 like, 14 views. Reddit entries are reviewed editorial body summaries; exact dates and engagement are unavailable.\n\n${posts.map((p) => `${p.author} · ${p.handleOrSubreddit}\n${p.quote}\n${p.url}`).join("\n\n")}\n\nNiche filter: REJECT / REPLACE LED Current & Resistor Budget (led-resistor-budget). A single-LED Ohm’s-law calculator is too narrow and elementary. Bank CSV sign cleanup is a broadly understandable import bottleneck for freelancers and personal budgeters. The normalizer is our implementation interpretation, not an author endorsement.`,
    requirementsAnalysis: {
      who: audience,
      whyExistingToolsFail: pain,
      isolatedPainPoint: summary,
      localFirstDesign: design,
    },
    optimizations: [
      {
        date: "2026-10-28",
        source: "Initial implementation review · Day 018",
        complaint:
          "Silent row loss, ambiguous dates and double-populated debit/credit cells can create plausible but incorrect imports.",
        resolution:
          "Retain raw records and row issues, require explicit slash-date order and type tokens, block CSV on errors, and reconcile integer cents. This is an implementation review, not later user feedback.",
        zh: {
          source: "首版实现复核 · 第 018 天",
          complaint:
            "悄悄丢行、日期歧义和同一行借贷都有值，都可能让错误账单看起来正常。",
          resolution:
            "保留原始记录和逐行问题，明确斜线日期顺序与类型词，有错误时暂停 CSV 导出，并用整数分对账。这是实现复核，并非后续用户反馈。",
        },
      },
    ],
    zh: {
      ...base.zh,
      title: "银行与信用卡账单 CSV 正负号规整器",
      nicheAudience: audienceZh,
      painPoint: painZh,
      summary: summaryZh,
      sourceDate: posts[0].date,
      originalComplaint: posts[0].quoteZh,
      originalPostFull: `实现简报提供的 X 节选已于 2026-10-28 通过 X API 核实，并非完整原帖存档。ZeraBooks 发布于 2026-10-19，取得时为 0 条回复、0 次转发、0 个喜欢、2 次浏览；Akhil 发布于 2026-10-17，为 1 条回复、1 个喜欢、14 次浏览。Reddit 条目是已复核的编辑正文摘要，精确日期和互动数不可用。\n\n${posts.map((p) => `${p.author} · ${p.handleOrSubreddit}\n${p.quoteZh}\n${p.url}`).join("\n\n")}\n\n细分受众筛选：淘汰并替换原 LED 限流电阻和功率计算器（led-resistor-budget）。单颗 LED 的欧姆定律计算过于狭窄、基础。银行账单 CSV 的正负号整理，则是自由职业者和个人记账者容易理解的导入难题。本工具是我们的实现解读，不代表原作者背书。`,
      requirementsAnalysis: {
        who: audienceZh,
        whyExistingToolsFail: painZh,
        isolatedPainPoint: summaryZh,
        localFirstDesign: designZh,
      },
    },
  };
}
