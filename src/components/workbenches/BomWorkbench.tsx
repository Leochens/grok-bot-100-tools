"use client";
import { useState } from "react";
import { tools } from "@/data/tools";
import { BOM_SAMPLE, csvOutput, parseBom } from "@/lib/engines/bom";
import { useLanguage } from "../LanguageProvider";
import { ToolShell } from "../ToolShell";
import {
  ExportBar,
  Field,
  LocalStatus,
  TextImport,
  useLocalDraft,
} from "./shared";
const initial = {
  raw: "",
  delimiter: ",",
  done: {} as Record<string, boolean>,
  stages: {} as Record<string, number>,
  search: "",
  showDnp: false,
  format: "csv",
};
export function BomWorkbench() {
  const { t } = useLanguage();
  const {
    state: s,
    set,
    reset,
    ready,
    stored,
  } = useLocalDraft("one-hundred:bom:v1", initial);
  const [error, setError] = useState("");
  let parts: ReturnType<typeof parseBom> = [],
    parseError = "";
  try {
    parts = parseBom(s.raw, s.delimiter)
      .map((p) => ({ ...p, stage: s.stages[p.id] || p.stage }))
      .sort(
        (a, b) =>
          a.stage - b.stage ||
          a.value.localeCompare(b.value, undefined, { numeric: true }) ||
          a.references[0].localeCompare(b.references[0], undefined, {
            numeric: true,
          }),
      );
  } catch (e) {
    parseError = (e as Error).message;
  }
  const errors: Record<string, string> = {
    quote: t(
      "Invalid CSV quotes. Double quotes inside quoted fields must be doubled.",
      "CSV 引号不成对。字段内的双引号要写成两个双引号。",
    ),
    headers: t(
      "Required columns: Reference, Value, Footprint. Qty and DNP are optional.",
      "需要 Reference、Value、Footprint 三列，Qty 和 DNP 可选。",
    ),
    columns: t(
      "A row has a different number of columns from the header. Check delimiters and quotes.",
      "有一行的列数和表头不一致，请检查分隔符与引号。",
    ),
    references: t(
      "Empty, duplicate or invalid designators/ranges. Each physical part must have a unique designator.",
      "位号为空、重复或范围有误。每个实物元件都需要唯一位号。",
    ),
    quantity: t("Qty must be a positive integer.", "数量必须是正整数。"),
    dnp: t(
      "Unrecognized DNP value. Use yes/no, true/false, 1/0 or DNP.",
      "无法识别 DNP 值，请用 yes/no、true/false、1/0 或 DNP。",
    ),
  };
  const stageLabels = [
    t("Flat SMD passives", "贴片电阻、电容"),
    t("Diodes & transistors", "二极管、三极管"),
    t("ICs", "芯片"),
    t("Inductors / crystals / switches", "电感、晶振、按键"),
    t("Tall / through-hole / hardware", "高元件、通孔、五金"),
  ];
  const populated = parts.filter((p) => !p.dnp),
    total = populated.reduce((a, p) => a + p.references.length, 0),
    complete = populated.reduce(
      (a, p) => a + p.references.filter((r) => s.done[r]).length,
      0,
    );
  const visible = parts.filter(
    (p) =>
      (s.showDnp || !p.dnp) &&
      `${p.references.join(" ")} ${p.value} ${p.footprint}`
        .toLowerCase()
        .includes(s.search.toLowerCase()),
  );
  const csv = csvOutput([
    [
      "Stage",
      "Bin",
      "Reference",
      "Value",
      "Footprint",
      "Qty",
      "DNP",
      "Complete",
    ],
    ...parts.flatMap((p) =>
      p.references.map((r) => [
        p.stage,
        p.bin,
        r,
        p.value,
        p.footprint,
        1,
        p.dnp ? "yes" : "no",
        s.done[r] ? "yes" : "no",
      ]),
    ),
  ]);
  const markdown =
    `# ${t("Bench assembly checklist", "焊接台装配清单")}\n\n` +
    parts
      .map(
        (p) =>
          `## ${p.stage}. ${stageLabels[p.stage - 1]} · ${p.value} · ${p.bin}${p.dnp ? " · DNP" : ""}\n\n${p.footprint}\n\n${p.references.map((r) => `- [${s.done[r] ? "x" : " "}] ${r}${p.dnp ? " (DNP — do not populate)" : ""}`).join("\n")}\n`,
      )
      .join("\n");
  return (
    <ToolShell
      tool={tools.find((x) => x.day === 3)!}
      onSample={() => {
        set({ raw: BOM_SAMPLE, done: {}, stages: {}, delimiter: "," });
        setError("");
      }}
      onReset={() => {
        reset();
        setError("");
      }}
    >
      <div className="wb-layout">
        <section className="wb-panel">
          <h2>{t("KiCad BOM → assembly bench", "把 KiCad BOM 带到焊接台")}</h2>
          <Field label={t("CSV separator", "CSV 分隔符")}>
            <select
              value={s.delimiter}
              onChange={(e) => set({ delimiter: e.target.value })}
            >
              <option value=",">{t("Comma", "逗号")}</option>
              <option value=";">{t("Semicolon", "分号")}</option>
              <option value={"\t"}>{t("Tab", "制表符")}</option>
            </select>
          </Field>
          <TextImport
            label={t("Paste BOM CSV", "粘贴 BOM CSV")}
            value={s.raw}
            onChange={(raw) => set({ raw, done: {}, stages: {} })}
            accept=".csv,.tsv,.txt"
            disabled={!ready}
          />
          {parseError && (
            <p className="wb-error" role="alert">
              {errors[parseError] || t("Invalid BOM.", "BOM 格式有误。")}
            </p>
          )}
          <p className="muted">
            {t(
              "Height stages are inferred from footprints; confirm against your actual parts and override each row. Replacing the CSV clears checkmarks and stage overrides. Color and bin ID stay deterministic for each value.",
              "高度顺序按封装推断，请对照实物确认，需要时逐行调整。换一份 CSV 会清空勾选和顺序调整。同一数值始终使用同一颜色和色盒编号。",
            )}
          </p>
        </section>
        <section className="wb-panel">
          <h2>{t("Bench progress", "装配进度")}</h2>
          <div className="wb-big-number">
            {complete}
            <small> / {total}</small>
          </div>
          <p>
            {t(
              "Individual designators completed (DNP excluded).",
              "已完成的独立位号数（不含 DNP）。",
            )}
          </p>
          <progress max={Math.max(total, 1)} value={complete} />
          <Field
            label={t(
              "Find a designator, value or footprint",
              "查找位号、数值或封装",
            )}
          >
            <input
              value={s.search}
              onChange={(e) => set({ search: e.target.value })}
            />
          </Field>
          <label className="wb-check">
            <input
              type="checkbox"
              checked={s.showDnp}
              onChange={(e) => set({ showDnp: e.target.checked })}
            />
            {t("Show DNP / do not populate", "显示 DNP（不装配）元件")}
          </label>
          <Field label={t("Export format", "导出格式")}>
            <select
              value={s.format}
              onChange={(e) => set({ format: e.target.value })}
            >
              <option value="csv">Bench Assembly CSV</option>
              <option value="md">Markdown</option>
            </select>
          </Field>
          <ExportBar
            name={`bench-assembly.${s.format}`}
            content={s.format === "csv" ? csv : markdown}
            disabled={!parts.length || !!parseError}
          />
          <button className="button" onClick={() => window.print()}>
            {t("Print checklist", "打印清单")}
          </button>
          {error && <p role="alert">{error}</p>}
        </section>
      </div>
      <section className="wb-panel">
        <div className="wb-table-scroll">
          <table className="wb-table">
            <thead>
              <tr>
                <th>{t("Stage", "顺序")}</th>
                <th>{t("Value / bin", "数值 / 色盒")}</th>
                <th>{t("Footprint", "封装")}</th>
                <th>{t("Check off each part", "焊好一个，勾掉一个")}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.id} className={p.dnp ? "wb-dnp" : ""}>
                  <td>
                    <select
                      aria-label={t(
                        `Stage for ${p.references.join(",")}`,
                        `${p.references.join(",")} 的装配顺序`,
                      )}
                      value={p.stage}
                      onChange={(e) =>
                        set({
                          stages: { ...s.stages, [p.id]: +e.target.value },
                        })
                      }
                    >
                      {stageLabels.map((label, i) => (
                        <option key={i} value={i + 1}>
                          {i + 1} · {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <strong>{p.value}</strong>
                    <span
                      className="wb-bin"
                      style={{ background: p.color, color: "#fff" }}
                    >
                      {p.bin}
                    </span>
                    {p.dnp && <strong>DNP</strong>}
                  </td>
                  <td>
                    {p.footprint}
                    {p.warning && (
                      <p className="wb-error">
                        {t(
                          `Qty ${p.qty} differs from ${p.references.length} designators. Checklist uses actual designators.`,
                          `数量 ${p.qty} 与位号数 ${p.references.length} 不一致，清单按实际位号生成。`,
                        )}
                      </p>
                    )}
                  </td>
                  <td>
                    <div className="wb-designators">
                      {p.references.map((r) => (
                        <label className="wb-check" key={r}>
                          <input
                            type="checkbox"
                            disabled={p.dnp}
                            checked={!!s.done[r]}
                            onChange={(e) =>
                              set({
                                done: { ...s.done, [r]: e.target.checked },
                              })
                            }
                          />
                          {r}
                        </label>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <LocalStatus stored={stored} />
    </ToolShell>
  );
}
