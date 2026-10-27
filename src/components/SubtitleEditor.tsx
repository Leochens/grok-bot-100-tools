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
import { ToolShell } from "./ToolShell";

const STORAGE_KEY = "one-hundred:subtitle-cps:v1";
export function SubtitleEditor() {
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
            <span className="eyebrow">01 / YOUR SUBTITLES</span>
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
            <h3>Drop your .srt here</h3>
            <p>
              or{" "}
              <button
                className="text-link"
                onClick={() => inputRef.current?.click()}
              >
                browse files
              </button>{" "}
              · up to 5 MB
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".srt"
              className="sr-only"
              aria-label="Upload SRT file"
              onChange={(e) => {
                void loadFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
          <label className="input-label" htmlFor="srt-input">
            OR PASTE SRT TEXT{" "}
            <span className="mono">{raw.length.toLocaleString()} CHARS</span>
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
            placeholder={
              "1\n00:00:01,000 --> 00:00:04,500\nEvery word deserves a little room."
            }
          />
          <div className="panel-heading standard-heading">
            <span className="eyebrow">02 / YOUR TARGET STANDARD</span>
          </div>
          <label className="sr-only" htmlFor="standard">
            Target standard
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
                  {value.name}
                </option>
              ))}
            </select>
            <ChevronDown size={16} />
          </div>
          <div className="standard-values">
            <label>
              MAX CPS
              {preset === "custom" ? (
                <input
                  aria-label="Custom maximum CPS"
                  type="number"
                  min="1"
                  max="100"
                  value={customCps}
                  onChange={customChange(setCustomCps, 100)}
                />
              ) : (
                <strong>
                  {standard.cps}
                  <small>chars/sec</small>
                </strong>
              )}
            </label>
            <label>
              MAX LINE LENGTH
              {preset === "custom" ? (
                <input
                  aria-label="Custom maximum line length"
                  type="number"
                  min="1"
                  max="200"
                  value={customCpl}
                  onChange={customChange(setCustomCpl, 200)}
                />
              ) : (
                <strong>
                  {standard.cpl}
                  <small>chars/line</small>
                </strong>
              )}
            </label>
          </div>
          <p className="standard-note">
            Conservative workflow presets, not delivery certification. Netflix
            English permits 20 CPS for adults, 17 for children; BBC uses WPM
            guidance. Always check your brief.
          </p>
          <details className="counting-note">
            <summary>How are characters counted?</summary>
            <p>
              Unicode code points, including spaces and punctuation. Line breaks
              count as one space for CPS. HTML and ASS styling tags are
              excluded. A maximum of two lines is checked. Auto-wrap preserves
              words; shorten or retime any cue that still exceeds your limits.
            </p>
            <a
              className="text-link"
              href="https://partnerhelp.netflixstudios.com/hc/en-us/articles/30806198616339-English-UK-Timed-Text-Style-Guide"
              target="_blank"
              rel="noreferrer"
            >
              Netflix style reference ↗
            </a>
          </details>
          <div className="privacy-note">
            <LockKeyhole size={15} />
            <span>
              Your subtitles never leave this browser.
              <small>{storageStatus}</small>
            </span>
          </div>
        </aside>
        <section
          className="results-panel"
          aria-label="Subtitle inspection results"
        >
          <div className="results-heading">
            <div>
              <span className="eyebrow">03 / INSPECT & REBALANCE</span>
              <h2>A little breathing room.</h2>
            </div>
            <span className="badge">{filename}</span>
          </div>
          <div className="stats-grid">
            <div>
              <span className="mono">TOTAL CUES</span>
              <strong>{parsed.cues.length.toString().padStart(2, "0")}</strong>
            </div>
            <div className={violations.length ? "warning-stat" : ""}>
              <span className="mono">NEED ATTENTION</span>
              <strong>
                {violations.length.toString().padStart(2, "0")}
                <small>cues</small>
              </strong>
            </div>
            <div>
              <span className="mono">AVERAGE CPS</span>
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
                All Cues
              </button>
              <button
                aria-pressed={onlyViolations}
                className={onlyViolations ? "active" : ""}
                onClick={() => setOnlyViolations(true)}
              >
                Violations Only <span>{violations.length}</span>
              </button>
            </div>
            <button
              className="text-link"
              disabled={!parsed.cues.length || !!parsed.errors.length}
              onClick={wrapAll}
            >
              <WandSparkles size={15} />
              Auto-wrap all
            </button>
          </div>
          <div role="status" className={`notice ${notice ? "has-notice" : ""}`}>
            {notice}
          </div>
          {parsed.errors.length > 0 && (
            <div className="parse-errors" role="alert">
              <strong>
                <AlertTriangle size={16} />
                Input needs a small fix
              </strong>
              {parsed.errors.map((error) => (
                <p key={error}>{error}</p>
              ))}
              <p>
                All original input is preserved. Fix these blocks before editing
                or exporting.
              </p>
            </div>
          )}
          {!raw.trim() ? (
            <div className="editor-empty">
              <div className="empty-icon">
                <FileText size={30} strokeWidth={1.2} />
              </div>
              <h3>Good subtitles start with a quick check.</h3>
              <p>
                Drop or paste your SRT, or take the sample for a spin.
                <br />
                Red zones appear here, ready for an inline fix.
              </p>
              <button className="button primary" onClick={sample}>
                Load Sample Data <ArrowRightIcon />
              </button>
            </div>
          ) : visible.length === 0 && parsed.cues.length > 0 ? (
            <div className="editor-empty">
              <Check size={32} />
              <h3>Everything is within your limits.</h3>
              <p>No violations under this preset. Export when you’re ready.</p>
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
                      CUE {String(index + 1).padStart(3, "0")}
                    </span>
                    <div>
                      {stats.issues.length ? (
                        <span className="cue-warning">
                          <AlertTriangle size={12} />
                          {stats.issues.join(" · ")}
                        </span>
                      ) : (
                        <span className="green-text">
                          <Check size={13} /> Within limits
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
                      title="Balance into at most two lines"
                    >
                      <WandSparkles size={13} />
                      Auto-wrap
                    </button>
                  </div>
                  <div className="cue-edit-grid">
                    <div className="cue-text-block">
                      <textarea
                        aria-label={`Cue ${index + 1} text`}
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
                          <span>IN</span>
                          <input
                            aria-label={`Cue ${index + 1} start timestamp`}
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
                          <span>OUT</span>
                          <input
                            aria-label={`Cue ${index + 1} end timestamp`}
                            value={cue.end}
                            disabled={!!parsed.errors.length}
                            onChange={(e) =>
                              updateCue(index, { end: e.target.value })
                            }
                            spellCheck={false}
                          />
                        </label>
                        <span>{stats.duration.toFixed(2)}s</span>
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
                        aria-label={`Cue ${index + 1} reading speed`}
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
                        {stats.maxLine}/{standard.cpl} CPL · {stats.lines}/2
                        lines
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
              LOCAL IN. LOCAL OUT.
            </span>
            <div>
              <button
                className="button"
                disabled={!canExport}
                onClick={() => void copy()}
              >
                <Copy size={14} />
                Copy SRT
              </button>
              <button
                className="button primary"
                disabled={!canExport}
                onClick={download}
              >
                <Download size={15} />
                Download SRT
              </button>
            </div>
          </div>
          <p className="export-note">
            Wrapping balances lines; it does not reduce CPS. Shorten text or
            edit timing for speed warnings. Exports retain unresolved warnings;
            invalid timing or malformed blocks must be fixed first.
          </p>
        </section>
      </div>
    </ToolShell>
  );
}
function ArrowRightIcon() {
  return <span aria-hidden="true">→</span>;
}
