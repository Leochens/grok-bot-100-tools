export type Condition = {
  name: string;
  remaining: number;
  timing: "rounds" | "next-turn";
};
export type Combatant = {
  id: string;
  name: string;
  initiative: number;
  dex: number;
  hp: number;
  maxHp: number;
  tempHp: number;
  concentrating: boolean;
  conditions: Condition[];
};
export type Encounter = {
  version: 1;
  round: number;
  activeId: string;
  combatants: Combatant[];
  log: string[];
};
export const EMPTY_ENCOUNTER: Encounter = {
  version: 1,
  round: 1,
  activeId: "",
  combatants: [],
  log: [],
};
export function turnOrder(combatants: Combatant[]) {
  return [...combatants].sort(
    (a, b) =>
      b.initiative - a.initiative || b.dex - a.dex || a.id.localeCompare(b.id),
  );
}
export function changeHp(encounter: Encounter, id: string, expression: string) {
  if (!/^[-+]?\d+$/.test(expression.trim())) throw new Error("hp");
  let dc: number | undefined;
  const combatants = encounter.combatants.map((c) => {
    if (c.id !== id) return c;
    const n = Number(expression),
      damage = expression.trim().startsWith("-") ? -n : 0;
    if (!Number.isSafeInteger(n)) throw new Error("hp");
    if (damage > 0 && c.concentrating)
      dc = Math.max(10, Math.floor(damage / 2));
    const absorbed = Math.min(c.tempHp, damage);
    const hp = damage
      ? Math.max(0, c.hp - damage + absorbed)
      : Math.min(
          c.maxHp,
          Math.max(0, expression.trim().startsWith("+") ? c.hp + n : n),
        );
    return { ...c, hp, tempHp: c.tempHp - absorbed };
  });
  const actor = combatants.find((c) => c.id === id);
  if (!actor) throw new Error("combatant");
  return {
    encounter: {
      ...encounter,
      combatants,
      log: [
        ...encounter.log,
        `R${encounter.round} · ${actor.name}: HP ${expression} → ${actor.hp}/${actor.maxHp}; Temp ${actor.tempHp}${dc ? `; Concentration DC ${dc} (resolve save manually)` : ""}`,
      ],
    },
    dc,
  };
}
export function addCondition(
  e: Encounter,
  id: string,
  name: string,
  rounds: number,
  timing: Condition["timing"],
) {
  if (
    !name.trim() ||
    !Number.isInteger(rounds) ||
    rounds < 1 ||
    rounds > 10000 ||
    !["rounds", "next-turn"].includes(timing)
  )
    throw new Error("condition");
  return {
    ...e,
    combatants: e.combatants.map((c) =>
      c.id === id
        ? {
            ...c,
            conditions: [
              ...c.conditions,
              {
                name: name.trim(),
                timing,
                remaining:
                  timing === "next-turn" ? (e.activeId === id ? 2 : 1) : rounds,
              },
            ],
          }
        : c,
    ),
  };
}
export function advanceTurn(e: Encounter): Encounter {
  const order = turnOrder(e.combatants);
  if (!order.length) return e;
  const index = order.findIndex((c) => c.id === e.activeId);
  if (index < 0) return { ...e, activeId: order[0].id };
  const expired: string[] = [];
  const combatants = e.combatants.map((c) =>
    c.id !== e.activeId
      ? c
      : {
          ...c,
          conditions: c.conditions
            .map((condition) => ({
              ...condition,
              remaining: condition.remaining - 1,
            }))
            .filter((condition) => {
              if (condition.remaining <= 0)
                expired.push(`${c.name}: ${condition.name}`);
              return condition.remaining > 0;
            }),
        },
  );
  const next = (index + 1) % order.length,
    round = e.round + (next === 0 ? 1 : 0);
  return {
    ...e,
    combatants,
    round,
    activeId: order[next].id,
    log: [
      ...e.log,
      ...expired.map((c) => `R${e.round} · Expired: ${c}`),
      `R${round} · Turn: ${order[next].name}`,
    ],
  };
}
export function importEncounter(raw: string): Encounter {
  const e = JSON.parse(raw) as Encounter;
  if (
    !e ||
    e.version !== 1 ||
    !Number.isInteger(e.round) ||
    e.round < 1 ||
    !Array.isArray(e.combatants) ||
    e.combatants.length > 500 ||
    !Array.isArray(e.log) ||
    !e.log.every((l) => typeof l === "string") ||
    typeof e.activeId !== "string"
  )
    throw new Error("encounter");
  const ids = new Set<string>();
  for (const c of e.combatants) {
    if (
      !c ||
      typeof c.id !== "string" ||
      !c.id ||
      ids.has(c.id) ||
      typeof c.name !== "string" ||
      !c.name.trim() ||
      ![c.hp, c.maxHp, c.tempHp, c.dex, c.initiative].every(Number.isFinite) ||
      c.maxHp <= 0 ||
      c.hp < 0 ||
      c.hp > c.maxHp ||
      c.tempHp < 0 ||
      typeof c.concentrating !== "boolean" ||
      !Array.isArray(c.conditions)
    )
      throw new Error("encounter");
    ids.add(c.id);
    for (const d of c.conditions)
      if (
        !d ||
        typeof d.name !== "string" ||
        !Number.isInteger(d.remaining) ||
        d.remaining < 1 ||
        !["rounds", "next-turn"].includes(d.timing)
      )
        throw new Error("encounter");
  }
  if (e.activeId && !ids.has(e.activeId)) throw new Error("encounter");
  return e;
}
export function encounterMarkdown(e: Encounter) {
  const safe = (s: string) => s.replace(/[\r\n|]/g, " ").replace(/[<>]/g, "");
  return `# Encounter · Round ${e.round}\n\n| Name | Initiative | DEX | HP | Temp | Conditions |\n|---|---:|---:|---:|---:|---|\n${turnOrder(
    e.combatants,
  )
    .map(
      (c) =>
        `| ${safe(c.name)}${c.id === e.activeId ? " ←" : ""} | ${c.initiative} | ${c.dex} | ${c.hp}/${c.maxHp} | ${c.tempHp} | ${c.conditions.map((d) => `${safe(d.name)} (${d.remaining})`).join(", ")} |`,
    )
    .join(
      "\n",
    )}\n\n## Combat log\n\n${e.log.map((l) => "- " + safe(l)).join("\n")}\n`;
}
export const ENCOUNTER_SAMPLE: Encounter = {
  version: 1,
  round: 1,
  activeId: "mage",
  combatants: [
    {
      id: "mage",
      name: "Elara",
      initiative: 18,
      dex: 16,
      hp: 32,
      maxHp: 32,
      tempHp: 5,
      concentrating: true,
      conditions: [],
    },
    {
      id: "goblin",
      name: "Goblin captain",
      initiative: 18,
      dex: 14,
      hp: 28,
      maxHp: 28,
      tempHp: 0,
      concentrating: false,
      conditions: [{ name: "Frightened", remaining: 10, timing: "rounds" }],
    },
    {
      id: "fighter",
      name: "Thorn",
      initiative: 12,
      dex: 12,
      hp: 45,
      maxHp: 45,
      tempHp: 0,
      concentrating: false,
      conditions: [],
    },
  ],
  log: ["R1 · Turn: Elara"],
};
