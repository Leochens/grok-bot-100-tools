"use client";
import { useState } from "react";
import { tools } from "@/data/tools";
import {
  EMPTY_ENCOUNTER,
  ENCOUNTER_SAMPLE,
  addCondition,
  advanceTurn,
  changeHp,
  encounterMarkdown,
  importEncounter,
  turnOrder,
  type Combatant,
  type Encounter,
} from "@/lib/engines/initiative";
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
import { BatchError } from "./batch-shared";
const initial = {
  encounter: JSON.stringify(EMPTY_ENCOUNTER),
  name: "",
  initiative: 10,
  dex: 10,
  maxHp: 20,
  importRaw: "",
  conditionName: "",
  duration: 10,
  timing: "rounds" as "rounds" | "next-turn",
  math: {} as Record<string, string>,
};
export function InitiativeWorkbench() {
  const { t } = useLanguage(),
    {
      state: s,
      set,
      reset,
      stored,
    } = useLocalDraft("one-hundred:initiative:v1", initial),
    [error, setError] = useState("");
  let e = EMPTY_ENCOUNTER,
    invalid = "";
  try {
    e = importEncounter(s.encounter);
  } catch {
    invalid = "encounter";
  }
  const save = (next: Encounter) => {
    try {
      const valid = importEncounter(JSON.stringify(next));
      set({ encounter: JSON.stringify(valid) });
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  };
  const edit = (id: string, patch: Partial<Combatant>) =>
    save({
      ...e,
      combatants: e.combatants.map((c) =>
        c.id === id ? { ...c, ...patch } : c,
      ),
    });
  const apply = (id: string) => {
    try {
      save(changeHp(e, id, s.math[id] || "").encounter);
      set({ math: { ...s.math, [id]: "" } });
    } catch (err) {
      setError((err as Error).message);
    }
  };
  const ordered = turnOrder(e.combatants);
  return (
    <ToolShell
      tool={tools.find((x) => x.day === 10)!}
      onSample={() => {
        set({ ...initial, encounter: JSON.stringify(ENCOUNTER_SAMPLE) });
        setError("");
      }}
      onReset={() => {
        reset();
        setError("");
      }}
    >
      <div className="wb-layout">
        <section className="wb-panel">
          <h2>{t("Add combatant", "添加参战者")}</h2>
          <Field label={t("Combatant name", "参战者名称")}>
            <input
              value={s.name}
              onChange={(ev) => set({ name: ev.target.value })}
            />
          </Field>
          <NumberField
            label={t("Initiative", "先攻")}
            value={s.initiative}
            onChange={(initiative) => set({ initiative })}
          />
          <NumberField
            label={t("DEX score (tiebreaker)", "敏捷值（同先攻时排序）")}
            value={s.dex}
            onChange={(dex) => set({ dex })}
          />
          <NumberField
            label={t("Maximum HP", "生命值上限")}
            min={1}
            value={s.maxHp}
            onChange={(maxHp) => set({ maxHp })}
          />
          <button
            className="button"
            disabled={
              !s.name.trim() || !Number.isFinite(s.maxHp) || s.maxHp <= 0
            }
            onClick={() => {
              const c: Combatant = {
                id: crypto.randomUUID(),
                name: s.name.trim(),
                initiative: s.initiative,
                dex: s.dex,
                hp: s.maxHp,
                maxHp: s.maxHp,
                tempHp: 0,
                concentrating: false,
                conditions: [],
              };
              save({
                ...e,
                combatants: [...e.combatants, c],
                activeId: e.activeId || c.id,
              });
            }}
          >
            {t("Add combatant", "添加参战者")}
          </button>
          <h2>{t("Condition duration", "状态持续时间")}</h2>
          <Field label={t("Condition name", "状态名称")}>
            <input
              value={s.conditionName}
              onChange={(ev) => set({ conditionName: ev.target.value })}
            />
          </Field>
          <Field label={t("Expiry timing", "到期方式")}>
            <select
              value={s.timing}
              onChange={(ev) =>
                set({ timing: ev.target.value as typeof s.timing })
              }
            >
              <option value="rounds">
                {t("After N affected turns end", "在目标的 N 个回合结束后")}
              </option>
              <option value="next-turn">
                {t("Until end of next affected turn", "直到目标的下一回合结束")}
              </option>
            </select>
          </Field>
          {s.timing === "rounds" && (
            <NumberField
              label={t("Duration (rounds)", "持续轮数")}
              value={s.duration}
              min={1}
              step={1}
              onChange={(duration) => set({ duration })}
            />
          )}
          <p>
            {t(
              "Add the condition using its combatant row. Round durations decrease at the end of that combatant’s turn. “Next turn” skips their current turn when applied during it.",
              "请在对应参战者一行添加状态。轮数在目标回合结束时递减。若在目标当前回合中添加“下一回合”，当前回合不计。",
            )}
          </p>
        </section>
        <section className="wb-panel">
          <h2>
            {t("Round", "轮次")} {e.round}
          </h2>
          <p className="wb-big-number">
            {e.combatants.find((c) => c.id === e.activeId)?.name ||
              t("No combatants", "尚无参战者")}
          </p>
          <button
            className="button primary"
            disabled={!ordered.length || !!invalid}
            onClick={() => save(advanceTurn(e))}
          >
            {t("End turn → next", "结束回合 → 下一位")}
          </button>
          <button
            className="button"
            disabled={!ordered.length}
            onClick={() => {
              let next = e;
              const round = e.round;
              for (let i = 0; i <= ordered.length && next.round === round; i++)
                next = advanceTurn(next);
              save(next);
            }}
          >
            {t("Advance to next round", "推进到下一轮")}
          </button>
          <p>
            {t(
              "Damage consumes Temp HP first. Concentration uses the full damage received, including damage absorbed by Temp HP. Resolve the saving throw manually and uncheck concentration if it fails.",
              "伤害先扣临时生命。专注检定按全部承受伤害计算，包括临时生命吸收的部分。请手动掷豁免，失败后取消专注勾选。",
            )}
          </p>
          <BatchError code={error || invalid} />
          <ExportBar
            name="encounter.json"
            content={JSON.stringify(e, null, 2)}
            disabled={!!invalid}
          />
          <ExportBar
            name="combat-log.md"
            content={encounterMarkdown(e)}
            disabled={!!invalid}
          />
        </section>
      </div>
      <section className="wb-panel">
        <h2>{t("Initiative order & health", "先攻顺序与生命值")}</h2>
        <div className="wb-table-scroll">
          <table className="wb-table">
            <thead>
              <tr>
                {[
                  t("Name / initiative / DEX", "名称 / 先攻 / 敏捷"),
                  t("HP / Temp HP", "生命 / 临时生命"),
                  t("Quick math", "快速运算"),
                  t("Concentration", "专注"),
                  t("Conditions", "状态"),
                  t("Actions", "操作"),
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ordered.map((c) => (
                <tr
                  key={c.id}
                  className={c.id === e.activeId ? "wb-active-turn" : ""}
                >
                  <td>
                    {c.id === e.activeId && "▶ "}
                    {c.name}
                    <input
                      aria-label={t(`${c.name} initiative`, `${c.name} 先攻`)}
                      type="number"
                      value={c.initiative}
                      onChange={(ev) =>
                        edit(c.id, { initiative: +ev.target.value })
                      }
                    />
                    <input
                      aria-label={t(`${c.name} DEX`, `${c.name} 敏捷`)}
                      type="number"
                      value={c.dex}
                      onChange={(ev) => edit(c.id, { dex: +ev.target.value })}
                    />
                  </td>
                  <td>
                    <strong>
                      {c.hp}/{c.maxHp}
                    </strong>
                    <input
                      aria-label={t(`${c.name} Temp HP`, `${c.name} 临时生命`)}
                      type="number"
                      min={0}
                      value={c.tempHp}
                      onChange={(ev) =>
                        edit(c.id, { tempHp: +ev.target.value })
                      }
                    />
                  </td>
                  <td>
                    <input
                      aria-label={t(`${c.name} HP math`, `${c.name} 生命运算`)}
                      placeholder="-14 / +8 / 20"
                      value={s.math[c.id] || ""}
                      onChange={(ev) =>
                        set({ math: { ...s.math, [c.id]: ev.target.value } })
                      }
                      onKeyDown={(ev) => {
                        if (ev.key === "Enter") apply(c.id);
                      }}
                    />
                    <button className="button" onClick={() => apply(c.id)}>
                      {t("Apply", "应用")}
                    </button>
                  </td>
                  <td>
                    <input
                      aria-label={t(
                        `${c.name} concentrating`,
                        `${c.name} 正在专注`,
                      )}
                      type="checkbox"
                      checked={c.concentrating}
                      onChange={(ev) =>
                        edit(c.id, { concentrating: ev.target.checked })
                      }
                    />
                  </td>
                  <td>
                    {c.conditions.map((d, i) => (
                      <div key={i}>
                        {d.name} · {d.remaining} {t("turn ends", "次回合结束")}{" "}
                        <button
                          className="button"
                          aria-label={t(`Remove ${d.name}`, `移除 ${d.name}`)}
                          onClick={() =>
                            edit(c.id, {
                              conditions: c.conditions.filter(
                                (_, j) => i !== j,
                              ),
                            })
                          }
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      className="button"
                      disabled={!s.conditionName.trim()}
                      onClick={() => {
                        try {
                          save(
                            addCondition(
                              e,
                              c.id,
                              s.conditionName,
                              s.duration,
                              s.timing,
                            ),
                          );
                        } catch (err) {
                          setError((err as Error).message);
                        }
                      }}
                    >
                      {t("Add condition", "添加状态")}
                    </button>
                  </td>
                  <td>
                    <button
                      className="button"
                      onClick={() => {
                        const next =
                          ordered[
                            (ordered.findIndex((x) => x.id === c.id) + 1) %
                              ordered.length
                          ];
                        save({
                          ...e,
                          combatants: e.combatants.filter((x) => x.id !== c.id),
                          activeId:
                            e.activeId === c.id
                              ? next?.id === c.id
                                ? ""
                                : next?.id || ""
                              : e.activeId,
                        });
                      }}
                    >
                      {t("Remove", "移除")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="wb-panel">
        <h2>{t("Combat log", "战斗日志")}</h2>
        <div className="wb-log" aria-live="polite">
          {e.log.slice(-100).map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
        <details>
          <summary>{t("Restore encounter JSON", "恢复遭遇 JSON")}</summary>
          <TextImport
            label={t("Full encounter state JSON", "完整遭遇状态 JSON")}
            accept=".json"
            value={s.importRaw}
            onChange={(importRaw) => set({ importRaw })}
          />
          <button
            className="button"
            onClick={() => {
              try {
                save(importEncounter(s.importRaw));
              } catch (err) {
                setError((err as Error).message);
              }
            }}
          >
            {t("Import encounter", "导入遭遇")}
          </button>
        </details>
      </section>
      <LocalStatus stored={stored} />
    </ToolShell>
  );
}
