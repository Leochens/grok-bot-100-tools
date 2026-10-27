/** Translate presentation only; keep saved drafts and parser diagnostics language-neutral. */
const messages: Record<string, string> = {
  "Saved on this device": "已保存在这台设备上",
  "Browser storage unavailable — export to keep your work":
    "浏览器存储不可用，请导出保存你的修改",
  "Browser storage full or unavailable — export to keep your work":
    "浏览器存储已满或不可用，请导出保存你的修改",
  "Local draft and settings reset. Start fresh or load the sample.":
    "本地草稿和设置已重置。可以重新开始，或加载示例字幕。",
  "8 sample cues loaded. Try auto-wrap, then shorten a red-zone cue or adjust its timing.":
    "已加载 8 条示例字幕。试试智能断行，再精简标红的字幕，或调整它的时间。",
  "Please choose an .srt subtitle file.": "请选择 .srt 格式的字幕文件。",
  "Please use an SRT file smaller than 5 MB.": "请选择小于 5 MB 的 SRT 文件。",
  "This file could not be read. Try pasting its SRT text instead.":
    "文件没能读出来。可以试着直接粘贴里面的 SRT 文本。",
  "Fix malformed blocks in the SRT input before editing cues, so no content is lost.":
    "请先修正输入区里格式有误的字幕块，再逐条编辑，避免丢失内容。",
  "Lines balanced. CPS and timing are unchanged; remaining warnings need an editorial pass.":
    "断行已调整，CPS 和时间保持原样。剩下的警告还需要你检查一下。",
  "SRT downloaded. Review remaining warnings and check the timing against your video.":
    "SRT 已下载。记得检查剩余警告，并对照视频确认时间。",
  "SRT copied to clipboard.": "SRT 已复制到剪贴板。",
  "Clipboard access is unavailable. Use Download SRT, or select and copy the input text.":
    "无法使用剪贴板。可以下载 SRT，或选中输入区的文本手动复制。",
};
const issues: Record<string, string> = {
  "Invalid timing": "时间无效",
  "Overlapping cues": "字幕时间重叠",
  "Reading speed": "阅读速度过快",
  "Line too long": "单行太长",
  "More than 2 lines": "超过两行",
  "Empty text": "字幕内容为空",
  "Empty subtitle line": "字幕中有空行",
};
export function editorMessage(message: string, language: "en" | "zh"): string {
  if (language === "en") return message;
  const opened = message.match(
    /^([\s\S]+) opened locally\. No file was uploaded\.$/,
  );
  if (opened) return `已在本地打开 ${opened[1]}，文件没有上传。`;
  return messages[message] ?? message;
}
export function issueLabel(issue: string, language: "en" | "zh"): string {
  return language === "zh" ? (issues[issue] ?? issue) : issue;
}
export function parseErrorLabel(error: string, language: "en" | "zh"): string {
  if (language === "en") return error;
  const block = error.match(/^Block (\d+):/);
  return block
    ? `第 ${block[1]} 个字幕块：缺少时间行或格式不对，应为 HH:MM:SS,mmm --> HH:MM:SS,mmm。`
    : error;
}
