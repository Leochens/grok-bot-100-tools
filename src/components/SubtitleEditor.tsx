"use client";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import {
  Upload,
  Copy,
  Download,
  WandSparkles,
  Check,
  AlertTriangle,
  FileText,
  LockKeyhole,
  ChevronDown,
} from "lucide-react";
import { tools } from "@/data/tools";
import {
  autoWrap,
  inspectCue,
  parseSrt,
  PRESETS,
  SAMPLE_SRT,
  serializeSrt,
  type Cue,
} from "@/lib/srt";
import { useLanguage } from "./LanguageProvider";
import {
  editorMessage,
  issueLabel,
  parseErrorLabel,
} from "@/lib/subtitle-copy";
import { ToolShell } from "./ToolShell";

const STORAGE_KEY = "one-hundred:subtitle-cps:v1";
export function SubtitleEditor() {
  const { language, t } = useLanguage();
  const [raw, setRaw] = useState("");
  // Keep incomplete inline edits (trailing spaces/newlines) independent of parsing.
  const [inlineCues, setInlineCues] = useState<Cue[] | null>(null);
  const [preset, setPreset] = useState<keyof typeof PRESETS>("netflix");
  const [customCps, setCustomCps] = useState(17);
  const [customCpl, setCustomCpl] = useState(42);
  const [onlyViolations, setOnlyViolations] = useState(false);
  const [ready, setReady] = useState(false);
  const [storageStatus, setStorageStatus] = useState("Saved on this device");
  const [notice, setNotice] = useState("");
  const [filename, setFilename] = useState("subtitles.srt");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const readVersion = useRef(0);
  const standard =
    preset === "custom" ? { cps: customCps, cpl: customCpl } : PRESETS[preset];
  const parsed =
    inlineCues === null ? parseSrt(raw) : { cues: inlineCues, errors: [] };
  const analyzed = parsed.cues.map((cue, index) => ({
    cue,
    index,
    stats: inspectCue(cue, standard, parsed.cues[index - 1]),
  }));
  const violations = analyzed.filter(({ stats }) => stats.issues.length > 0);
  const visible = onlyViolations ? violations : analyzed;
  const validCps = analyzed.flatMap(({ stats }) =>
    stats.cps === null ? [] : [stats.cps],
  );
  const average = validCps.length
    ? validCps.reduce((a, b) => a + b, 0) / validCps.length
    : 0;
  const canExport =
    parsed.cues.length > 0 &&
    !parsed.errors.length &&
    analyzed.every(
      ({ stats }) =>
        stats.validTiming &&
        !stats.issues.includes("Empty text") &&
        !stats.issues.includes("Empty subtitle line"),
    );

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const state: unknown = JSON.parse(saved);
          if (state && typeof state === "object") {
            const s = state as Record<string, unknown>;
            if (typeof s.raw === "string") setRaw(s.raw);
            if (
              s.preset === "netflix" ||
              s.preset === "bbc" ||
              s.preset === "custom"
            )
              setPreset(s.preset);
            if (typeof s.cps === "number" && s.cps >= 1 && s.cps <= 100)
              setCustomCps(s.cps);
            if (typeof s.cpl === "number" && s.cpl >= 1 && s.cpl <= 200)
              setCustomCpl(s.cpl);
            if (typeof s.filename === "string") setFilename(s.filename);
            if (typeof s.onlyViolations === "boolean")
              setOnlyViolations(s.onlyViolations);
          }
        }
      } catch {
        setStorageStatus(
          "Browser storage unavailable — export to keep your work",
        );
      }
      setReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const save = () =>
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          raw,
          preset,
          cps: customCps,
          cpl: customCpl,
          filename,
          onlyViolations,
        }),
      );
    const timer = setTimeout(() => {
      try {
        save();
        setStorageStatus("Saved on this device");
      } catch {
        setStorageStatus(
          "Browser storage full or unavailable — export to keep your work",
        );
      }
    }, 350);
    const flush = () => {
      try {
        save();
      } catch {
        /* The visible save status reports storage failures. */
      }
    };
    window.addEventListener("pagehide", flush);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [raw, preset, customCps, customCpl, filename, onlyViolations, ready]);

  function reset() {
    readVersion.current++;
    setInlineCues(null);
    setRaw("");
    setPreset("netflix");
    setCustomCps(17);
    setCustomCpl(42);
    setFilename("subtitles.srt");
    setOnlyViolations(false);
    if (inputRef.current) inputRef.current.value = "";
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* The in-memory reset still succeeds. */
    }
    setNotice(
      "Local draft and settings reset. Start fresh or load the sample.",
    );
  }
  function sample() {
    readVersion.current++;
    setInlineCues(null);
    setRaw(SAMPLE_SRT);
    setFilename("sample-subtitles.srt");
    setNotice(
      "8 sample cues loaded. Try auto-wrap, then shorten a red-zone cue or adjust its timing.",
    );
  }
  async function loadFile(file?: File) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".srt")) {
      setNotice("Please choose an .srt subtitle file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setNotice("Please use an SRT file smaller than 5 MB.");
      return;
    }
    const version = ++readVersion.current;
    try {
      const text = await file.text();
      if (version !== readVersion.current) return;
      setInlineCues(null);
      setRaw(text);
      setFilename(file.name);
      setNotice(`${file.name} opened locally. No file was uploaded.`);
    } catch {
      setNotice(
        "This file could not be read. Try pasting its SRT text instead.",
      );
    }
  }
  function updateCue(index: number, patch: Partial<Cue>) {
    if (parsed.errors.length) {
      setNotice(
        "Fix malformed blocks in the SRT input before editing cues, so no content is lost.",
      );
      return;
    }
    applyCues(
      parsed.cues.map((cue, i) => (i === index ? { ...cue, ...patch } : cue)),
    );
  }
  function applyCues(cues: Cue[]) {
    setInlineCues(cues);
    setRaw(serializeSrt(cues));
  }
  function wrapAll() {
    applyCues(
      parsed.cues.map((cue) => ({
        ...cue,
        text: autoWrap(cue.text, standard.cpl),
      })),
    );
    setNotice(
      "Lines balanced. CPS and timing are unchanged; remaining warnings need an editorial pass.",
    );
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([serializeSrt(parsed.cues)], {
        type: "application/x-subrip;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = filename.replace(/\.srt$/i, "") + "-balanced.srt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(
      "SRT downloaded. Review remaining warnings and check the timing against your video.",
    );
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(serializeSrt(parsed.cues));
      setNotice("SRT copied to clipboard.");
    } catch {
      setNotice(
        "Clipboard access is unavailable. Use Download SRT, or select and copy the input text.",
      );
    }
  }
  function drop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    void loadFile(event.dataTransfer.files[0]);
  }
  function customChange(setter: (value: number) => void, max: number) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const value = Number(event.target.value);
      if (Number.isFinite(value)) setter(Math.max(1, Math.min(max, value)));
    };
  }

  return (
    <ToolShell tool={tools[0]} onSample={sample} onReset={reset}>
      <div className="tool-workspace">
        <aside className="input-panel">
          <div className="panel-heading">
            <span className="eyebrow">
              {t("01 / YOUR SUBTITLES", "01 / 导入字幕")}
            </span>
            <FileText size={16} />
          </div>
          <div
            className={`dropzone ${dragging ? "dragging" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={drop}
          >
            <Upload size={23} />
            <h3>{t("Drop your .srt here", "把 .srt 文件拖到这里")}</h3>
            <p>
              {t("or", "或")}{" "}
              <button
                className="text-link"
                onClick={() => inputRef.current?.click()}
              >
                {t("browse files", "选择文件")}
              </button>{" "}
              {t("· up to 5 MB", "· 最大 5 MB")}
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".srt"
              className="sr-only"
              aria-label={t("Upload SRT file", "选择 SRT 字幕文件")}
              onChange={(e) => {
                void loadFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
          <label className="input-label" htmlFor="srt-input">
            {t("OR PASTE SRT TEXT", "也可以粘贴 SRT 文本")}{" "}
            <span className="mono">
              {raw.length.toLocaleString(t("en-US", "zh-CN"))}{" "}
              {t("CHARS", "字符")}
            </span>
          </label>
          <textarea
            id="srt-input"
            className="raw-input"
            spellCheck={false}
            value={raw}
            disabled={!ready}
            onChange={(e) => {
              readVersion.current++;
              setInlineCues(null);
              setRaw(e.target.value);
            }}
            placeholder={t(
              "1\n00:00:01,000 --> 00:00:04,500\nEvery word deserves a little room.",
              "1\n00:00:01,000 --> 00:00:04,500\n让每个字，都来得及看清。",
            )}
          />
          <div className="panel-heading standard-heading">
            <span className="eyebrow">
              {t("02 / YOUR TARGET STANDARD", "02 / 设置检查标准")}
            </span>
          </div>
          <label className="sr-only" htmlFor="standard">
            {t("Target standard", "检查标准")}
          </label>
          <div className="preset-select">
            <select
              id="standard"
              value={preset}
              onChange={(e) =>
                setPreset(e.target.value as keyof typeof PRESETS)
              }
            >
              {Object.entries(PRESETS).map(([key, value]) => (
                <option value={key} key={key}>
                  {t(
                    value.name,
                    key === "netflix"
                      ? "Netflix · 保守预设"
                      : key === "bbc"
                        ? "BBC 风格 · 保守预设"
                        : "自定义标准",
                  )}
                </option>
              ))}
            </select>
            <ChevronDown size={16} />
          </div>
          <div className="standard-values">
            <label>
              {t("MAX CPS", "阅读速度上限（CPS）")}
              {preset === "custom" ? (
                <input
                  aria-label={t("Custom maximum CPS", "自定义 CPS 上限")}
                  type="number"
                  min="1"
                  max="100"
                  value={customCps}
                  onChange={customChange(setCustomCps, 100)}
                />
              ) : (
                <strong>
                  {standard.cps}
                  <small>{t("chars/sec", "字/秒")}</small>
                </strong>
              )}
            </label>
            <label>
              {t("MAX LINE LENGTH", "单行字数上限（CPL）")}
              {preset === "custom" ? (
                <input
                  aria-label={t(
                    "Custom maximum line length",
                    "自定义单行字数上限",
                  )}
                  type="number"
                  min="1"
                  max="200"
                  value={customCpl}
                  onChange={customChange(setCustomCpl, 200)}
                />
              ) : (
                <strong>
                  {standard.cpl}
                  <small>{t("chars/line", "字/行")}</small>
                </strong>
              )}
            </label>
          </div>
          <p className="standard-note">
            {t(
              "Conservative workflow presets, not delivery certification. Netflix English permits 20 CPS for adults, 17 for children; BBC uses WPM guidance. Always check your brief.",
              "这些预设偏保守，只方便日常检查，不代表符合交付规范。Netflix 英语字幕允许成人内容 20 CPS、儿童内容 17 CPS；BBC 则参考每分钟词数。请以你的项目要求为准。",
            )}
          </p>
          <details className="counting-note">
            <summary>
              {t("How are characters counted?", "字符是怎么算的？")}
            </summary>
            <p>
              {t(
                "Unicode code points, including spaces and punctuation. Line breaks count as one space for CPS. HTML and ASS styling tags are excluded. A maximum of two lines is checked. Auto-wrap preserves words; shorten or retime any cue that still exceeds your limits.",
                "按 Unicode 码点计数，空格和标点也算。计算 CPS 时，换行按一个空格计；HTML 和 ASS 样式标签不计入。每条字幕最多两行。智能断行会保留完整单词；仍然超标的字幕，需要精简文字或调整时间。",
              )}
            </p>
            <a
              className="text-link"
              href="https://partnerhelp.netflixstudios.com/hc/en-us/articles/30806198616339-English-UK-Timed-Text-Style-Guide"
              target="_blank"
              rel="noreferrer"
            >
              {t("Netflix style reference ↗", "查看 Netflix 字幕规范 ↗")}
            </a>
          </details>
          <div className="privacy-note">
            <LockKeyhole size={15} />
            <span>
              {t(
                "Your subtitles never leave this browser.",
                "字幕只留在这个浏览器里。",
              )}
              <small>{editorMessage(storageStatus, language)}</small>
            </span>
          </div>
        </aside>
        <section
          className="results-panel"
          aria-label={t("Subtitle inspection results", "字幕检查结果")}
        >
          <div className="results-heading">
            <div>
              <span className="eyebrow">
                {t("03 / INSPECT & REBALANCE", "03 / 检查与调整")}
              </span>
              <h2>{t("A little breathing room.", "让字幕从容一点。")}</h2>
            </div>
            <span className="badge">{filename}</span>
          </div>
          <div className="stats-grid">
            <div>
              <span className="mono">{t("TOTAL CUES", "字幕总条数")}</span>
              <strong>{parsed.cues.length.toString().padStart(2, "0")}</strong>
            </div>
            <div className={violations.length ? "warning-stat" : ""}>
              <span className="mono">{t("NEED ATTENTION", "需要调整")}</span>
              <strong>
                {violations.length.toString().padStart(2, "0")}
                <small>{t("cues", "条")}</small>
              </strong>
            </div>
            <div>
              <span className="mono">
                {t("AVERAGE CPS", "平均阅读速度（CPS）")}
              </span>
              <strong>
                {average.toFixed(1)}
                <small>/{standard.cps}</small>
              </strong>
            </div>
          </div>
          <div className="cue-toolbar">
            <div className="segmented">
              <button
                aria-pressed={!onlyViolations}
                className={!onlyViolations ? "active" : ""}
                onClick={() => setOnlyViolations(false)}
              >
                {t("All Cues", "全部字幕")}
              </button>
              <button
                aria-pressed={onlyViolations}
                className={onlyViolations ? "active" : ""}
                onClick={() => setOnlyViolations(true)}
              >
                {t("Violations Only", "只看有问题的")}{" "}
                <span>{violations.length}</span>
              </button>
            </div>
            <button
              className="text-link"
              disabled={!parsed.cues.length || !!parsed.errors.length}
              onClick={wrapAll}
            >
              <WandSparkles size={15} />
              {t("Auto-wrap all", "全部智能断行")}
            </button>
          </div>
          <div role="status" className={`notice ${notice ? "has-notice" : ""}`}>
            {editorMessage(notice, language)}
          </div>
          {parsed.errors.length > 0 && (
            <div className="parse-errors" role="alert">
              <strong>
                <AlertTriangle size={16} />
                {t("Input needs a small fix", "输入格式需要改一下")}
              </strong>
              {parsed.errors.map((error) => (
                <p key={error}>{parseErrorLabel(error, language)}</p>
              ))}
              <p>
                {t(
                  "All original input is preserved. Fix these blocks before editing or exporting.",
                  "原始文本都还在。请先修正这些字幕块，再继续编辑或导出。",
                )}
              </p>
            </div>
          )}
          {!raw.trim() ? (
            <div className="editor-empty">
              <div className="empty-icon">
                <FileText size={30} strokeWidth={1.2} />
              </div>
              <h3>
                {t(
                  "Good subtitles start with a quick check.",
                  "交字幕前，花一分钟检查一下。",
                )}
              </h3>
              <p>
                {t(
                  "Drop or paste your SRT, or take the sample for a spin.",
                  "拖入文件、粘贴 SRT，或先加载示例试试。",
                )}
                <br />
                {t(
                  "Red zones appear here, ready for an inline fix.",
                  "有问题的地方会标红，可以直接在这里改。",
                )}
              </p>
              <button className="button primary" onClick={sample}>
                {t("Load Sample Data", "加载示例字幕")} <ArrowRightIcon />
              </button>
            </div>
          ) : visible.length === 0 && parsed.cues.length > 0 ? (
            <div className="editor-empty">
              <Check size={32} />
              <h3>
                {t("Everything is within your limits.", "都在你设定的范围内。")}
              </h3>
              <p>
                {t(
                  "No violations under this preset. Export when you’re ready.",
                  "按当前标准检查，没有发现超标。准备好了就可以导出。",
                )}
              </p>
            </div>
          ) : (
            <div className="cue-list">
              {visible.map(({ cue, index, stats }) => (
                <article
                  className={`cue ${stats.issues.length ? "has-issues" : ""}`}
                  key={index}
                >
                  <div className="cue-header">
                    <span className="mono">
                      {t("CUE", "字幕")} {String(index + 1).padStart(3, "0")}
                    </span>
                    <div>
                      {stats.issues.length ? (
                        <span className="cue-warning">
                          <AlertTriangle size={12} />
                          {stats.issues
                            .map((issue) => issueLabel(issue, language))
                            .join(" · ")}
                        </span>
                      ) : (
                        <span className="green-text">
                          <Check size={13} /> {t("Within limits", "符合标准")}
                        </span>
                      )}
                    </div>
                    <button
                      className="wrap-button"
                      disabled={!!parsed.errors.length}
                      onClick={() =>
                        updateCue(index, {
                          text: autoWrap(cue.text, standard.cpl),
                        })
                      }
                      title={t(
                        "Balance into at most two lines",
                        "均衡分为最多两行",
                      )}
                    >
                      <WandSparkles size={13} />
                      {t("Auto-wrap", "智能断行")}
                    </button>
                  </div>
                  <div className="cue-edit-grid">
                    <div className="cue-text-block">
                      <textarea
                        aria-label={t(
                          `Cue ${index + 1} text`,
                          `第 ${index + 1} 条字幕文本`,
                        )}
                        value={cue.text}
                        disabled={!!parsed.errors.length}
                        onChange={(e) =>
                          updateCue(index, { text: e.target.value })
                        }
                        rows={Math.max(2, cue.text.split("\n").length)}
                        spellCheck={false}
                      />
                      <div className="timestamps">
                        <label>
                          <span>{t("IN", "开始")}</span>
                          <input
                            aria-label={t(
                              `Cue ${index + 1} start timestamp`,
                              `第 ${index + 1} 条字幕开始时间`,
                            )}
                            value={cue.start}
                            disabled={!!parsed.errors.length}
                            onChange={(e) =>
                              updateCue(index, { start: e.target.value })
                            }
                            spellCheck={false}
                          />
                        </label>
                        <span>→</span>
                        <label>
                          <span>{t("OUT", "结束")}</span>
                          <input
                            aria-label={t(
                              `Cue ${index + 1} end timestamp`,
                              `第 ${index + 1} 条字幕结束时间`,
                            )}
                            value={cue.end}
                            disabled={!!parsed.errors.length}
                            onChange={(e) =>
                              updateCue(index, { end: e.target.value })
                            }
                            spellCheck={false}
                          />
                        </label>
                        <span>
                          {stats.duration.toFixed(2)}
                          {t("s", "秒")}
                        </span>
                      </div>
                    </div>
                    <div className="cue-metrics">
                      <strong
                        className={
                          stats.cps !== null && stats.cps > standard.cps
                            ? "red-text"
                            : "green-text"
                        }
                      >
                        {stats.cps === null ? "—" : stats.cps.toFixed(1)}
                        <small>CPS</small>
                      </strong>
                      <meter
                        aria-label={t(
                          `Cue ${index + 1} reading speed`,
                          `第 ${index + 1} 条字幕阅读速度`,
                        )}
                        min={0}
                        max={standard.cps * 2}
                        low={0}
                        high={standard.cps}
                        optimum={standard.cps / 2}
                        value={stats.cps ?? 0}
                      />
                      <span
                        className={
                          stats.maxLine > standard.cpl ? "red-text" : ""
                        }
                      >
                        {stats.maxLine}/{standard.cpl} {t("CPL", "字/行")} ·{" "}
                        {stats.lines}/2 {t("lines", "行")}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
          <div className="export-bar">
            <span className="mono">
              <LockKeyhole size={13} />
              {t("LOCAL IN. LOCAL OUT.", "本地导入，本地导出。")}
            </span>
            <div>
              <button
                className="button"
                disabled={!canExport}
                onClick={() => void copy()}
              >
                <Copy size={14} />
                {t("Copy SRT", "复制 SRT")}
              </button>
              <button
                className="button primary"
                disabled={!canExport}
                onClick={download}
              >
                <Download size={15} />
                {t("Download SRT", "下载 SRT")}
              </button>
            </div>
          </div>
          <p className="export-note">
            {t(
              "Wrapping balances lines; it does not reduce CPS. Shorten text or edit timing for speed warnings. Exports retain unresolved warnings; invalid timing or malformed blocks must be fixed first.",
              "断行只调整排版，不会降低 CPS。阅读速度超标时，请精简文字或调整时间。导出会保留尚未解决的超标项；时间无效或格式有误时，需要先修好才能导出。",
            )}
          </p>
        </section>
      </div>
    </ToolShell>
  );
}
function ArrowRightIcon() {
  return <span aria-hidden="true">→</span>;
}
