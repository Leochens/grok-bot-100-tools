"use client";
import { useMemo, useRef, useState } from "react";
import styles from "./IcsWorkbench.module.css";
import { tools } from "@/data/tools";
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
import {
  ICS_DEFAULT,
  ICS_PRESETS,
  ICS_SAMPLE,
  icsOffsetLabel,
  icsSummary,
  inspectIcs,
  type IcsIssue,
  type IcsStamp,
} from "@/lib/engines/ics";
const initial = { ...ICS_DEFAULT, originalBase64: "" };
export function IcsWorkbench() {
  const { t, language } = useLanguage();
  const {
    state: s,
    set,
    reset,
    ready,
    stored,
  } = useLocalDraft("one-hundred:ics:v1", initial);
  const report = useMemo(() => inspectIcs(s), [s]);
  const [fileError, setFileError] = useState(false);
  const importVersion = useRef(0);
  const presetIndex = ICS_PRESETS.findIndex(
    (p) => p.label === s.displayLabel && p.offset === s.displayOffsetMinutes,
  );
  async function importFile(file: File) {
    const version = ++importVersion.current;
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error("size");
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (let i = 0; i < bytes.length; i += 8192)
        binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      const rawIcs = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (version === importVersion.current) {
        set({ rawIcs, originalBase64: btoa(binary) });
        setFileError(false);
      }
    } catch {
      if (version === importVersion.current) setFileError(true);
    }
  }
  const warnings = (items: IcsIssue[]) =>
    items.length > 0 && (
      <ul className={`wb-issues ${styles.issues}`}>
        {items.map((w, i) => (
          <li key={i}>
            <span className={w.error ? styles.error : styles.warning}>
              {t(w.en, w.zh)}
            </span>
          </li>
        ))}
      </ul>
    );
  const timestamp = (label: string, value: IcsStamp | null) => (
    <div style={{ overflowWrap: "anywhere" }}>
      <h4>{label}</h4>
      <p>
        {t("Raw", "原始值")}: <code>{value?.raw || "—"}</code>
      </p>
      <p>
        TZID: {value?.tzid || "—"} ·{" "}
        {value
          ? value.kind === "utc"
            ? "UTC"
            : value.kind === "zoned"
              ? t("Zoned", "带时区")
              : value.kind === "date"
                ? t("All-day date", "全天日期")
                : t("Floating", "浮动时间")
          : "—"}
      </p>
      <p>
        {t("Raw wall time", "原始墙上时间")}: {value?.local || "—"}
      </p>
      <p>
        UTC: <strong>{value?.utc || t("Undetermined", "无法确定")}</strong>
      </p>
      <p>
        {t("Display time", "显示时间")}:{" "}
        <strong>{value?.preview || "—"}</strong>
      </p>
      <p>
        {t("Offset used", "所用偏移")}:{" "}
        {value ? t(value.offsetUsed, value.offsetUsedZh) : "—"}
      </p>
      {warnings(value?.warnings ?? [])}
    </div>
  );
  return (
    <ToolShell
      tool={tools.find((x) => x.day === 19)!}
      onSample={() => {
        importVersion.current++;
        set({ ...initial, rawIcs: ICS_SAMPLE });
        setFileError(false);
      }}
      onReset={() => {
        importVersion.current++;
        reset();
        setFileError(false);
      }}
    >
      <div className="wb-layout">
        <section className="wb-panel">
          <h2>{t("1. Inspect an invite", "1. 检查邀请")}</h2>
          <p>
            {t(
              "Paste ICS or drop an .ics / .txt file here (UTF-8, up to 2 MB). Processing stays in this browser.",
              "粘贴 ICS，或将 .ics / .txt 文件拖到这里（UTF-8，最大 2 MB）。所有处理都在浏览器内完成。",
            )}
          </p>
          <div
            className={`ics-drop ${styles.drop}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) void importFile(file);
            }}
            onChangeCapture={(e) => {
              const input = e.target;
              if (input instanceof HTMLInputElement && input.type === "file") {
                e.stopPropagation();
                const file = input.files?.[0];
                if (file) void importFile(file);
                input.value = "";
              }
            }}
          >
            <TextImport
              value={s.rawIcs}
              onChange={(rawIcs) => {
                importVersion.current++;
                set({ rawIcs, originalBase64: "" });
                setFileError(false);
              }}
              label={t("ICS invite text", "ICS 邀请原文")}
              accept=".ics,.txt"
              maxBytes={2 * 1024 * 1024}
            />
          </div>
          {fileError && (
            <p role="alert">
              {t(
                "Cannot read this file. Use UTF-8 ICS / text up to 2 MB. Previous input is preserved.",
                "无法读取文件。请使用不超过 2 MB 的 UTF-8 ICS / 文本。原有输入已保留。",
              )}
            </p>
          )}
          <h2>{t("2. Choose the display offset", "2. 选择显示偏移")}</h2>
          <Field label={t("Display-zone preset", "显示时区预设")}>
            <select
              value={presetIndex < 0 ? "custom" : String(presetIndex)}
              onChange={(e) => {
                const p = ICS_PRESETS[Number(e.target.value)];
                if (p)
                  set({
                    displayLabel: p.label,
                    displayOffsetMinutes: p.offset,
                  });
                else set({ displayLabel: "" });
              }}
            >
              {ICS_PRESETS.map((p, i) => (
                <option key={p.label} value={i}>
                  {p.label}
                </option>
              ))}
              <option value="custom">
                {t("Custom fixed offset", "自定义固定偏移")}
              </option>
            </select>
          </Field>
          <Field label={t("Display-zone label", "显示时区名称")}>
            <input
              value={s.displayLabel}
              onChange={(e) => set({ displayLabel: e.target.value })}
            />
          </Field>
          <NumberField
            label={t(
              "Display offset (minutes east of UTC)",
              "显示偏移（UTC 以东的分钟数）",
            )}
            value={s.displayOffsetMinutes}
            min={-840}
            max={840}
            step={1}
            onChange={(n) =>
              set({ displayOffsetMinutes: Number.isNaN(n) ? 0 : n })
            }
          />
          <p>
            {t(
              "All presets use fixed offsets, including EST and PST. Labels do not apply Olson/IANA DST history. The input’s VTIMEZONE determines the source offset; no timezone database is downloaded.",
              "所有预设均为固定偏移，包括 EST 和 PST。名称不会启用 Olson/IANA 历史夏令时规则。源时间的偏移由输入中的 VTIMEZONE 决定，不下载时区数据库。",
            )}
          </p>
          <h2>
            {t("3. Optional custom-TZID relabel", "3. 可选：重命名自定义 TZID")}
          </h2>
          <Field label={t("Replacement TZID", "替换后的 TZID")}>
            <input
              value={s.replacementTzid}
              onChange={(e) => set({ replacementTzid: e.target.value })}
            />
          </Field>
          <p>
            {t(
              "Use an IANA-style name such as Asia/Kolkata. Relabeling keeps the embedded offsets and rules; it does not install or verify the named zone’s rules. Choose a name that matches the organizer’s intended zone. Rewrite is blocked on parse errors, unknown offsets, unsupported custom references, or a conflicting existing TZID.",
              "请使用 Asia/Kolkata 这样的 IANA 风格名称。重命名会保留文件内的偏移和规则，不会导入或核实该名称的时区规则。请按组织者的真实意图选择名称。解析出错、偏移未知、自定义引用不受支持或名称与已有 TZID 冲突时，均暂停改写。",
            )}
          </p>
          <LocalStatus stored={stored} />
        </section>
        <section className="wb-panel">
          <h2>{t("4. Preview & export", "4. 预览并导出")}</h2>
          <div className="wb-stats">
            <span>
              {t("Events", "事件")}: {report.events.length}
            </span>
            <span>
              {s.displayLabel || t("Custom display", "自定义显示区")} ·{" "}
              {icsOffsetLabel(report.displayOffsetMinutes)}
            </span>
          </div>
          {s.rawIcs && warnings(report.warnings)}
          {report.hasErrors && s.rawIcs && (
            <p role="alert" className="wb-error">
              {t(
                "Recovered preview contains errors. Review diagnostics; rewritten ICS is blocked. Original input remains available.",
                "恢复的预览含有错误，请查看诊断。已暂停 ICS 改写，仍可下载原始输入。",
              )}
            </p>
          )}
          <h3>VTIMEZONE</h3>
          <p>
            {t(
              "RRULE text is shown for review. With both STANDARD and DAYLIGHT, selection compares BYMONTH, or falls back to northern Mar–Oct. It does not resolve transition days or historical eras. Multiple eras remain unresolved.",
              "RRULE 原文供核对。同时有 STANDARD 和 DAYLIGHT 时，按 BYMONTH 比较月份；缺少月份时按北半球 3–10 月经验规则选择。不计算具体切换日或历史阶段；多个历史阶段将保持未解析。",
            )}
          </p>
          <div className="wb-table-scroll">
            <table className="wb-table">
              <thead>
                <tr>
                  {[
                    "TZID",
                    t("Period", "时段"),
                    "TZOFFSETFROM → TZOFFSETTO",
                    "DTSTART / RRULE",
                  ].map((x) => (
                    <th key={x}>{x}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.timezones.flatMap((z, zi) =>
                  z.observances.map((o, oi) => (
                    <tr key={`${zi}-${oi}`}>
                      <td>{z.tzid || "—"}</td>
                      <td>{o.kind}</td>
                      <td>
                        {o.from === null ? "?" : icsOffsetLabel(o.from)} →{" "}
                        {o.to === null ? "?" : icsOffsetLabel(o.to)}
                      </td>
                      <td style={{ overflowWrap: "anywhere" }}>
                        {o.start}
                        <br />
                        {o.rrule || "—"}
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
          {report.timezones.map((z, i) => (
            <div key={i}>{warnings(z.warnings)}</div>
          ))}
          {report.events.map((e, i) => (
            <article className="wb-panel ics-event" key={i}>
              <h3>{e.summary || t("Untitled event", "无标题事件")}</h3>
              <p style={{ overflowWrap: "anywhere" }}>
                UID: {e.uid || "—"} · {t("Location", "地点")}:{" "}
                {e.location || "—"}
              </p>
              {timestamp("DTSTART", e.start)}
              {timestamp("DTEND", e.end)}
              {e.duration && <p>DURATION: {e.duration}</p>}
              {warnings(e.warnings)}
            </article>
          ))}
          <ExportBar
            name="ics-audit.json"
            content={JSON.stringify(report, null, 2)}
            disabled={!ready || !s.rawIcs}
            mime="application/json"
          />
          <ExportBar
            name="ics-summary.txt"
            content={icsSummary(report, language)}
            disabled={!ready || !s.rawIcs}
          />
          <ExportBar
            name="invite-rewritten.ics"
            content={report.rewritten ?? ""}
            disabled={!ready || report.rewritten === null}
            mime="text/calendar;charset=utf-8"
          />
          {s.originalBase64 ? (
            <button
              className="button"
              disabled={!ready}
              onClick={() => {
                try {
                  const bytes = Uint8Array.from(atob(s.originalBase64), (c) =>
                    c.charCodeAt(0),
                  );
                  const url = URL.createObjectURL(
                    new Blob([bytes], { type: "text/calendar" }),
                  );
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "invite-original.ics";
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                } catch {
                  setFileError(true);
                }
              }}
            >
              {t("Download", "下载")} invite-original.ics
            </button>
          ) : (
            <ExportBar
              name="invite-original.ics"
              content={s.rawIcs}
              disabled={!ready || !s.rawIcs}
              mime="text/calendar;charset=utf-8"
            />
          )}
          <p>
            {t(
              "Original file downloads preserve uploaded bytes. Editing the text creates a new UTF-8 original. Diagnostic JSON also retains the parsed input. No invite is sent or calendar updated.",
              "下载原文件时保留上传的字节；编辑文本后，原始下载会改为当前文本的 UTF-8 文件。诊断 JSON 也保留解析输入。工具不会发送邀请或修改日历。",
            )}
          </p>
        </section>
      </div>
    </ToolShell>
  );
}
