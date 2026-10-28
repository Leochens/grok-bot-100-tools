import postcss, { type Declaration, type Rule, type Root } from "postcss";
import selectorParser from "postcss-selector-parser";
import valueParser from "postcss-value-parser";
export type Specificity = [number, number, number];
const add = (a: Specificity, b: Specificity): Specificity => [
  a[0] + b[0],
  a[1] + b[1],
  a[2] + b[2],
];
const max = (a: Specificity, b: Specificity): Specificity =>
  a[0] !== b[0]
    ? a[0] > b[0]
      ? a
      : b
    : a[1] !== b[1]
      ? a[1] > b[1]
        ? a
        : b
      : a[2] >= b[2]
        ? a
        : b;
export function specificity(selector: string): Specificity[] {
  const ast = selectorParser().astSync(selector);
  function calculate(nodes: selectorParser.Node[]): Specificity {
    let s: Specificity = [0, 0, 0];
    for (const node of nodes) {
      if (node.type === "nesting") throw new Error("nesting");
      if (node.type === "id") s = add(s, [1, 0, 0]);
      else if (node.type === "class" || node.type === "attribute")
        s = add(s, [0, 1, 0]);
      else if (node.type === "tag") s = add(s, [0, 0, 1]);
      else if (node.type === "pseudo") {
        const name = node.value.toLowerCase();
        if (name === ":where") continue;
        if (
          name.startsWith("::") ||
          [":before", ":after", ":first-line", ":first-letter"].includes(name)
        ) {
          s = add(s, [0, 0, 1]);
          if (name === "::slotted")
            s = add(
              s,
              (node.nodes ?? [])
                .map((n) => calculate(n.nodes ?? []))
                .reduce(max, [0, 0, 0]),
            );
          continue;
        }
        const childMax = () =>
          (node.nodes ?? [])
            .map((n) => calculate(n.nodes ?? []))
            .reduce(max, [0, 0, 0]);
        if ([":host", ":host-context"].includes(name))
          s = add(s, add([0, 1, 0], childMax()));
        else if ([":is", ":not", ":has"].includes(name)) s = add(s, childMax());
        else if (name === ":nth-child" || name === ":nth-last-child") {
          s = add(s, [0, 1, 0]);
          const body = node.toString().slice(name.length + 1, -1);
          const of = body.match(/\bof\s+([\s\S]+)$/i);
          if (of) s = add(s, specificity(of[1]).reduce(max, [0, 0, 0]));
        } else s = add(s, [0, 1, 0]);
      }
    }
    return s;
  }
  return ast.nodes.map((n) => calculate(n.nodes));
}
function words(value: string): string[] | null {
  const parsed = valueParser(value),
    out: string[] = [];
  let current = "";
  for (const n of parsed.nodes) {
    if (n.type === "comment") continue;
    if (n.type === "space") {
      if (current) {
        out.push(current);
        current = "";
      }
    } else current += valueParser.stringify(n);
  }
  if (current) out.push(current);
  return out.some((v) => /\b(?:var|env)\(/i.test(v)) ? null : out;
}
const sides = ["top", "right", "bottom", "left"];
const normalize = (v: string) => v.replace(/\s+/g, " ").trim();
/** Values are retained per longhand so equal shorthand/longhand effects can be proven. */
export function expandDeclaration(
  prop: string,
  value: string,
): Record<string, string> | null {
  const p = prop.startsWith("--") ? prop : prop.toLowerCase();
  const v = normalize(value),
    w = words(v);
  if (
    !w ||
    p === "all" ||
    p.startsWith("--") ||
    /^(?:animation|transition|font|background|grid|flex|border-image|mask|outline|list-style|columns|column-rule|place-|inset)/.test(
      p,
    ) ||
    /(?:inline|block|start|end)/.test(p) ||
    /(?:revert|inherit|unset|initial)/.test(v)
  )
    return null;
  const box = (prefix: string, suffix = "") => {
    if (w.length < 1 || w.length > 4) return null;
    const a = [w[0], w[1] ?? w[0], w[2] ?? w[0], w[3] ?? w[1] ?? w[0]];
    return Object.fromEntries(
      sides.map((side, i) => [`${prefix}-${side}${suffix}`, a[i]]),
    );
  };
  if (p === "margin" || p === "padding") return box(p);
  if (/^border-(width|style|color)$/.test(p))
    return box("border", "-" + p.split("-")[1]);
  if (p === "border" || /^border-(top|right|bottom|left)$/.test(p)) {
    let width = "medium",
      style = "none",
      color = "currentcolor";
    const styles = [
      "none",
      "hidden",
      "dotted",
      "dashed",
      "solid",
      "double",
      "groove",
      "ridge",
      "inset",
      "outset",
    ];
    let haveW = false,
      haveS = false,
      haveC = false;
    for (const token of w) {
      if (styles.includes(token)) {
        if (haveS) return null;
        style = token;
        haveS = true;
      } else if (
        /^(?:thin|medium|thick|0|[\d.]+(?:px|em|rem|pt|cm|mm|vh|vw))$/.test(
          token,
        ) ||
        /^(?:calc|min|max|clamp)\(/.test(token)
      ) {
        if (haveW) return null;
        width = token;
        haveW = true;
      } else {
        if (haveC) return null;
        color = token;
        haveC = true;
      }
    }
    const selected = p === "border" ? sides : [p.slice(7)];
    const out: Record<string, string> = {};
    for (const side of selected) {
      out[`border-${side}-width`] = width;
      out[`border-${side}-style`] = style;
      out[`border-${side}-color`] = color;
    }
    // border also resets border-image; keep it unless that reset is covered too.
    if (p === "border") out["border-image"] = "initial";
    return out;
  }
  if (p === "border-radius") return null;
  return { [p]: v };
}
export type CssCandidate = {
  id: string;
  selector: string;
  scope: string;
  line: number;
  property: string;
  value: string;
  important: boolean;
  winnerLines: number[];
  safe: boolean;
  reason: "duplicate" | "override";
};
export type CssRuleAudit = {
  selector: string;
  line: number;
  scope: string;
  specificity: Specificity[];
  declarations: number;
};
export type CssEffect = {
  selector: string;
  scope: string;
  line: number;
  property: string;
  value: string;
  components: {
    property: string;
    value: string;
    winnerLine: number;
    active: boolean;
  }[];
};
export type CssAnalysis = {
  effects: CssEffect[];
  root: Root;
  candidates: CssCandidate[];
  rules: CssRuleAudit[];
  repeated: number;
  protectedCount: number;
};
export const declarationId = (d: Declaration) =>
  `${d.source?.start?.offset ?? 0}:${d.prop}`;
export function analyzeCss(raw: string): CssAnalysis {
  const root = postcss.parse(raw),
    candidates: CssCandidate[] = [],
    rules: CssRuleAudit[] = [],
    groups = new Map<string, Declaration[]>();
  let protectedCount = 0;
  const scopeIds = new Map<object, number>();
  let scopeId = 0;
  root.walkRules((rule: Rule) => {
    const parents: string[] = [],
      identities: string[] = [];
    let parent = rule.parent;
    let nested = false;
    while (parent && parent.type !== "root") {
      if (parent.type === "rule") nested = true;
      const at = parent as unknown as { name?: string; params?: string };
      parents.unshift(`@${at.name ?? "nested"} ${at.params ?? ""}`);
      if (!scopeIds.has(parent)) scopeIds.set(parent, ++scopeId);
      const name = (at.name ?? "").toLowerCase(),
        params = at.params?.trim() ?? "";
      identities.unshift(
        ["media", "supports", "container", "scope", "layer"].includes(name) &&
          (name !== "layer" || params)
          ? `@${name} ${params}`
          : `scope-${scopeIds.get(parent)}`,
      );
      parent = parent.parent;
    }
    if (!scopeIds.has(rule.parent!)) scopeIds.set(rule.parent!, ++scopeId);
    const scope = parents.join(" / ") || "root";
    let specs: Specificity[] = [];
    try {
      specs = specificity(rule.selector);
    } catch {
      nested = true;
    }
    rules.push({
      selector: rule.selector,
      line: rule.source?.start?.line ?? 1,
      scope,
      specificity: specs,
      declarations: rule.nodes.filter((n) => n.type === "decl").length,
    });
    // Keyframe declarations, native nesting and :has() are retained for manual inspection.
    if (
      nested ||
      parents.some((p) => /keyframes|starting-style/.test(p)) ||
      /[&]|:has\(/.test(rule.selector)
    ) {
      protectedCount += rule.nodes.filter((n) => n.type === "decl").length;
      return;
    }
    const key = `${identities.join(" / ") || "root"}:${rule.selector.trim()}`;
    const group = groups.get(key) ?? [];
    for (const n of rule.nodes) if (n.type === "decl") group.push(n);
    groups.set(key, group);
  });
  const effects: CssEffect[] = [];
  const scopeByLine = new Map(rules.map((r) => [r.line, r.scope]));
  for (const decls of groups.values()) {
    const expanded = new Map(
      decls.map((d) => [d, expandDeclaration(d.prop, d.value)]),
    );
    const barriers = decls
      .filter((d) => !expanded.get(d))
      .map((d) => d.prop.toLowerCase());
    protectedCount += barriers.length;
    const winners = new Map<
      string,
      { declaration: Declaration; value: string }
    >();
    for (const d of decls) {
      const atoms = expanded.get(d);
      if (!atoms) continue;
      for (const [atom, value] of Object.entries(atoms)) {
        const prior = winners.get(atom);
        if (!prior?.declaration.important || d.important)
          winners.set(atom, { declaration: d, value });
      }
    }
    const exactWinners = new Map<string, Declaration>();
    for (const d of decls) {
      const key = d.prop.startsWith("--") ? d.prop : d.prop.toLowerCase();
      const previous = exactWinners.get(key);
      if (!previous?.important || d.important) exactWinners.set(key, d);
    }
    for (const d of decls) {
      const atoms = expanded.get(d);
      const rule = d.parent as Rule,
        scope = scopeByLine.get(rule.source?.start?.line ?? 1) ?? "root";
      if (!atoms) {
        const key = d.prop.startsWith("--") ? d.prop : d.prop.toLowerCase();
        const winner = exactWinners.get(key);
        if (winner && winner !== d && winner.value === d.value) {
          candidates.push({
            id: declarationId(d),
            selector: rule.selector,
            scope,
            line: d.source?.start?.line ?? 1,
            property: d.prop,
            value: d.value,
            important: !!d.important,
            winnerLines: [winner.source?.start?.line ?? 1],
            safe: true,
            reason: "duplicate",
          });
          protectedCount--;
        }
        continue;
      }
      const components = Object.entries(atoms).map(([property, value]) => {
        const blocked = barriers.some(
          (p) =>
            p === "all" ||
            property === p ||
            property.startsWith(p + "-") ||
            p.startsWith(property + "-"),
        );
        const winner = blocked ? undefined : winners.get(property);
        return {
          property,
          value,
          winnerLine:
            winner?.declaration.source?.start?.line ??
            d.source?.start?.line ??
            1,
          active: !winner || winner.declaration === d,
        };
      });
      effects.push({
        selector: rule.selector,
        scope,
        line: d.source?.start?.line ?? 1,
        property: d.prop,
        value: d.value,
        components,
      });
      if (components.some((c) => c.active)) continue;
      const safe = Object.entries(atoms).every(
        ([atom, value]) => winners.get(atom)?.value === value,
      );
      candidates.push({
        id: declarationId(d),
        selector: rule.selector,
        scope,
        line: d.source?.start?.line ?? 1,
        property: d.prop,
        value: d.value,
        important: !!d.important,
        winnerLines: [...new Set(components.map((c) => c.winnerLine))],
        safe,
        reason: safe ? "duplicate" : "override",
      });
    }
  }
  const counts = new Map<string, number>();
  rules.forEach((r) =>
    counts.set(
      r.scope + "|" + r.selector,
      (counts.get(r.scope + "|" + r.selector) ?? 0) + 1,
    ),
  );
  return {
    root,
    effects,
    candidates,
    rules,
    repeated: [...counts.values()].filter((n) => n > 1).length,
    protectedCount,
  };
}
export function cleanCss(raw: string, ids: string[], mergeAdjacent = true) {
  const analysis = analyzeCss(raw),
    selected = new Set(ids),
    allowed = new Set(analysis.candidates.map((c) => c.id));
  const root = analysis.root;
  root.walkDecls((d) => {
    if (selected.has(declarationId(d)) && allowed.has(declarationId(d)))
      d.remove();
  });
  root.walkRules((r) => {
    if (!r.nodes.length) r.remove();
  });
  if (mergeAdjacent)
    root.walkRules((r) => {
      const previous = r.prev();
      if (
        previous?.type === "rule" &&
        previous.selector === r.selector &&
        r.nodes.every((n) => n.type === "decl" || n.type === "comment") &&
        previous.nodes.every((n) => n.type === "decl" || n.type === "comment")
      ) {
        for (const node of [...r.nodes]) previous.append(node);
        r.remove();
      }
    });
  return root.toString();
}
export const CSS_SAMPLE =
  "/* Original stylesheet */\n.card {\n  margin: 16px;\n  padding: 12px;\n  color: #333;\n  border: 1px solid #ccc;\n}\n\n@media (min-width: 48rem) {\n  .card { padding: 20px; }\n  .card { padding: 24px; }\n}\n\n/* Later AI-appended overrides */\n.card {\n  margin-top: 16px;\n  padding: 12px;\n  color: #111 !important;\n  border-color: #777;\n}\n.card {\n  color: #555;\n  margin: 16px;\n}\n";
/** Bounded line diff using common prefix/suffix anchors, with equal-length aligned spans. */
export function diffLines(before: string, after: string) {
  const a = before.split("\n"),
    b = after.split("\n"),
    out: { kind: "same" | "remove" | "add"; text: string }[] = [];
  let i = 0,
    j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      out.push({ kind: "same", text: a[i++] });
      j++;
      continue;
    }
    let ai = -1,
      bj = -1;
    for (let n = 1; n <= 80; n++) {
      if (ai < 0 && j < b.length && a[i + n] === b[j]) ai = i + n;
      if (bj < 0 && i < a.length && b[j + n] === a[i]) bj = j + n;
      if (ai >= 0 || bj >= 0) break;
    }
    if (ai >= 0 && (bj < 0 || ai - i <= bj - j)) {
      while (i < ai) out.push({ kind: "remove", text: a[i++] });
    } else if (bj >= 0) {
      while (j < bj) out.push({ kind: "add", text: b[j++] });
    } else {
      if (i < a.length) out.push({ kind: "remove", text: a[i++] });
      if (j < b.length) out.push({ kind: "add", text: b[j++] });
    }
  }
  return out;
}
