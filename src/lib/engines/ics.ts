/** Local ICS diagnostics. No IANA timezone lookup: only file offsets determine instants. */
export type IcsIssue = { code: string; en: string; zh: string; error: boolean };
export type IcsProperty = {
  name: string;
  params: Record<string, string>;
  value: string;
  line: number;
};
export type IcsComponent = {
  name: string;
  properties: IcsProperty[];
  children: IcsComponent[];
};
export type IcsObservance = {
  kind: string;
  from: number | null;
  to: number | null;
  start: string;
  rrule: string;
  month: number | null;
};
export type IcsZone = {
  tzid: string;
  customized: boolean;
  observances: IcsObservance[];
  warnings: IcsIssue[];
};
export type IcsStamp = {
  raw: string;
  tzid: string;
  kind: "utc" | "floating" | "zoned" | "date";
  local: string | null;
  utc: string | null;
  preview: string | null;
  offsetMinutes: number | null;
  offsetUsed: string;
  offsetUsedZh: string;
  warnings: IcsIssue[];
};
export type IcsEvent = {
  summary: string;
  location: string;
  uid: string;
  start: IcsStamp | null;
  end: IcsStamp | null;
  duration: string;
  warnings: IcsIssue[];
};
export type IcsInput = {
  rawIcs: string;
  displayLabel: string;
  displayOffsetMinutes: number;
  replacementTzid: string;
};
export type IcsReport = {
  original: string;
  components: IcsComponent[];
  timezones: IcsZone[];
  events: IcsEvent[];
  warnings: IcsIssue[];
  hasErrors: boolean;
  displayLabel: string;
  displayOffsetMinutes: number;
  rewritten: string | null;
};
export const ICS_DEFAULT: IcsInput = {
  rawIcs: "",
  displayLabel: "UTC",
  displayOffsetMinutes: 0,
  replacementTzid: "Asia/Kolkata",
};
export const ICS_PRESETS = [
  { label: "UTC", offset: 0 },
  { label: "Asia/Shanghai · UTC+08:00", offset: 480 },
  { label: "America/New_York · EST UTC−05:00", offset: -300 },
  { label: "America/Los_Angeles · PST UTC−08:00", offset: -480 },
  { label: "Asia/Kolkata · IST UTC+05:30", offset: 330 },
  { label: "Europe/Paris · CET UTC+01:00", offset: 60 },
];
export const ICS_SAMPLE = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//one hundred//ICS inspector//EN
BEGIN:VTIMEZONE
TZID:America/Los_Angeles
BEGIN:STANDARD
DTSTART:19701101T020000
TZOFFSETFROM:-0700
TZOFFSETTO:-0800
RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU
END:STANDARD
BEGIN:DAYLIGHT
DTSTART:19700308T020000
TZOFFSETFROM:-0800
TZOFFSETTO:-0700
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU
END:DAYLIGHT
END:VTIMEZONE
BEGIN:VTIMEZONE
TZID:Customized Time Zone
BEGIN:STANDARD
DTSTART:19700101T000000
TZOFFSETFROM:+0530
TZOFFSETTO:+0530
END:STANDARD
END:VTIMEZONE
BEGIN:VEVENT
UID:utc-meeting
SUMMARY:UTC team sync
DTSTART:20260928T090000Z
DTEND:20260928T100000Z
END:VEVENT
BEGIN:VEVENT
UID:pacific-review
SUMMARY:Pacific project review
LOCATION:Video call
DTSTART;TZID=America/Los_Angeles:20260928T133000
DURATION:PT45M
END:VEVENT
BEGIN:VEVENT
UID:custom-invite
SUMMARY:Custom-zone invite
DTSTART;TZID=Customized Time Zone:20260928T133000
DTEND;TZID=Customized Time Zone:20260928T143000
END:VEVENT
BEGIN:VEVENT
UID:floating-check
SUMMARY:Floating coffee chat
DTSTART:20260929T100000
DURATION:PT30M
END:VEVENT
END:VCALENDAR`.replace(/\n/g, "\r\n");
const issue = (
  code: string,
  en: string,
  zh: string,
  error = false,
): IcsIssue => ({ code, en, zh, error });
export function unfoldIcs(raw: string): string[] {
  return raw
    .replace(/^\uFEFF/, "")
    .replace(/\r\n|\r/g, "\n")
    .replace(/\n[ \t]/g, "")
    .split("\n");
}
function splitQuoted(raw: string, delimiter: string): string[] {
  let quoted = false,
    start = 0;
  const out: string[] = [];
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '"') quoted = !quoted;
    if (!quoted && raw[i] === delimiter) {
      out.push(raw.slice(start, i));
      start = i + 1;
    }
  }
  out.push(raw.slice(start));
  return out;
}
export function parseIcsProperty(raw: string, line = 1): IcsProperty | null {
  const parts = splitQuoted(raw, ":");
  if (parts.length < 2) return null;
  const head = splitQuoted(parts.shift()!, ";");
  const name = head.shift()!.trim().toUpperCase();
  if (!/^[A-Z0-9-]+$/.test(name)) return null;
  const params: Record<string, string> = {};
  for (const part of head) {
    const eq = part.indexOf("=");
    if (eq < 1) return null;
    const key = part.slice(0, eq).trim().toUpperCase();
    let value = part.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"'))
      value = value.slice(1, -1);
    params[key] = value;
  }
  return { name, params, value: parts.join(":").trim(), line };
}
const prop = (c: IcsComponent, name: string) =>
  c.properties.find((p) => p.name === name);
const val = (c: IcsComponent, name: string) => prop(c, name)?.value ?? "";
const textValue = (s: string) =>
  s.replace(/\\([nN,;\\])/g, (_, x: string) => (/n/i.test(x) ? "\n" : x));
export function parseIcs(raw: string) {
  const root: IcsComponent = { name: "ROOT", properties: [], children: [] };
  const stack = [root];
  const warnings: IcsIssue[] = [];
  unfoldIcs(raw).forEach((line, i) => {
    if (!line.trim()) return;
    const p = parseIcsProperty(line, i + 1);
    if (!p) {
      warnings.push(
        issue(
          "syntax",
          `Invalid content line ${i + 1}; original retained.`,
          `第 ${i + 1} 行格式不正确，已保留原文。`,
          true,
        ),
      );
      return;
    }
    if (p.name === "BEGIN") {
      if (stack.length > 50) {
        warnings.push(
          issue(
            "depth",
            "Component nesting exceeds 50.",
            "组件嵌套超过 50 层。",
            true,
          ),
        );
        return;
      }
      const c: IcsComponent = {
        name: p.value.toUpperCase(),
        properties: [],
        children: [],
      };
      stack.at(-1)!.children.push(c);
      stack.push(c);
    } else if (p.name === "END") {
      const index = stack.findLastIndex(
        (c) => c.name === p.value.toUpperCase(),
      );
      if (index < 1)
        warnings.push(
          issue(
            "component",
            `Unmatched END:${p.value}.`,
            `END:${p.value} 没有匹配的开始标记。`,
            true,
          ),
        );
      else {
        if (index !== stack.length - 1)
          warnings.push(
            issue(
              "component",
              "Unclosed nested component; recovered at END.",
              "嵌套组件未闭合，已从 END 处恢复。",
              true,
            ),
          );
        stack.length = index;
      }
    } else stack.at(-1)!.properties.push(p);
  });
  if (stack.length > 1)
    warnings.push(
      issue(
        "component",
        "Unclosed component; recovered available events.",
        "组件未闭合，仍显示可读取的事件。",
        true,
      ),
    );
  if (!root.children.some((c) => c.name === "VCALENDAR"))
    warnings.push(
      issue(
        "calendar",
        "Missing VCALENDAR wrapper.",
        "缺少 VCALENDAR 外层。",
        true,
      ),
    );
  if (
    root.properties.length ||
    root.children.some((c) => c.name !== "VCALENDAR")
  )
    warnings.push(
      issue(
        "outside",
        "Content outside VCALENDAR; original retained.",
        "VCALENDAR 外存在内容，已保留原文。",
        true,
      ),
    );
  return { components: root.children, warnings };
}
export function parseIcsOffset(raw: string): number | null {
  const m = /^([+-])(\d{2})(\d{2})(\d{2})?$/.exec(raw);
  if (!m || +m[2] > 23 || +m[3] > 59 || +(m[4] ?? 0) > 59) return null;
  return (m[1] === "-" ? -1 : 1) * (+m[2] * 60 + +m[3] + +(m[4] ?? 0) / 60);
}
function localMillis(raw: string): number | null {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?Z?$/.exec(raw);
  if (!m) return null;
  const parts = [
    +m[1],
    +m[2] - 1,
    +m[3],
    +(m[4] ?? 0),
    +(m[5] ?? 0),
    +(m[6] ?? 0),
  ];
  const d = new Date(0);
  d.setUTCFullYear(parts[0], parts[1], parts[2]);
  d.setUTCHours(parts[3], parts[4], parts[5], 0);
  return [
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes(),
    d.getUTCSeconds(),
  ].every((v, i) => v === parts[i])
    ? d.getTime()
    : null;
}
function formatWall(ms: number) {
  return new Date(ms).toISOString().slice(0, 19).replace("T", " ");
}
export function icsOffsetLabel(minutes: number) {
  const seconds = Math.round(Math.abs(minutes) * 60);
  return `UTC${minutes < 0 ? "−" : "+"}${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor(seconds / 60) % 60).padStart(2, "0")}${seconds % 60 ? `:${String(seconds % 60).padStart(2, "0")}` : ""}`;
}
function zoneFrom(c: IcsComponent): IcsZone {
  const tzid = val(c, "TZID"),
    warnings: IcsIssue[] = [];
  const customized = /^Customized Time Zone$/i.test(tzid);
  if (customized)
    warnings.push(
      issue(
        "customized",
        "Customized Time Zone is not a portable TZID.",
        "Customized Time Zone 不是通用的时区标识。",
      ),
    );
  if (
    !tzid ||
    (!customized && !/^[A-Za-z_+-]+(?:\/[A-Za-z0-9_+.-]+)+$/.test(tzid))
  )
    warnings.push(
      issue(
        "tzid",
        "Empty or nonstandard TZID; only embedded offsets are used.",
        "TZID 为空或不常见，仅使用文件内的偏移。",
        !tzid,
      ),
    );
  const observances = c.children
    .filter((x) => /^(STANDARD|DAYLIGHT)$/.test(x.name))
    .map((x) => {
      const rrule = val(x, "RRULE"),
        month = /(?:^|;)BYMONTH=(\d+)(?:;|$)/i.exec(rrule);
      const from = parseIcsOffset(val(x, "TZOFFSETFROM")),
        to = parseIcsOffset(val(x, "TZOFFSETTO"));
      if (from === null || to === null)
        warnings.push(
          issue(
            "offset",
            "Invalid or missing TZOFFSETFROM / TZOFFSETTO.",
            "TZOFFSETFROM / TZOFFSETTO 缺失或无效。",
            true,
          ),
        );
      return {
        kind: x.name,
        from,
        to,
        start: val(x, "DTSTART"),
        rrule,
        month: month && +month[1] >= 1 && +month[1] <= 12 ? +month[1] : null,
      };
    });
  if (!observances.length)
    warnings.push(
      issue(
        "offset",
        "No STANDARD / DAYLIGHT offsets in VTIMEZONE.",
        "VTIMEZONE 中没有 STANDARD / DAYLIGHT 偏移。",
        true,
      ),
    );
  return { tzid, customized, observances, warnings };
}
function chooseOffset(zone: IcsZone, month: number) {
  const standard = zone.observances.filter((x) => x.kind === "STANDARD");
  const daylight = zone.observances.filter((x) => x.kind === "DAYLIGHT");
  const s = standard[0],
    d = daylight[0];
  if (standard.length > 1 || daylight.length > 1) return null; // Historical eras need a full rule evaluator.
  if (!s || !d)
    return {
      observation: s ?? d,
      approximate: false,
      rule: "single",
      ruleZh: "单一偏移",
    };
  if (s.month !== null && d.month !== null && s.month !== d.month) {
    const active =
      d.month < s.month
        ? month >= d.month && month < s.month
        : month >= d.month || month < s.month;
    return {
      observation: active ? d : s,
      approximate: true,
      rule: "RRULE BYMONTH approximation",
      ruleZh: "按 RRULE BYMONTH 近似选择",
    };
  }
  return {
    observation: month >= 3 && month <= 10 ? d : s,
    approximate: true,
    rule: "northern Mar–Oct fallback",
    ruleZh: "按北半球 3–10 月经验规则选择",
  };
}
function stamp(
  p: IcsProperty,
  zones: IcsZone[],
  displayOffset: number,
): IcsStamp {
  const tzid = p.params.TZID ?? "",
    raw = p.value,
    warnings: IcsIssue[] = [];
  const hasTzid = Object.hasOwn(p.params, "TZID");
  const dateOnly = p.params.VALUE === "DATE" || /^\d{8}$/.test(raw);
  const kind = dateOnly
    ? "date"
    : raw.endsWith("Z")
      ? "utc"
      : hasTzid
        ? "zoned"
        : "floating";
  const out: IcsStamp = {
    raw,
    tzid,
    kind,
    local: null,
    utc: null,
    preview: null,
    offsetMinutes: null,
    offsetUsed: "Unresolved",
    offsetUsedZh: "无法确定",
    warnings,
  };
  const ms = localMillis(raw);
  if (
    ms === null ||
    (p.params.VALUE === "DATE-TIME" && /^\d{8}$/.test(raw)) ||
    (dateOnly && !/^\d{8}$/.test(raw)) ||
    (!dateOnly && !/^\d{8}T\d{6}Z?$/.test(raw)) ||
    (p.params.VALUE && !["DATE", "DATE-TIME"].includes(p.params.VALUE))
  ) {
    warnings.push(
      issue(
        "timestamp",
        `Invalid timestamp: ${raw}.`,
        `时间格式或日期无效：${raw}。`,
        true,
      ),
    );
    return out;
  }
  if ((raw.endsWith("Z") || dateOnly) && hasTzid)
    warnings.push(
      issue(
        "conflict",
        "UTC Z / all-day value also has TZID; remove this conflict before rewriting.",
        "UTC Z / 全天日期同时带有 TZID，请先修正冲突再改写。",
        true,
      ),
    );
  out.local = dateOnly ? formatWall(ms).slice(0, 10) : formatWall(ms);
  if (dateOnly) {
    warnings.push(
      issue(
        "all-day",
        "All-day date; no UTC instant or timezone shift. DTEND is exclusive.",
        "全天日期不换算为 UTC，也不随时区移动。DTEND 表示不包含的结束日期。",
      ),
    );
    return out;
  }
  if (kind === "utc") {
    out.offsetMinutes = 0;
    out.offsetUsed = "UTC Z";
    out.offsetUsedZh = "UTC Z";
  } else if (kind === "floating")
    warnings.push(
      issue(
        "floating",
        "Floating time: no timezone. UTC and preview cannot be determined.",
        "浮动时间：未指定时区，无法确定 UTC 和预览时间。",
      ),
    );
  else {
    if (/^Customized Time Zone$/i.test(tzid))
      warnings.push(
        issue(
          "customized",
          "Customized Time Zone needs its embedded offset.",
          "Customized Time Zone 需要文件内的偏移定义。",
        ),
      );
    const matches = zones.filter((z) => z.tzid === tzid);
    if (matches.length !== 1)
      warnings.push(
        issue(
          "missing-zone",
          "Missing or duplicate VTIMEZONE for TZID; no IANA lookup is performed.",
          "TZID 对应的 VTIMEZONE 缺失或重复；不会查询 IANA 时区库。",
        ),
      );
    else {
      const selected = chooseOffset(matches[0], new Date(ms).getUTCMonth() + 1);
      if (!selected || selected.observation?.to == null)
        warnings.push(
          issue(
            "unresolved-offset",
            "Offset is unknown or has multiple historical eras; conversion withheld.",
            "偏移未知或包含多个历史阶段，暂停换算。",
          ),
        );
      else {
        out.offsetMinutes = selected.observation.to;
        out.offsetUsed = `${selected.observation.kind} ${icsOffsetLabel(out.offsetMinutes)} · ${selected.rule}`;
        out.offsetUsedZh = `${selected.observation.kind} ${icsOffsetLabel(out.offsetMinutes)} · ${selected.ruleZh}`;
        if (selected.approximate)
          warnings.push(
            issue(
              "approximate",
              "Approximate DST selection by month only; transition day, hour and historical rules are not evaluated. Confirm with the organizer.",
              "夏令时仅按月份近似选择，未计算切换日、时刻或历史规则，请与组织者确认。",
            ),
          );
      }
    }
  }
  if (out.offsetMinutes !== null) {
    const utcMs = ms - out.offsetMinutes * 60000;
    out.utc = new Date(utcMs).toISOString();
    out.preview = formatWall(utcMs + displayOffset * 60000);
  }
  return out;
}
function durationParts(raw: string) {
  const m =
    /^\+?P(?:(\d+)W|(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?)$/.exec(
      raw,
    );
  if (!m || !m.slice(1).some(Boolean) || raw.endsWith("T")) return null;
  const days = +(m[1] ?? 0) * 7 + +(m[2] ?? 0),
    seconds = +(m[3] ?? 0) * 3600 + +(m[4] ?? 0) * 60 + +(m[5] ?? 0);
  return Number.isSafeInteger(days * 86400 + seconds) &&
    days * 86400 + seconds <= 3155760000
    ? { days, seconds }
    : null;
}
function compactDate(ms: number, dateOnly: boolean) {
  return new Date(ms)
    .toISOString()
    .slice(0, dateOnly ? 10 : 19)
    .replace(/[-:]/g, "");
}
export function inspectIcs(input: IcsInput): IcsReport {
  const { components, warnings } = parseIcs(input.rawIcs);
  const displayOffset = input.displayOffsetMinutes;
  if (
    !Number.isFinite(displayOffset) ||
    Math.abs(displayOffset) > 840 ||
    !Number.isInteger(displayOffset)
  )
    warnings.push(
      issue(
        "display-offset",
        "Display offset must be whole minutes between −840 and 840.",
        "显示偏移须为 −840 到 840 之间的整数分钟。",
        true,
      ),
    );
  const safeDisplay =
    Number.isInteger(displayOffset) && Math.abs(displayOffset) <= 840
      ? displayOffset
      : 0;
  const all: IcsComponent[] = [];
  const walk = (c: IcsComponent) => {
    all.push(c);
    c.children.forEach(walk);
  };
  components.forEach(walk);
  const timezones = all.filter((c) => c.name === "VTIMEZONE").map(zoneFrom);
  timezones.forEach((z, i) => {
    if (timezones.some((other, j) => j < i && other.tzid === z.tzid))
      z.warnings.push(
        issue(
          "duplicate-zone",
          "Duplicate TZID definitions.",
          "TZID 定义重复。",
          true,
        ),
      );
  });
  const events: IcsEvent[] = all
    .filter((c) => c.name === "VEVENT")
    .map((c) => {
      const ew: IcsIssue[] = [];
      for (const name of ["DTSTART", "DTEND", "DURATION", "SUMMARY", "UID"])
        if (c.properties.filter((p) => p.name === name).length > 1)
          ew.push(
            issue(
              "duplicate-property",
              `Repeated ${name}; preview uses the first.`,
              `${name} 重复，预览采用第一项。`,
              true,
            ),
          );
      const sp = prop(c, "DTSTART"),
        ep = prop(c, "DTEND"),
        duration = val(c, "DURATION");
      const start = sp ? stamp(sp, timezones, safeDisplay) : null;
      let end = ep ? stamp(ep, timezones, safeDisplay) : null;
      if (!sp)
        ew.push(issue("start", "Missing DTSTART.", "缺少 DTSTART。", true));
      if (duration) {
        const parts = durationParts(duration);
        if (!parts)
          ew.push(
            issue(
              "duration",
              "Invalid or excessive DURATION (positive weeks/days/hours/minutes/seconds only).",
              "DURATION 无效或过大（仅支持正的周、天、时、分、秒）。",
              true,
            ),
          );
        if (ep)
          ew.push(
            issue(
              "end-duration",
              "Both DTEND and DURATION supplied; preview uses DTEND.",
              "同时填写了 DTEND 和 DURATION，预览采用 DTEND。",
              true,
            ),
          );
        if (!ep && parts && sp && start?.local) {
          const base = localMillis(sp.value)!;
          const endMs = base + parts.days * 86400000;
          if (start.kind === "date" && parts.seconds)
            ew.push(
              issue(
                "duration",
                "All-day duration must use whole days or weeks.",
                "全天事件的时长必须为整天或整周。",
                true,
              ),
            );
          else if (Number.isFinite(endMs) && endMs <= 253402214400000) {
            end = stamp(
              {
                ...sp,
                value:
                  compactDate(endMs, start.kind === "date") +
                  (start.kind === "utc" ? "Z" : ""),
              },
              timezones,
              safeDisplay,
            );
            if (parts.seconds) {
              if (end.utc) {
                const instant = Date.parse(end.utc) + parts.seconds * 1000;
                end.utc = new Date(instant).toISOString();
                end.preview = formatWall(instant + safeDisplay * 60000);
                end.local = formatWall(instant + end.offsetMinutes! * 60000);
                if (start.kind === "zoned")
                  end.warnings.push(
                    issue(
                      "duration-dst",
                      "Elapsed hours use the selected offset; DST transitions within the duration are not evaluated.",
                      "经过时长沿用所选偏移，未计算时长内的夏令时切换。",
                    ),
                  );
              } else end.local = formatWall(endMs + parts.seconds * 1000);
            }
            end.raw = `${duration} (DURATION)`;
          } else
            ew.push(
              issue(
                "duration",
                "DURATION exceeds the supported date range.",
                "DURATION 超出支持的日期范围。",
                true,
              ),
            );
        }
      }
      if (start && end) {
        if ((start.kind === "date") !== (end.kind === "date"))
          ew.push(
            issue(
              "end-type",
              "DTSTART and DTEND have different value types.",
              "DTSTART 和 DTEND 的值类型不同。",
              true,
            ),
          );
        const a =
          start.utc ??
          (start.kind === end.kind && start.tzid === end.tzid
            ? start.local
            : null);
        const b =
          end.utc ??
          (start.kind === end.kind && start.tzid === end.tzid
            ? end.local
            : null);
        if (a && b && b < a)
          ew.push(
            issue(
              "end-before-start",
              "DTEND is before DTSTART.",
              "DTEND 早于 DTSTART。",
              true,
            ),
          );
      }
      if (prop(c, "RRULE") || prop(c, "RECURRENCE-ID"))
        ew.push(
          issue(
            "recurrence",
            "Preview covers this DTSTART only; recurring instances are not expanded.",
            "仅预览本条 DTSTART，不展开重复事件。",
          ),
        );
      ew.push(
        issue(
          "email-ambiguity",
          "ICS cannot verify the email’s printed time. Compare the raw time, chosen offset and organizer’s intent.",
          "ICS 无法核实邮件正文的时间，请对照原始时间、所用偏移并与组织者确认。",
        ),
      );
      return {
        summary: textValue(val(c, "SUMMARY")),
        location: textValue(val(c, "LOCATION")),
        uid: textValue(val(c, "UID")),
        start,
        end,
        duration,
        warnings: ew,
      };
    });
  if (!events.length)
    warnings.push(
      issue(
        "events",
        "No VEVENT found. Paste a complete ICS invite.",
        "未找到 VEVENT，请粘贴完整的 ICS 邀请。",
        true,
      ),
    );
  const combined = [
    ...warnings,
    ...timezones.flatMap((z) => z.warnings),
    ...events.flatMap((e) => [
      ...e.warnings,
      ...(e.start?.warnings ?? []),
      ...(e.end?.warnings ?? []),
    ]),
  ];
  const hasErrors = combined.some((w) => w.error);
  // A relabel preserves embedded rules; it never converts them to the target IANA zone's rules.
  const customZones = timezones.filter((z) => z.customized);
  const customRefs = all
    .flatMap((c) => c.properties)
    .filter((p) => /^Customized Time Zone$/i.test(p.params.TZID ?? ""));
  const target = input.replacementTzid.trim();
  const safeRewrite =
    !hasErrors &&
    customZones.length === 1 &&
    customZones[0].observances.every((o) => o.from !== null && o.to !== null) &&
    customRefs.length > 0 &&
    customRefs.every(
      (p) =>
        ["DTSTART", "DTEND"].includes(p.name) &&
        stamp(p, timezones, safeDisplay).utc !== null,
    ) &&
    /^[A-Za-z_+-]+(?:\/[A-Za-z0-9_+.-]+)+$/.test(target) &&
    !timezones.some((z) => z.tzid === target);
  const rewritten = safeRewrite
    ? unfoldIcs(input.rawIcs)
        .map((line) => {
          const p = parseIcsProperty(line);
          if (!p) return line;
          if (p.name === "TZID" && /^Customized Time Zone$/i.test(p.value))
            return `TZID:${target}`;
          return line.replace(
            /(;TZID=)("Customized Time Zone"|Customized Time Zone)(?=;|:)/gi,
            `$1${target}`,
          );
        })
        .map((line) => {
          // Refold at UTF-8 octet boundaries (75 bytes including continuation space).
          let result = "",
            current = "",
            bytes = 0;
          for (const char of line) {
            const size = new TextEncoder().encode(char).length;
            if (bytes + size > 75) {
              result += current + "\r\n";
              current = " ";
              bytes = 1;
            }
            current += char;
            bytes += size;
          }
          return result + current;
        })
        .join("\r\n")
    : null;
  return {
    original: input.rawIcs,
    components,
    timezones,
    events,
    warnings,
    hasErrors,
    displayLabel: input.displayLabel,
    displayOffsetMinutes: safeDisplay,
    rewritten,
  };
}
export function icsSummary(report: IcsReport, language: "en" | "zh" = "en") {
  const zh = language === "zh";
  const lines = [
    zh ? "ICS 时区诊断报告" : "ICS timezone diagnostic report",
    `${report.displayLabel} · ${icsOffsetLabel(report.displayOffsetMinutes)}`,
    zh
      ? "显示区使用固定偏移，不查询 IANA 历史时区。"
      : "Display uses a fixed offset, without IANA timezone history.",
  ];
  const addWarnings = (ws: IcsIssue[]) =>
    ws.forEach((w) => lines.push(`! ${zh ? w.zh : w.en}`));
  addWarnings(report.warnings);
  for (const z of report.timezones) {
    lines.push(`\nVTIMEZONE: ${z.tzid}`);
    for (const o of z.observances)
      lines.push(
        `${o.kind}: ${o.from === null ? "?" : icsOffsetLabel(o.from)} → ${o.to === null ? "?" : icsOffsetLabel(o.to)}; DTSTART=${o.start}; ${o.rrule}`,
      );
    addWarnings(z.warnings);
  }
  for (const e of report.events) {
    lines.push(
      `\n${e.summary || (zh ? "无标题事件" : "Untitled event")}`,
      `UID: ${e.uid}`,
      `${zh ? "地点" : "Location"}: ${e.location}`,
      `DURATION: ${e.duration || "—"}`,
    );
    for (const [name, s] of [
      ["DTSTART", e.start],
      ["DTEND", e.end],
    ] as const) {
      lines.push(
        `${name}: ${s?.raw ?? "—"}; TZID=${s?.tzid || "—"}`,
        `${zh ? "原始墙上时间" : "Raw wall time"}: ${s?.local ?? "—"}`,
        `UTC: ${s?.utc ?? "—"}`,
        `${zh ? "显示时间" : "Preview"}: ${s?.preview ?? "—"}`,
        `${zh ? "所用偏移" : "Offset used"}: ${s ? (zh ? s.offsetUsedZh : s.offsetUsed) : "—"}`,
      );
      addWarnings(s?.warnings ?? []);
    }
    addWarnings(e.warnings);
  }
  return lines.join("\n");
}
