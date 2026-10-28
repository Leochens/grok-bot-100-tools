/** RFC 4180: escaped quotes, embedded CR/LF, empty fields and BOM. */
export function parseCsv(raw: string, delimiter = ","): string[][] {
  const text = raw.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false,
    closed = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else field += c;
    } else if (c === '"') {
      if (field || closed) throw new Error("quote");
      quoted = true;
    } else if (c === delimiter) {
      row.push(field);
      field = "";
      closed = false;
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
      field = "";
      closed = false;
    } else {
      if (closed) {
        if (!/\s/.test(c)) throw new Error("quote");
      } else field += c;
    }
  }
  if (quoted) throw new Error("quote");
  row.push(field);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}
export function csvOutput(rows: (string | number)[][]): string {
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","),
      )
      .join("\r\n") +
    "\r\n"
  );
}
export type BomPart = {
  id: string;
  references: string[];
  value: string;
  footprint: string;
  qty: number;
  dnp: boolean;
  stage: number;
  bin: string;
  color: string;
  warning: string;
};
const colors = [
  "#1956a6",
  "#a1283e",
  "#216843",
  "#7342a0",
  "#966000",
  "#006b76",
  "#9e3f12",
  "#4b5265",
];
export function componentStage(ref: string, footprint: string): number {
  const s = footprint.toUpperCase(),
    p = ref.toUpperCase();
  if (
    /CP_|C_ELEC|CAPACITOR_THT|ELECTROLYTIC|TO-220|TO-247|HEATSINK|CONNECTOR|PINHEADER|PINSOCKET|TERMINAL|BARREL|USB|JST/.test(
      s,
    ) ||
    /^[JP]/.test(p)
  )
    return 5;
  if (/INDUCTOR|CRYSTAL|OSCILLATOR|SW_|TACTILE/.test(s) || /^[LYSX]/.test(p))
    return 4;
  if (/SOIC|QFP|QFN|TSSOP|SSOP|DIP-|BGA/.test(s) || /^U/.test(p)) return 3;
  if (/SOD|SOT|DIODE|TRANSISTOR/.test(s) || /^[DQ]/.test(p)) return 2;
  if (
    /0201|0402|0603|0805|1206|1210|RESISTOR_SMD|CAPACITOR_SMD/.test(s) ||
    /^[RC]/.test(p)
  )
    return 1;
  return 5;
}
export function valueBin(value: string) {
  let hash = 2166136261;
  for (const c of value.trim().toLowerCase())
    hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
  const code = (hash >>> 0)
    .toString(36)
    .toUpperCase()
    .slice(-5)
    .padStart(5, "0");
  return { bin: code, color: colors[(hash >>> 0) % colors.length] };
}
function expandReferences(input: string): string[] {
  return input
    .split(/[,;\s]+/)
    .filter(Boolean)
    .flatMap((ref) => {
      const m = ref.match(/^([A-Za-z]+)(\d+)-([A-Za-z]+)?(\d+)$/);
      if (!m) return [ref.toUpperCase()];
      const a = +m[2],
        b = +m[4];
      if (b < a || b - a > 10000 || (m[3] && m[1] !== m[3]))
        throw new Error("references");
      return Array.from({ length: b - a + 1 }, (_, i) =>
        `${m[1]}${a + i}`.toUpperCase(),
      );
    });
}
export function parseBom(raw: string, delimiter = ","): BomPart[] {
  const rows = parseCsv(raw, delimiter);
  if (!rows.length) return [];
  const names = rows[0].map((n) =>
    n
      .trim()
      .toLowerCase()
      .replace(/[\s_-]/g, ""),
  );
  const column = (...keys: string[]) =>
    names.findIndex((n) => keys.includes(n));
  const ri = column(
    "reference",
    "references",
    "ref",
    "refs",
    "designator",
    "designators",
  );
  const vi = column("value"),
    fi = column("footprint", "package"),
    qi = column("qty", "quantity"),
    di = column("dnp", "donotpopulate", "donotfit");
  if (ri < 0 || vi < 0 || fi < 0) throw new Error("headers");
  const seen = new Set<string>();
  return rows.slice(1).map((row, i) => {
    if (row.length !== names.length) throw new Error("columns");
    const references = expandReferences(row[ri]);
    if (!references.length || references.some((r) => seen.has(r)))
      throw new Error("references");
    references.forEach((r) => seen.add(r));
    const qty = qi >= 0 && row[qi].trim() ? Number(row[qi]) : references.length;
    if (!Number.isInteger(qty) || qty <= 0) throw new Error("quantity");
    const dnpText = di >= 0 ? row[di].trim().toLowerCase() : "";
    if (
      dnpText &&
      ![
        "0",
        "1",
        "false",
        "true",
        "yes",
        "no",
        "dnp",
        "dnf",
        "x",
        "do not populate",
      ].includes(dnpText)
    )
      throw new Error("dnp");
    const dnp = [
      "1",
      "true",
      "yes",
      "dnp",
      "dnf",
      "x",
      "do not populate",
    ].includes(dnpText);
    const value = row[vi],
      footprint = row[fi];
    return {
      id: `${i}:${references.join(",")}`,
      references,
      value,
      footprint,
      qty,
      dnp,
      stage: componentStage(references[0], footprint),
      ...valueBin(value),
      warning: qty !== references.length ? "quantity" : "",
    };
  });
}
export const BOM_SAMPLE =
  'Reference,Value,Footprint,Qty,DNP\n"R1,R2,R3",10k,Resistor_SMD:R_0603_1608Metric,3,\n"C1,C2",100n,Capacitor_SMD:C_0402_1005Metric,2,\nD1,1N4148,Diode_SMD:D_SOD-123,1,\nU1,ATmega328,Package_QFP:TQFP-32,1,\nY1,16MHz,Crystal:Crystal_SMD_3225,1,\nC7,470u,Capacitor_THT:CP_Radial_D10,1,\nJ1,USB-C,Connector_USB:USB_C,1,\nR9,0R,Resistor_SMD:R_0805,1,yes';
