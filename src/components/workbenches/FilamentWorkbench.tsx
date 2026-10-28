"use client";
import { useState } from "react";
import { tools } from "@/data/tools";
import {
  DENSITIES,
  TARE_PRESETS,
  GCODE_SAMPLE,
  parseGcode,
  spoolBudget,
  type Spool,
} from "@/lib/engines/filament";
import { csvOutput } from "@/lib/engines/bom";
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
import { BatchError, FileDrop } from "./batch-shared";
const spool: Spool = {
  name: "PLA white",
  grossWeightG: 500,
  emptySpoolTareG: 201,
  diameter: 1.75,
  material: "PLA",
  reserve: 10,
};
const initial = {
  spool,
  raw: "",
  jobName: "Print",
  copies: 1,
  jobs: [] as { name: string; grams: number; copies: number }[],
  inventory: [] as Spool[],
};
export function FilamentWorkbench() {
  const { t } = useLanguage(),
    {
      state: s,
      set,
      reset,
      ready,
      stored,
    } = useLocalDraft("one-hundred:filament:v1", initial, {
      jobs: { name: "", grams: 0, copies: 1 },
      inventory: spool,
    }),
    [error, setError] = useState("");
  const patch = (p: Partial<Spool>) => set({ spool: { ...s.spool, ...p } });
  let budget: ReturnType<typeof spoolBudget> | undefined,
    parsed: ReturnType<typeof parseGcode> | undefined,
    parseError = "";
  try {
    budget = spoolBudget(s.spool, s.jobs);
    if (s.raw.trim())
      parsed = parseGcode(s.raw, s.spool.diameter, DENSITIES[s.spool.material]);
  } catch (e) {
    parseError = (e as Error).message;
  }
  const inventory = s.inventory.flatMap((p) => {
    try {
      return [{ ...p, ...spoolBudget(p, []) }];
    } catch {
      return [];
    }
  });
  const queue =
    budget?.queue ||
    s.jobs.map((j) => ({ ...j, remainingG: NaN, fits: false }));
  return (
    <ToolShell
      tool={tools.find((x) => x.day === 8)!}
      onSample={() => {
        set({
          ...initial,
          raw: GCODE_SAMPLE,
          jobs: [{ name: "Bracket", grams: 44.14, copies: 3 }],
        });
        setError("");
      }}
      onReset={() => {
        reset();
        setError("");
      }}
    >
      <div className="wb-layout">
        <section className="wb-panel">
          <h2>{t("1. Weigh the spool", "1. 称量线盘")}</h2>
          <Field label={t("Spool name", "线盘名称")}>
            <input
              value={s.spool.name}
              onChange={(e) => patch({ name: e.target.value })}
            />
          </Field>
          <NumberField
            label={t("Gross weight (g)", "线盘总重（g）")}
            value={s.spool.grossWeightG}
            onChange={(grossWeightG) => patch({ grossWeightG })}
            min={0}
          />
          <Field
            label={t(
              "Approximate tare preset — verify your spool",
              "参考空盘重量，请以实测为准",
            )}
          >
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value)
                  patch({ emptySpoolTareG: Number(e.target.value) });
              }}
            >
              <option value="">
                {t("Custom measured tare", "自定义实测空盘重量")}
              </option>
              {Object.entries(TARE_PRESETS).map(([name, g]) => (
                <option key={name} value={g}>
                  {name}: {g} g
                </option>
              ))}
            </select>
          </Field>
          <NumberField
            label={t("Empty spool tare (g)", "空盘重量（g）")}
            value={s.spool.emptySpoolTareG}
            onChange={(emptySpoolTareG) => patch({ emptySpoolTareG })}
            min={0}
          />
          <Field
            label={t("Material / density (g/cm³)", "材料 / 密度（g/cm³）")}
          >
            <select
              value={s.spool.material}
              onChange={(e) =>
                patch({ material: e.target.value as Spool["material"] })
              }
            >
              {Object.entries(DENSITIES).map(([m, d]) => (
                <option key={m} value={m}>
                  {m} · {d}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("Filament diameter", "耗材直径")}>
            <select
              value={s.spool.diameter}
              onChange={(e) => patch({ diameter: +e.target.value })}
            >
              <option value={1.75}>1.75 mm</option>
              <option value={2.85}>2.85 mm</option>
            </select>
          </Field>
          <NumberField
            label={t("Keep reserve (%)", "保留余量（%）")}
            min={0}
            max={99}
            value={s.spool.reserve}
            onChange={(reserve) => patch({ reserve })}
          />
          <button
            className="button"
            disabled={!ready || !budget}
            onClick={() => set({ inventory: [...s.inventory, s.spool] })}
          >
            {t("Save spool to inventory", "添加到耗材库存")}
          </button>
        </section>
        <section className="wb-panel">
          <h2>{t("2. Parse G-code → queue", "2. 解析 G-code 并加入队列")}</h2>
          <TextImport
            label={t(
              "G-code (Prusa / Orca / Bambu / Cura)",
              "G-code（Prusa / Orca / Bambu / Cura）",
            )}
            accept=".gcode,.gco,.txt"
            maxBytes={100 * 1024 * 1024}
            value={s.raw}
            onChange={(raw) => set({ raw })}
            disabled={!ready}
          />
          <FileDrop
            label={t("Add multiple G-code jobs", "批量添加 G-code 任务")}
            accept=".gcode,.gco"
            onFiles={async (files) => {
              const jobs = await Promise.all(
                files.map(async (f) => ({
                  name: f.name,
                  grams: parseGcode(
                    await f.text(),
                    s.spool.diameter,
                    DENSITIES[s.spool.material],
                  ).grams,
                  copies: 1,
                })),
              );
              set((prev) => ({ ...prev, jobs: [...prev.jobs, ...jobs] }));
            }}
          />
          <Field label={t("Job name", "任务名称")}>
            <input
              value={s.jobName}
              onChange={(e) => set({ jobName: e.target.value })}
            />
          </Field>
          <NumberField
            label={t("Copies", "打印份数")}
            min={1}
            step={1}
            value={s.copies}
            onChange={(copies) => set({ copies })}
          />
          {parsed && (
            <p>
              {parsed.grams.toFixed(2)} g · {parsed.meters.toFixed(2)} m ·{" "}
              {t("Method", "解析方式")}: {parsed.method}
              {parsed.warnings.length > 0 && (
                <span>
                  {t(
                    " · Motion estimate: verify material, tool changes and purge allowance.",
                    " · 挤出估算：请核对材料、换料及冲刷用量。",
                  )}
                </span>
              )}
            </p>
          )}
          <button
            className="button"
            disabled={!parsed || !Number.isInteger(s.copies) || s.copies < 1}
            onClick={() => {
              if (parsed)
                set({
                  jobs: [
                    ...s.jobs,
                    {
                      name: s.jobName || "Print",
                      grams: parsed.grams,
                      copies: s.copies,
                    },
                  ],
                });
            }}
          >
            {t("Add print to queue", "加入打印队列")}
          </button>
          <BatchError code={parseError || error} />
        </section>
      </div>
      <section className="wb-panel" aria-live="polite">
        <h2>{t("Will this spool finish the job?", "这卷耗材够打印吗？")}</h2>
        <p className="wb-big-number">
          {budget?.fits ? t("Yes", "够用") : t("No", "不够")}
        </p>
        <p>
          {t("Net", "净重")}: {budget?.net.toFixed(2) || "—"} g /{" "}
          {budget?.meters.toFixed(2) || "—"} m ·{" "}
          {t("Available after reserve", "扣除余量后可用")}:{" "}
          {budget?.available.toFixed(2) || "—"} g ·{" "}
          {t("Queue needs", "队列需要")}: {budget?.required.toFixed(2) || "—"} g
        </p>
        <div className="wb-table-scroll">
          <table className="wb-table">
            <thead>
              <tr>
                {[
                  t("Job", "任务"),
                  "g",
                  t("Copies", "份数"),
                  t("Remaining (g)", "可用剩余（g）"),
                  t("Actions", "操作"),
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {queue.map((j, i) => (
                <tr key={i}>
                  <td>{j.name}</td>
                  <td>
                    <input
                      aria-label={t(`Job ${i + 1} grams`, `任务 ${i + 1} 用量`)}
                      type="number"
                      min={0}
                      value={j.grams}
                      onChange={(e) =>
                        set({
                          jobs: s.jobs.map((v, k) =>
                            k === i ? { ...v, grams: +e.target.value } : v,
                          ),
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      aria-label={t(
                        `Job ${i + 1} copies`,
                        `任务 ${i + 1} 份数`,
                      )}
                      type="number"
                      min={1}
                      value={j.copies}
                      onChange={(e) =>
                        set({
                          jobs: s.jobs.map((v, k) =>
                            k === i ? { ...v, copies: +e.target.value } : v,
                          ),
                        })
                      }
                    />
                  </td>
                  <td>
                    {j.remainingG.toFixed(2)} {j.fits ? "✓" : "✕"}
                  </td>
                  <td>
                    <button
                      className="button"
                      onClick={() =>
                        set({ jobs: s.jobs.filter((_, k) => k !== i) })
                      }
                    >
                      {t("Remove", "删除")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ExportBar
          name="spool-budget.json"
          content={JSON.stringify(
            { spool: s.spool, budget, inventory },
            null,
            2,
          )}
          disabled={!budget}
        />
      </section>
      <section className="wb-panel">
        <h2>
          {t("Spool inventory", "耗材库存")} ({s.inventory.length})
        </h2>
        {s.inventory.map((p, i) => (
          <div key={i}>
            {p.name}: {(p.grossWeightG - p.emptySpoolTareG).toFixed(1)} g{" "}
            <button className="button" onClick={() => set({ spool: p })}>
              {t("Use spool", "使用此卷")}
            </button>
            <button
              className="button"
              onClick={() =>
                set({ inventory: s.inventory.filter((_, k) => k !== i) })
              }
            >
              {t("Remove", "删除")}
            </button>
          </div>
        ))}
        <ExportBar
          name="spool-inventory.csv"
          content={csvOutput([
            [
              "Name",
              "Material",
              "Diameter_mm",
              "Gross_g",
              "Tare_g",
              "Net_g",
              "Length_m",
              "Reserve_percent",
            ],
            ...inventory.map((p) => [
              p.name,
              p.material,
              p.diameter,
              p.grossWeightG,
              p.emptySpoolTareG,
              p.net,
              p.meters,
              p.reserve,
            ]),
          ])}
          disabled={!s.inventory.length}
        />
        <ExportBar
          name="spool-inventory.json"
          content={JSON.stringify(inventory, null, 2)}
          disabled={!s.inventory.length}
        />
      </section>
      <LocalStatus stored={stored} />
    </ToolShell>
  );
}
