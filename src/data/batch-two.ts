import type { ToolEntry } from "./tools";
import { batchOneTools } from "./batch-one";
import { cardMetadata, type SourcePostLink } from "./source-types";
type Detail = {
  pain: string;
  painZh: string;
  behavior: string;
  behaviorZh: string;
  limits: string;
  limitsZh: string;
  xDay?: number;
};
const details: Record<number, Detail> = {
  8: {
    pain: "Slicer estimates cannot tell whether a partly used spool has enough material when tare, density and a print queue are kept in separate spreadsheets.",
    painZh:
      "切片软件无法获知旧线盘的实际余量；空盘重量、材料密度与多件打印队列分散在不同表格里。",
    behavior:
      "Read Prusa, Orca, Bambu and Cura filament totals or calculate extrusion with M82/M83, G92 resets and retraction recovery. Convert measured net mass to length using diameter and material density, then check each queued print against a reserved spool budget.",
    behaviorZh:
      "读取 Prusa、Orca、Bambu、Cura 的耗材总量，或根据 M82/M83、G92 重置和回抽恢复计算挤出量。按直径、密度将净重换算为长度，逐项核对打印队列和安全余量。",
    limits:
      "Tare presets are approximate and editable. Multi-material motion fallback uses the selected density; slicer totals are preferred. Export inventory CSV/JSON and the full queue calculation.",
    limitsZh:
      "空盘预设为可修改的参考值。多材料挤出估算按所选密度计算，优先采用切片总量。可导出库存 CSV/JSON 以及完整队列计算。",
  },
  9: {
    pain: "A laser removes material from both sides of an outline; applying the same offset to a tab and a slot can double a fitting error.",
    painZh:
      "激光会烧掉轮廓两侧材料，榫头与槽口若使用相同方向补偿，会让配合误差进一步放大。",
    behavior:
      "Derive kerf from external, internal or N-cut strip measurements. Calculate opposite tab/slot compensation and total press/snug/slip clearance. Generate a millimeter SVG comb and mating finger-joint coupons with separate cutting and engraving groups.",
    behaviorZh:
      "从外部、内部或 N 刀条带测量推导切缝，分别计算榫头与槽口的反向补偿及压入、贴合、滑入总间隙。生成毫米 SVG 梳尺和成对指接试片，区分切割与雕刻图层。",
    limits:
      "Clearances are starting values for a physical test, and material thickness is measured input. Disable additional CAM kerf offsets. The SVG coupon supports material up to 8 mm.",
    limitsZh:
      "配合间隙是实体测试起点，材料厚度需实测。导入时应关闭 CAM 额外切缝补偿。SVG 试片支持厚度不超过 8 mm。",
    xDay: 4,
  },
  10: {
    pain: "HP arithmetic, temporary hit points, concentration saves and expiring conditions are easily lost when initiative is just a sorted list.",
    painZh: "只用一张先攻列表，很容易漏算临时生命、专注豁免和状态到期时间。",
    behavior:
      "Sort initiative by DEX tiebreaker, apply signed HP arithmetic with temporary-HP absorption, log concentration DC=max(10,floor(damage/2)), and decrement conditions when the affected turn ends. Preserve complete encounters in versioned JSON and export a Markdown log.",
    behaviorZh:
      "按先攻及敏捷排序，支持带正负号的生命运算、临时生命吸收，记录专注 DC=max(10,floor(伤害/2))，在目标回合结束时递减状态。版本化 JSON 保存完整遭遇，可导出 Markdown 战斗日志。",
    limits:
      "A next-turn condition skips the current affected turn. Saving throws are resolved by the table; the tracker displays the DC and does not roll or silently end concentration.",
    limitsZh:
      "“下一回合”状态会跳过目标当前回合。玩家自行掷豁免；工具显示 DC，不代掷，也不自动取消专注。",
  },
  11: {
    pain: "Renaming hundreds of photographs by hand risks overwriting files, losing chronological order and having no reliable undo record.",
    painZh:
      "手动给数百张照片改名，容易覆盖文件、打乱时间顺序，事后也没有可靠的回滚记录。",
    behavior:
      "Read local filenames and modification timestamps or pasted capture metadata. Expand event, padded sequence, UTC date, original name and extension tokens. Detect collisions, occupied targets and illegal portable filenames before generating guarded Bash and PowerShell rename/rollback scripts and a CSV manifest.",
    behaviorZh:
      "读取本地文件名、修改时间或粘贴的拍摄元数据，展开活动名、补零序号、UTC 日期、原名和扩展名变量。先检查重名、目标占用及非法名称，再生成含预检的 Bash、PowerShell 改名与回滚脚本及 CSV 清单。",
    limits:
      "Browser file metadata is not EXIF. Run generated scripts from the original folder. All destinations are preflighted, shell arguments are quoted and overwrite operations are blocked.",
    limitsZh:
      "浏览器读取的时间不是 EXIF 拍摄时间。脚本需在源文件夹运行，执行前检查全部目标，参数安全引用，并阻止覆盖。",
    xDay: 3,
  },
  12: {
    pain: "Duplicate first fields can update existing Anki notes, while damaged quotes and Cloze syntax cause imports to drop fields or create broken cards.",
    painZh:
      "Anki 首字段冲突可能更新已有笔记，损坏的引号与挖空语法又会造成字段丢失或坏卡片。",
    behavior:
      "Parse quoted CSV/TSV and Anki separator headers, report duplicate keys, empty/unbalanced Cloze deletions, malformed quotes, orphan rows and delimiter uncertainty. Edit fields inline or deduplicate by keeping the first or last note. Export UTF-8 TSV with #separator:tab and #html:true.",
    behaviorZh:
      "解析带引号的 CSV/TSV 与 Anki 分隔符头，报告首字段重复、挖空为空或括号不平衡、引号损坏、孤立行及分隔符异常。可逐格修改或保留首条、末条去重，导出含 #separator:tab 与 #html:true 的 UTF-8 TSV。",
    limits:
      "Broken CSV quoting requires a source-text correction before export. Existing collection duplicates depend on Anki import settings. Newlines are emitted as HTML line breaks.",
    limitsZh:
      "CSV 引号损坏时须先修正原文才能导出。与已有牌组的重复匹配取决于 Anki 导入设置。多行内容转换为 HTML 换行。",
  },
  13: {
    pain: "Vault-wide broken links are difficult to prioritize when folder paths, case, aliases and Dataview fields are interpreted inconsistently.",
    painZh:
      "文件夹路径、大小写、别名和 Dataview 字段混用时，很难汇总笔记库失效链接并排定修复顺序。",
    behavior:
      "Read Markdown files/folders or a multi-note JSON bundle, parse YAML title/aliases/tags and inline Dataview fields, resolve wiki/Markdown links, group missing targets, and identify case/alias ambiguity and notes without incoming links. Export JSON/Markdown audits and converted Markdown individually or in a path-preserving ZIP.",
    behaviorZh:
      "读取 Markdown 文件、文件夹或多笔记 JSON，解析 YAML 标题、别名、标签与 Dataview 行内字段，解析 Wiki 和 Markdown 链接，汇总缺失目标、大小写和别名歧义以及无入链笔记。可导出 JSON/Markdown 审计和保留目录的转换笔记 ZIP。",
    limits:
      "Only imported Markdown notes are in scope. External URLs and attachments are skipped. Invalid YAML blocks conversion; existing frontmatter values win when Dataview fields are migrated.",
    limitsZh:
      "范围仅包含已导入 Markdown 笔记；跳过外部网址和附件。无效 YAML 会阻止转换；迁移 Dataview 字段时已有 frontmatter 值优先。",
    xDay: 4,
  },
  14: {
    pain: "A parts list alone does not account for blade width, locked grain, available stock quantities or the order of cuts that makes a layout physically achievable.",
    painZh:
      "只有零件清单不够，还需考虑锯缝、纹理锁定、原料数量，以及布局是否能按实际切割顺序完成。",
    behavior:
      "Use a three-step stock/layout/schedule workbench for 1D boards and 2D panels. Deterministic first-fit decreasing guillotine packing tracks every cut and kerf rectangle, locks grain rotations, labels reusable offcuts and exposes exact coordinates in keyboard-accessible SVG diagrams. Export shop SVGs, cut-list CSV, schedule Markdown and plan JSON.",
    behaviorZh:
      "用原料、布局、切割顺序三步工作台规划一维条材和二维板材。确定性降序首次适应直切装箱记录每道切割和锯缝矩形，限制纹理旋转、标注可复用余料，并提供可用键盘操作的 SVG 精确坐标图。导出 SVG、CSV、Markdown 顺序表及 JSON 方案。",
    limits:
      "A deterministic heuristic is not a global optimum. Unplaced parts remain visibly flagged. Stock must share thickness/material; subtract edge trim first. One-dimensional diagrams exaggerate height but preserve exact lengths.",
    limitsZh:
      "启发式算法不保证全局最优；未放置零件会明确提示。原料应具有相同材质和厚度，请先扣除修边余量。一维图放大显示高度，但长度精确。",
  },
};
export function buildBatchTwo(base: ToolEntry): ToolEntry {
  const d = details[base.day];
  if (!d) return base;
  let sourcePosts = base.sourcePosts;
  if (d.xDay) {
    const saved = batchOneTools
      .find((t) => t.day === d.xDay)!
      .sourcePosts.filter((p) => p.platform === "X");
    const original = saved[base.day === 13 && saved.length > 1 ? 1 : 0];
    const related: SourcePostLink = {
      ...original,
      context: "related",
      quote: `Related workflow inspiration from the project’s saved X sources: ${original.quote} This post is not a direct request for this domain-specific tool.`,
      quoteZh: `项目已保存的 X 工作流参考：${original.quoteZh} 此帖并未直接提出本工具的领域需求。`,
    };
    sourcePosts = [related, ...base.sourcePosts];
  }
  const primary = sourcePosts[0];
  return {
    ...base,
    status: "built",
    painPoint: d.pain,
    summary: d.behavior,
    sourcePosts,
    sourcePlatform: primary.platform,
    sourceAuthor: primary.author,
    sourceUrl: primary.url,
    sourceDate: primary.date,
    sourceCard: cardMetadata(primary),
    originalComplaint: primary.quote,
    originalPostFull: `${primary.quote}\n\nSource context: saved project X references are explicitly marked as adjacent workflow inspiration; the linked Reddit discussions provide domain-specific research. Excerpts and thread titles are not full archived posts. Dates and engagement are not invented.\n\nImplemented scope: ${d.behavior}\n\nPractical limits: ${d.limits}`,
    requirementsAnalysis: {
      who: base.nicheAudience,
      whyExistingToolsFail: d.pain,
      isolatedPainPoint: d.behavior,
      localFirstDesign:
        "Real parsing, deterministic calculations, editable localStorage drafts via useLocalDraft and usable clipboard/file exports run entirely in the browser. " +
        d.limits,
    },
    optimizations: [
      {
        date: "2026-10-28",
        source: base.sourcePosts[0].url,
        complaint: d.pain,
        resolution: d.behavior,
        zh: {
          source: base.sourcePosts[0].url,
          complaint: d.painZh,
          resolution: d.behaviorZh,
        },
      },
      {
        date: "2026-10-28",
        source: base.sourcePosts[1].url,
        complaint:
          "A usable result must remain inspectable, recoverable and portable.",
        resolution:
          d.limits +
          " Local sample/reset actions and persisted drafts support repeatable use.",
        zh: {
          source: base.sourcePosts[1].url,
          complaint: "实际结果需要可核对、可恢复、可带走。",
          resolution: d.limitsZh + " 提供示例、重置及本地草稿。",
        },
      },
    ],
    zh: {
      ...base.zh,
      painPoint: d.painZh,
      summary: d.behaviorZh,
      sourceDate: primary.platform === "X" ? "日期未核实" : base.zh.sourceDate,
      originalComplaint: primary.quoteZh,
      originalPostFull: `${primary.quoteZh}\n\n来源说明：已保存的 X 帖明确标为相邻工作流参考，领域调研来自所列 Reddit 讨论。节选与标题并非完整存档，不编造日期或互动数。\n\n已实现：${d.behaviorZh}\n\n使用边界：${d.limitsZh}`,
      requirementsAnalysis: {
        who: base.zh.nicheAudience,
        whyExistingToolsFail: d.painZh,
        isolatedPainPoint: d.behaviorZh,
        localFirstDesign:
          "真实解析、确定性计算、useLocalDraft 本地草稿及复制下载全部在浏览器运行。" +
          d.limitsZh,
      },
    },
  };
}
