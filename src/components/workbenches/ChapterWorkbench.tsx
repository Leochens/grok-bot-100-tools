"use client";
import { useState } from "react";
import { tools } from "@/data/tools";
import {
  CHAPTER_SAMPLE,
  exportChapters,
  formatTime,
  parseChapters,
  shiftChapters,
  validateChapters,
  type Chapter,
} from "@/lib/engines/chapters";
import { ToolShell } from "../ToolShell";
import { useLanguage } from "../LanguageProvider";
import {
  ExportBar,
  Field,
  LocalStatus,
  NumberField,
  TextImport,
  useLocalDraft,
} from "./shared";
const initial = {
  raw: "",
  chapters: [] as Chapter[],
  duration: 360,
  from: 2,
  delta: 0,
  breathing: 1.5,
  keepZero: true,
  format: "youtube" as "youtube" | "json" | "ffmetadata",
};
export function ChapterWorkbench() {
  const { t } = useLanguage();
  const {
    state: s,
    set,
    reset,
    stored,
    ready,
  } = useLocalDraft("one-hundred:chapters:v1", initial, {
    chapters: { start: 0, title: "" },
  });
  const [actionError, setError] = useState("");
  let invalidImport = false;
  try {
    parseChapters(s.raw);
  } catch {
    invalidImport = true;
  }
  const error = invalidImport ? "parse" : actionError;
  const [undo, setUndo] = useState<Chapter[] | null>(null);
  const issues = validateChapters(s.chapters, s.duration);
  const messages = {
    first: t(
      "The first chapter must start at 00:00.",
      "第一章必须从 00:00 开始。",
    ),
    count: t(
      "YouTube needs at least 3 chapters.",
      "YouTube 至少需要 3 个章节。",
    ),
    order: t(
      "Times must be nonnegative and strictly ascending.",
      "时间不能为负，且必须按先后顺序排列。",
    ),
    short: t(
      "Each chapter must last at least 10 seconds.",
      "每章至少要有 10 秒。",
    ),
    duration: t(
      "A chapter starts outside the media duration.",
      "章节起点超出了音视频总时长。",
    ),
    title: t("Enter a nonempty, single-line title.", "请填写非空的单行标题。"),
    end: t("Invalid chapter end time.", "章节结束时间无效。"),
    unknownEnd: t(
      "Enter media duration to validate the last chapter.",
      "请填写总时长，才能检查最后一章。",
    ),
  };
  const structural = issues.some((i) =>
    ["order", "title", "duration", "end"].includes(i.code),
  );
  const youtubeIssues = validateChapters(
    s.chapters.map((c) => ({ ...c, start: Math.floor(c.start) })),
    s.duration,
  );
  const blocked =
    !s.chapters.length ||
    !!error ||
    structural ||
    (s.format === "youtube" && youtubeIssues.length > 0) ||
    (s.format === "ffmetadata" && s.duration <= 0);
  let output = "";
  try {
    if (!blocked) output = exportChapters(s.chapters, s.duration, s.format);
  } catch {
    /* Missing end remains blocked. */
  }
  function load(raw: string) {
    try {
      const chapters = parseChapters(raw);
      set({ raw, chapters });
      setError("");
      setUndo(null);
    } catch {
      set({ raw });
      setError("parse");
    }
  }
  return (
    <ToolShell
      tool={tools.find((x) => x.day === 2)!}
      onSample={() => load(CHAPTER_SAMPLE)}
      onReset={() => {
        reset();
        setError("");
        setUndo(null);
      }}
    >
      <div className="wb-layout">
        <section className="wb-panel">
          <h2>{t("Import chapter markers", "导入章节时间轴")}</h2>
          <TextImport
            value={s.raw}
            onChange={load}
            label={t(
              "YouTube timestamps, FFmetadata or Podlove JSON",
              "粘贴 YouTube 时间列表、FFmetadata 或 Podlove JSON",
            )}
            accept=".txt,.json,.ffmeta,.ffmetadata"
            disabled={!ready}
          />
          <NumberField
            label={t("Total media duration (seconds)", "音视频总时长（秒）")}
            value={s.duration}
            min={0}
            onChange={(duration) => set({ duration })}
          />
          {error && (
            <p className="wb-error" role="alert">
              {error === "parse"
                ? t(
                    "Cannot parse the input. Check every timestamp, title and JSON/FFmetadata field. The previous editable list is retained; exports are paused.",
                    "没能读懂输入内容，请检查时间、标题和格式。上次的可编辑列表仍在，修好输入后再导出。",
                  )
                : t(
                    "Shift is invalid or would create a negative timestamp. No chapters were changed.",
                    "偏移参数无效，或会产生负时间。本次没有修改章节。",
                  )}
            </p>
          )}
        </section>
        <section className="wb-panel">
          <h2>
            {t("Fix sentence overlap & intro drift", "调整抢话和片头偏移")}
          </h2>
          <div className="wb-fields">
            <NumberField
              label={t("Ripple from chapter N", "从第几章开始整体偏移")}
              min={1}
              value={s.from}
              step={1}
              onChange={(from) => set({ from })}
            />
            <NumberField
              label={t("Ripple shift (seconds, ±)", "整体偏移（秒，可正可负）")}
              value={s.delta}
              onChange={(delta) => set({ delta })}
            />
            <NumberField
              label={t(
                "Breathing room (seconds, + delays)",
                "句尾留白（秒，正数向后移）",
              )}
              value={s.breathing}
              onChange={(breathing) => set({ breathing })}
            />
          </div>
          <label className="wb-check">
            <input
              type="checkbox"
              checked={s.keepZero}
              onChange={(e) => set({ keepZero: e.target.checked })}
            />
            {t(
              "Keep first marker at 00:00 when adding breathing room",
              "增加句尾留白时，首章仍从 00:00 开始",
            )}
          </label>
          <div className="wb-toolbar">
            <button
              className="button primary"
              disabled={!s.chapters.length || error === "parse"}
              onClick={() => {
                try {
                  const chapters = shiftChapters(
                    s.chapters,
                    s.from,
                    s.delta,
                    s.breathing,
                    s.keepZero,
                  );
                  setUndo(s.chapters);
                  set({ chapters });
                  setError("");
                } catch {
                  setError("shift");
                }
              }}
            >
              {t("Apply shift once", "应用一次偏移")}
            </button>
            <button
              className="button"
              disabled={!undo}
              onClick={() => {
                if (undo) {
                  set({ chapters: undo });
                  setUndo(null);
                  setError("");
                }
              }}
            >
              {t("Undo shift", "撤销偏移")}
            </button>
          </div>
          <p className="muted">
            {t(
              "Positive padding delays the marker past the previous sentence. YouTube exports use whole seconds; JSON and FFmetadata retain milliseconds.",
              "正数留白会把章节点向后挪，避开上一句。YouTube 导出取整秒，JSON 和 FFmetadata 保留毫秒。",
            )}
          </p>
        </section>
      </div>
      <section className="wb-panel">
        <h2>{t("Editable chapter timeline", "逐章编辑")}</h2>
        <div className="wb-table-scroll">
          <table className="wb-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{t("Start", "起点")}</th>
                <th>{t("Title", "标题")}</th>
                <th>{t("Duration", "时长")}</th>
                <th>{t("Remove", "删除")}</th>
              </tr>
            </thead>
            <tbody>
              {s.chapters.map((c, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>
                    <input
                      aria-label={t(
                        `Chapter ${i + 1} start seconds`,
                        `第 ${i + 1} 章起点（秒）`,
                      )}
                      type="number"
                      step="0.001"
                      value={Number.isFinite(c.start) ? c.start : ""}
                      onChange={(e) =>
                        set({
                          chapters: s.chapters.map((v, j) =>
                            j === i
                              ? {
                                  ...v,
                                  start:
                                    e.target.value === ""
                                      ? NaN
                                      : +e.target.value,
                                }
                              : v,
                          ),
                        })
                      }
                    />
                    <small>
                      {Number.isFinite(c.start) && c.start >= 0
                        ? formatTime(c.start)
                        : "—"}
                    </small>
                  </td>
                  <td>
                    <input
                      aria-label={t(
                        `Chapter ${i + 1} title`,
                        `第 ${i + 1} 章标题`,
                      )}
                      value={c.title}
                      onChange={(e) =>
                        set({
                          chapters: s.chapters.map((v, j) =>
                            j === i ? { ...v, title: e.target.value } : v,
                          ),
                        })
                      }
                    />
                  </td>
                  <td>
                    {(
                      (s.chapters[i + 1]?.start ?? s.duration) - c.start
                    ).toFixed(3)}{" "}
                    s
                  </td>
                  <td>
                    <button
                      className="button"
                      aria-label={t(
                        `Remove chapter ${i + 1}`,
                        `删除第 ${i + 1} 章`,
                      )}
                      onClick={() =>
                        set({ chapters: s.chapters.filter((_, j) => j !== i) })
                      }
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          className="button"
          onClick={() =>
            set({
              chapters: [
                ...s.chapters,
                {
                  start: s.chapters.length
                    ? s.chapters[s.chapters.length - 1].start + 30
                    : 0,
                  title: "",
                },
              ],
            })
          }
        >
          {t("Add chapter", "新增章节")}
        </button>
        <ul className="wb-issues">
          {issues.map((issue, i) => (
            <li key={i}>
              {issue.index !== undefined ? `#${issue.index + 1} · ` : ""}
              {messages[issue.code]}
            </li>
          ))}
        </ul>
        {s.chapters.length > 0 && !issues.length && (
          <p className="green-text">
            {t(
              "YouTube chapter rules pass, including the final chapter.",
              "YouTube 章节规则全部通过，最后一章也已检查。",
            )}
          </p>
        )}
        <Field label={t("Export format", "导出格式")}>
          <select
            value={s.format}
            onChange={(e) => set({ format: e.target.value as typeof s.format })}
          >
            <option value="youtube">YouTube Description</option>
            <option value="json">Podlove Simple Chapters JSON</option>
            <option value="ffmetadata">FFmpeg ;FFMETADATA1</option>
          </select>
        </Field>
        {s.format === "youtube" && (
          <p className="muted">
            {t(
              "Whole-second validation also runs before export. All YouTube rules must pass.",
              "导出前会再按整秒检查一次，通过全部 YouTube 规则才能导出。",
            )}
          </p>
        )}
        <ExportBar
          name={`chapters.${s.format === "json" ? "json" : s.format === "ffmetadata" ? "ffmetadata" : "txt"}`}
          content={output}
          disabled={blocked || !output}
        />
        <pre className="wb-output">{output}</pre>
      </section>
      <LocalStatus stored={stored} />
    </ToolShell>
  );
}
