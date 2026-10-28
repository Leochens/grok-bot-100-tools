"use client";
import { useMemo, useRef, useState } from "react";
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
  TIMESHEET_DEFAULT,
  TIMESHEET_SAMPLE,
  buildTimesheet,
  canExportTimesheet,
  exportTimesheet,
  timesheetHours,
  timesheetMoney,
  type DurationFormat,
  type TimesheetInput,
} from "@/lib/engines/timesheet";

const initial = { ...TIMESHEET_DEFAULT, step: 1 };
export function TimesheetWorkbench() {
  const { t, language } = useLanguage();
  const {
    state: s,
    set,
    ready,
    stored,
    reset,
  } = useLocalDraft("one-hundred:timesheet-invoice:v1", initial);
  const [dropError, setDropError] = useState(false);
  const version = useRef(0);
  const report = useMemo(() => buildTimesheet(s), [s]);
  const clean = ready && canExportTimesheet(report);
  const formatOptions = (
    <>
      <option value="auto">
        {t(
          "Auto (numeric 0–1 = days)",
          "自动（大于 0 且不超过 1 的数值按天数）",
        )}
      </option>
      <option value="hms">{t("HH:MM / HH:MM:SS", "时:分 / 时:分:秒")}</option>
      <option value="decimal">{t("Decimal hours", "小数小时")}</option>
      <option value="day-fraction">
        {t("Spreadsheet day fraction", "表格天数小数")}
      </option>
    </>
  );
  function replaceRaw(raw: string) {
    version.current++;
    setDropError(false);
    const parsed = buildTimesheet({ ...s, raw });
    const patch: Partial<typeof s> = { raw, rowFormats: [] };
    if (parsed.hasHeader) {
      const find = (...names: string[]) =>
        parsed.headers.findIndex((h) =>
          names.includes(h.trim().toLowerCase().replace(/[_-]+/g, " ")),
        );
      Object.assign(patch, {
        dateColumn: find("date", "start date", "日期"),
        clientColumn: find("client", "客户"),
        projectColumn: find("project", "项目"),
        descriptionColumn: find("description", "task", "描述"),
        durationColumn: find(
          "duration",
          "duration (h)",
          "duration (decimal)",
          "time",
          "hours",
          "时长",
        ),
        startColumn: find("start", "start time", "开始"),
        endColumn: find("end", "end time", "结束"),
        billableColumn: find("billable", "billable?", "计费"),
        rateColumn: find("rate", "hourly rate", "单价"),
      });
    }
    set(patch);
  }
  async function dropFile(file: File) {
    const id = ++version.current;
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error("size");
      const raw = await file.text();
      if (id === version.current) replaceRaw(raw);
    } catch {
      if (id === version.current) setDropError(true);
    }
  }
  const column = (
    key:
      | "dateColumn"
      | "clientColumn"
      | "projectColumn"
      | "descriptionColumn"
      | "durationColumn"
      | "startColumn"
      | "endColumn"
      | "billableColumn"
      | "rateColumn",
    label: string,
  ) => (
    <Field key={key} label={label}>
      <select
        value={s[key]}
        onChange={(e) => set({ [key]: Number(e.target.value) })}
      >
        <option value={-1}>{t("None", "不选")}</option>
        {(s[key] >= report.headers.length || s[key] < -1) && (
          <option value={s[key]}>{t("Choose a column", "请选择列")}</option>
        )}
        {report.headers.map((h, i) => (
          <option key={i} value={i}>
            {i + 1}. {h}
          </option>
        ))}
      </select>
    </Field>
  );
  const steps = [
    t("1. Import & map", "1. 导入与映射"),
    t("2. Duration & rounding", "2. 时长与取整"),
    t("3. Rates & grouping", "3. 单价与分组"),
    t("4. Export", "4. 导出"),
  ];
  return (
    <ToolShell
      tool={tools.find((x) => x.day === 21)!}
      onSample={() => {
        version.current++;
        setDropError(false);
        set({ ...initial, raw: TIMESHEET_SAMPLE });
      }}
      onReset={() => {
        version.current++;
        setDropError(false);
        reset();
      }}
    >
      <nav className="wb-steps" aria-label={t("Invoice steps", "开票步骤")}>
        {steps.map((label, i) => (
          <button
            key={i}
            className={`button ${s.step === i + 1 ? "primary" : ""}`}
            aria-current={s.step === i + 1 ? "step" : undefined}
            onClick={() => set({ step: i + 1 })}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="wb-stats" aria-live="polite">
        <span>
          {t("Entries", "工时条数")}: {report.rows.length}
        </span>
        <span>
          {t("Invoice lines", "开票明细行数")}: {report.lines.length}
        </span>
        <span>
          {t("Billable hours", "计费小时")}:{" "}
          {timesheetHours(report.totalSeconds)}
        </span>
        <span>
          {t("Total amount", "总金额")}: {timesheetMoney(report.totalCents)}
        </span>
      </div>
      {report.hasErrors && s.raw && (
        <p role="alert" className="wb-error">
          {t(
            "Totals are provisional. Correct errors before exporting invoice lines; audit JSON remains available in step 4.",
            "合计为暂算值。请先修正错误再导出发票明细；第 4 步仍可下载审计 JSON。",
          )}
        </p>
      )}
      {s.step === 1 && (
        <section className="wb-panel">
          <h2>{t("Import & map your timesheet", "导入工时并映射列")}</h2>
          <p>
            {t(
              "Paste or drop CSV/TSV, up to 2 MB / 10,000 entries / 100 columns. Header detection recognizes common field names; check every mapping. Optional columns may be None. Dates use YYYY-MM-DD. Files stay on this device.",
              "粘贴或拖入 CSV/TSV，最多 2 MB、10,000 条工时、100 列。自动表头识别支持常见字段名，请逐一确认映射；可选列可选“不选”。日期用 YYYY-MM-DD。文件只在本机处理。",
            )}
          </p>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) void dropFile(file);
            }}
          >
            <TextImport
              value={s.raw}
              onChange={replaceRaw}
              label={t(
                "Timesheet CSV / TSV / file drop area",
                "工时 CSV / TSV / 文件拖放区",
              )}
              accept=".csv,.tsv,.txt"
              maxBytes={2 * 1024 * 1024}
            />
          </div>
          {dropError && (
            <p role="alert">
              {t(
                "Cannot read the file; limit 2 MB.",
                "无法读取文件，大小上限为 2 MB。",
              )}
            </p>
          )}
          <div className="wb-fields">
            <Field label={t("Delimiter", "分隔符")}>
              <select
                value={s.delimiter}
                onChange={(e) =>
                  set({
                    delimiter: e.target.value as TimesheetInput["delimiter"],
                  })
                }
              >
                <option value="auto">{t("Auto", "自动")}</option>
                <option value="csv">{t("Comma (CSV)", "逗号（CSV）")}</option>
                <option value="tsv">{t("Tab (TSV)", "制表符（TSV）")}</option>
              </select>
            </Field>
            <Field label={t("Header row", "表头行")}>
              <select
                value={s.header}
                onChange={(e) =>
                  set({
                    header: e.target.value as TimesheetInput["header"],
                    rowFormats: [],
                  })
                }
              >
                <option value="auto">
                  {t("Detect automatically", "自动识别")}
                </option>
                <option value="yes">
                  {t("First row is a header", "首行为表头")}
                </option>
                <option value="no">{t("No header", "没有表头")}</option>
              </select>
            </Field>
            {column("dateColumn", t("Date column", "日期列"))}
            {column("clientColumn", t("Client column", "客户列"))}
            {column("projectColumn", t("Project column", "项目列"))}
            {column("descriptionColumn", t("Description column", "描述列"))}
            {column("durationColumn", t("Duration column", "时长列"))}
            {column("startColumn", t("Start time column", "开始时间列"))}
            {column("endColumn", t("End time column", "结束时间列"))}
            {column("billableColumn", t("Billable flag column", "计费标记列"))}
            {column("rateColumn", t("Rate override column", "本行单价列"))}
          </div>
          <p>
            {t(
              "Duration takes precedence. To use start/end wall times, set Duration to None. An earlier end wraps once past midnight with a warning; equal times need an explicit duration. Without a billable column all entries are billable.",
              "优先读取时长列。要用开始/结束时间，请把时长列设为“不选”。结束早于开始时按跨午夜一次计算并提示；开始结束相同则须填写明确时长。未映射计费列时，默认所有行可计费。",
            )}
          </p>
        </section>
      )}
      {s.step === 2 && (
        <section className="wb-panel">
          <h2>
            {t("Normalize durations before billing", "先规整时长，再计费")}
          </h2>
          <div className="wb-fields">
            <Field label={t("Default duration format", "默认时长格式")}>
              <select
                value={s.durationFormat}
                onChange={(e) =>
                  set({ durationFormat: e.target.value as DurationFormat })
                }
              >
                {formatOptions}
              </select>
            </Field>
            <Field label={t("Rounding mode", "取整方式")}>
              <select
                value={s.rounding}
                onChange={(e) =>
                  set({
                    rounding: e.target.value as TimesheetInput["rounding"],
                  })
                }
              >
                <option value="none">{t("None", "不取整")}</option>
                <option value="round">
                  {t("Round to nearest (half up)", "四舍五入")}
                </option>
                <option value="floor">{t("Floor", "向下取整")}</option>
                <option value="ceil">{t("Ceil", "向上取整")}</option>
              </select>
            </Field>
            <Field label={t("Billing increment", "计费粒度")}>
              <select
                value={s.increment}
                onChange={(e) => set({ increment: Number(e.target.value) })}
              >
                <option value={60}>{t("1 minute", "1 分钟")}</option>
                <option value={360}>
                  {t("6 minutes (0.1h)", "6 分钟（0.1 小时）")}
                </option>
                <option value={900}>{t("15 minutes", "15 分钟")}</option>
                <option value={36}>
                  {t("2 decimal hours (36 seconds)", "两位小数小时（36 秒）")}
                </option>
              </select>
            </Field>
            <Field label={t("Skip non-billable entries", "跳过不计费工时")}>
              <input
                type="checkbox"
                checked={s.skipNonBillable}
                onChange={(e) => set({ skipNonBillable: e.target.checked })}
              />
            </Field>
            <Field label={t("From date (optional)", "起始日期（可选）")}>
              <input
                type="date"
                value={s.dateFrom}
                onChange={(e) => set({ dateFrom: e.target.value })}
              />
            </Field>
            <Field
              label={t(
                "Through date (inclusive, optional)",
                "截至日期（含当天，可选）",
              )}
            >
              <input
                type="date"
                value={s.dateTo}
                onChange={(e) => set({ dateTo: e.target.value })}
              />
            </Field>
          </div>
          <p>
            {t(
              "Every duration is normalized to the nearest whole second, then each entry is rounded to the chosen increment before money math. None preserves whole seconds. Auto treats HH:MM[:SS] as elapsed time, numeric (0,1] as spreadsheet days, and larger numbers as hours. Override individual rows below for mixed exports (e.g. 0.5 hours). Decimal commas must be quoted in CSV or pasted in TSV.",
              "先把时长转换到最接近的整数秒，再按所选粒度逐行取整，最后算钱。“不取整”保留整数秒。自动模式把 HH:MM[:SS] 作为时长，(0,1] 数值作为表格天数，较大的数值作为小时。混合格式可在下方逐行修改（例如 0.5 小时）。小数逗号在 CSV 中须加引号，或使用 TSV。",
            )}
          </p>
          <div className="wb-table-scroll">
            <table
              className="wb-table"
              aria-label={t("Duration preview", "时长预览")}
            >
              <thead>
                <tr>
                  {[
                    t("Record", "记录"),
                    t("Client", "客户"),
                    t("Raw duration / times", "原始时长 / 时间"),
                    t("Format override", "本行格式"),
                    t("Parsed hours", "解析小时"),
                    t("Billed hours", "计费小时"),
                    t("Delta (sec)", "增减秒数"),
                    t("Status", "状态"),
                  ].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.rows.slice(0, 100).map((r, i) => (
                  <tr key={r.row}>
                    <td>{r.row}</td>
                    <td>{r.client}</td>
                    <td>
                      {s.durationColumn >= 0
                        ? r.raw[s.durationColumn]
                        : `${r.raw[s.startColumn] ?? ""} → ${r.raw[s.endColumn] ?? ""}`}
                    </td>
                    <td>
                      {s.durationColumn >= 0 && (
                        <select
                          aria-label={t(
                            `Record ${r.row} format`,
                            `记录 ${r.row} 格式`,
                          )}
                          value={s.rowFormats[i] || ""}
                          onChange={(e) => {
                            const rowFormats = [...s.rowFormats];
                            while (rowFormats.length <= i) rowFormats.push("");
                            rowFormats[i] = e.target.value;
                            set({ rowFormats });
                          }}
                        >
                          <option value="">
                            {t("Use default", "沿用默认")}
                          </option>
                          {formatOptions}
                        </select>
                      )}
                    </td>
                    <td>
                      {r.parsedSeconds === null
                        ? "—"
                        : timesheetHours(r.parsedSeconds)}
                    </td>
                    <td>
                      {r.roundedSeconds === null
                        ? "—"
                        : timesheetHours(r.roundedSeconds)}
                    </td>
                    <td>{r.roundingDelta ?? "—"}</td>
                    <td>
                      {r.status === "included"
                        ? t("Included", "已计入")
                        : r.status === "skipped"
                          ? t("Skipped", "已跳过")
                          : t("Error", "有错误")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {s.step === 3 && (
        <section className="wb-panel">
          <h2>{t("Set rates & invoice grouping", "设置单价和明细分组")}</h2>
          <div className="wb-fields">
            <NumberField
              label={t("Default hourly rate", "默认时薪")}
              value={
                s.defaultRate === ""
                  ? NaN
                  : Number(s.defaultRate.replace(",", "."))
              }
              min={0}
              max={1000000}
              step="0.01"
              onChange={(n) =>
                set({ defaultRate: Number.isNaN(n) ? "" : String(n) })
              }
            />
            <Field label={t("Group invoice lines", "发票明细分组")}>
              <select
                value={s.group}
                onChange={(e) =>
                  set({ group: e.target.value as TimesheetInput["group"] })
                }
              >
                <option value="client">{t("By client", "按客户")}</option>
                <option value="project">
                  {t("By client + project", "按客户 + 项目")}
                </option>
                <option value="rows">{t("Keep each entry", "逐条保留")}</option>
              </select>
            </Field>
          </div>
          <Field
            label={t(
              "Client rate CSV (client,rate)",
              "客户单价 CSV（client,rate）",
            )}
          >
            <textarea
              spellCheck={false}
              value={s.clientRates}
              placeholder={t("client,rate\nAcme,75", "client,rate\n客户甲,75")}
              onChange={(e) => set({ clientRates: e.target.value })}
            />
          </Field>
          <p>
            {t(
              "Row override wins, then exact client name, then default rate. A zero rate is valid. Use one currency; no conversion. Each entry amount rounds half up to integer cents, then groups sum those cents. Different rates always stay on separate lines; group hours × rate can differ from summed cents.",
              "优先使用本行单价，再按客户名精确匹配单价，最后使用默认时薪。允许零单价。请统一币种，不做换算。每条工时金额先四舍五入到分，再按组相加。不同单价始终分列，分组小时数乘单价可能与逐行累加金额有分币差异。",
            )}
          </p>
        </section>
      )}
      {s.step === 4 && (
        <section className="wb-panel">
          <h2>{t("Review invoice lines & export", "核对发票明细并导出")}</h2>
          <p>
            {t(
              "Exports include all valid, selected entries. CSV uses 9 decimal places for hours (trailing zeros removed); cents remain authoritative. Audit JSON includes raw input, rows, parsed/rounded seconds, deltas, rate choices and warnings, even when invoice exports are blocked.",
              "导出包含全部有效且符合筛选的工时。CSV 小时数保留 9 位小数并去除末尾零，金额以分为准。审计 JSON 包含原文、原始行、解析与取整秒数、增减量、所用单价和提示；即使明细导出暂停，也能下载审计文件。",
            )}
          </p>
          <div className="wb-table-scroll">
            <table
              className="wb-table"
              aria-label={t("Invoice lines", "发票明细")}
            >
              <thead>
                <tr>
                  {[
                    t("Client", "客户"),
                    t("Project", "项目"),
                    t("Description", "描述"),
                    t("Hours", "小时"),
                    t("Rate", "时薪"),
                    t("Amount", "金额"),
                  ].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.lines.slice(0, 100).map((l, i) => (
                  <tr key={i}>
                    <td>{l.client}</td>
                    <td>{l.project}</td>
                    <td>{l.description}</td>
                    <td>{timesheetHours(l.seconds)}</td>
                    <td>{timesheetMoney(l.rateCents)}</td>
                    <td>{timesheetMoney(l.amountCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!report.lines.length && (
            <p>
              {t(
                "No invoice lines. Import entries and check filters and rates.",
                "没有可导出的明细，请导入工时并检查筛选与单价。",
              )}
            </p>
          )}
          <ExportBar
            name="invoice-lines.csv"
            content={clean ? exportTimesheet(report, "csv") : ""}
            disabled={!clean}
            mime="text/csv;charset=utf-8"
          />
          <ExportBar
            name="invoice-summary.md"
            content={clean ? exportTimesheet(report, "md", language) : ""}
            disabled={!clean}
            mime="text/markdown;charset=utf-8"
          />
          <ExportBar
            name="timesheet-audit.json"
            content={exportTimesheet(report, "json")}
            disabled={!ready || !s.raw}
            mime="application/json"
          />
        </section>
      )}
      {(s.step === 2 || s.step === 4) && (
        <p className="muted">
          {t(
            "Tables preview the first 100 entries/lines; exports include the full result.",
            "表格预览前 100 条工时或明细，导出包含全部结果。",
          )}
        </p>
      )}
      {s.raw && report.issues.length > 0 && (
        <section
          className="wb-panel"
          aria-label={t("Validation & warnings", "检查与提示")}
        >
          <h2>{t("Validation & warnings", "检查与提示")}</h2>
          <ul>
            {report.issues.slice(0, 80).map((i, n) => (
              <li key={n} className={i.severity === "error" ? "wb-error" : ""}>
                {i.row
                  ? `${t("Record", "记录")} ${i.row}: `
                  : `${t("Settings", "设置")}: `}
                {t(i.en, i.zh)}
              </li>
            ))}
          </ul>
          {report.issues.length > 80 && (
            <p>
              {t(
                "Showing 80 notices; all notices are in audit JSON.",
                "这里显示前 80 条提示，完整内容见审计 JSON。",
              )}
            </p>
          )}
        </section>
      )}
      <div className="wb-actions">
        {s.step > 1 && (
          <button className="button" onClick={() => set({ step: s.step - 1 })}>
            {t("Previous step", "上一步")}
          </button>
        )}
        {s.step < 4 && (
          <button
            className="button primary"
            onClick={() => set({ step: s.step + 1 })}
          >
            {t("Next step", "下一步")}
          </button>
        )}
      </div>
      <LocalStatus stored={stored} />
    </ToolShell>
  );
}
