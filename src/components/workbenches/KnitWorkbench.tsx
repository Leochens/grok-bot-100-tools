"use client";
import { tools } from "@/data/tools";
import {
  calculateKnit,
  KNIT_DEFAULT,
  STRUCTURES,
  type KnitSection,
} from "@/lib/engines/knit";
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
import { useState } from "react";
export function KnitWorkbench() {
  const { t } = useLanguage();
  const {
    state: s,
    set,
    reset,
    stored,
  } = useLocalDraft("one-hundred:knit:v1", KNIT_DEFAULT);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState(false);
  let result: ReturnType<typeof calculateKnit> | null = null,
    error = "";
  try {
    result = calculateKnit(s);
  } catch (e) {
    error = (e as Error).message;
  }
  const structures: Record<keyof typeof STRUCTURES, string> = {
    stockinette: t("Stockinette", "平针"),
    rib1: t("1×1 rib", "单罗纹"),
    rib2: t("2×2 rib", "双罗纹"),
    fisherman: t("Fisherman’s rib", "渔夫罗纹"),
    cable: t("Aran cable", "阿兰麻花"),
  };
  function section(i: number, patch: Partial<KnitSection>) {
    set({
      sections: s.sections.map((v, j) => (i === j ? { ...v, ...patch } : v)),
    });
  }
  const report = result
    ? {
        assumptions: {
          note: t(
            "Yarn is an estimate calibrated to a stockinette swatch; structure ratios are adjustable assumptions. Dimensions are rectangular section equivalents, not shaping instructions.",
            "用线量按平针样片实测重量估算，组织系数可自行校准。尺寸按矩形等效分区计算，不代替收放针说明。",
          ),
          settings: s,
        },
        result,
      }
    : null;
  const csv = result
    ? csvOutput([
        [
          "Section",
          "Pieces",
          "Stitches",
          "Rows",
          "Finished width cm",
          "Finished length cm",
          "Pre-wash length cm",
          "Meters",
          "Grams",
        ],
        ...result.rows.map((r) => [
          r.name,
          r.count,
          r.stitches,
          r.rows,
          r.finishedWidth.toFixed(2),
          r.finishedLength.toFixed(2),
          r.preWashLength.toFixed(2),
          r.meters.toFixed(2),
          r.grams.toFixed(2),
        ]),
        [
          "TOTAL + allowance",
          "",
          "",
          "",
          "",
          "",
          "",
          result.meters.toFixed(2),
          result.grams.toFixed(2),
        ],
      ])
    : "";
  const num = (key: keyof Omit<typeof s, "sections">, label: string) => (
    <NumberField
      key={key}
      label={label}
      value={s[key]}
      min={key === "waste" ? 0 : 0.01}
      onChange={(value) => set({ [key]: value })}
    />
  );
  return (
    <ToolShell
      tool={tools.find((x) => x.day === 5)!}
      onSample={reset}
      onReset={reset}
    >
      <div className="wb-layout">
        <section className="wb-panel">
          <h2>{t("Pattern & measured swatch", "图解密度和实测样片")}</h2>
          <div className="wb-fields">
            {num(
              "patternSts",
              t("Pattern stitches / 10 cm", "图解针数 / 10 厘米"),
            )}
            {num(
              "patternRows",
              t("Pattern rows / 10 cm", "图解行数 / 10 厘米"),
            )}
            {num("swatchSts", t("Swatch stitches counted", "样片测量区针数"))}
            {num("swatchRows", t("Swatch rows counted", "样片测量区行数"))}
            {num(
              "unblockedWidth",
              t("Unblocked width (cm)", "洗前测量区宽度（厘米）"),
            )}
            {num(
              "unblockedLength",
              t("Unblocked length (cm)", "洗前测量区长度（厘米）"),
            )}
            {num(
              "blockedWidth",
              t("Blocked width (cm)", "定型后测量区宽度（厘米）"),
            )}
            {num(
              "blockedLength",
              t("Blocked length (cm)", "定型后测量区长度（厘米）"),
            )}
            {num(
              "swatchGrams",
              t(
                "Yarn weight of measured swatch (g)",
                "测量区样片用线重量（克）",
              ),
            )}
          </div>
          <p className="muted">
            {t(
              "Use the same stockinette measurement area before and after blocking. Swatch weight must correspond to the counted stitches × rows, excluding borders and tails.",
              "洗前洗后要测同一块平针区域。样片重量要对应所数的针数 × 行数，不含边框和线头。",
            )}
          </p>
        </section>
        <section className="wb-panel">
          <h2>{t("Yarn & allowance", "毛线和余量")}</h2>
          <div className="wb-fields">
            {num("skeinGrams", t("Skein weight (g)", "每团重量（克）"))}
            {num("skeinMeters", t("Skein length (m)", "每团长度（米）"))}
            {num(
              "waste",
              t("Extra for seams / waste (%)", "缝合和损耗余量（%）"),
            )}
          </div>
          {result && (
            <>
              <div className="wb-big-number">
                {result.skeins}
                <small>{t(" skeins", " 团")}</small>
              </div>
              <p>
                {result.meters.toFixed(1)} m · {result.grams.toFixed(1)} g
              </p>
              <p>
                {t("Blocked gauge", "定型后密度")}:{" "}
                {(result.stsPerCm * 10).toFixed(2)} sts ×{" "}
                {(result.rowsPerCm * 10).toFixed(2)}{" "}
                {t("rows / 10 cm", "行 / 10 厘米")}
              </p>
              <p>
                {t("Width / length change", "宽度 / 长度变化")}:{" "}
                {result.widthChange.toFixed(1)}% /{" "}
                {result.lengthChange.toFixed(1)}%
              </p>
            </>
          )}
          {error && (
            <p className="wb-error" role="alert">
              {error === "repeat"
                ? t(
                    "Repeat must be a positive integer; offset must be 0 through repeat − 1.",
                    "花样倍数必须是正整数，附加针数应在 0 到倍数减 1 之间。",
                  )
                : t(
                    "Enter positive measurements, integer stitch/row/piece counts, and a 0–100% allowance.",
                    "测量值要大于 0，针、行、件数用整数，余量填 0–100%。",
                  )}
            </p>
          )}
          <p className="muted">
            {t(
              "Yarn totals are estimates. Default structure ratios are starting assumptions, not universal physical constants; replace them with measured ratios for your yarn and tension.",
              "用线量是估算值。默认组织系数只是起点，并非固定规律；最好用自己的线和手势实测校准。",
            )}
          </p>
        </section>
      </div>
      <section className="wb-panel">
        <h2>{t("Garment sections", "分区重算")}</h2>
        <p>
          {t(
            "Enter finished width/circumference and length for one piece; quantity handles paired sleeves. For shaping, divide into smaller sections using average width.",
            "填写每件的成品宽度或围度、长度；袖子可以把件数设为 2。有收放针的部位可拆成多段，用各段平均宽度计算。",
          )}
        </p>
        {s.sections.map((r, i) => (
          <div className="wb-section" key={i}>
            <div className="wb-fields">
              <Field label={t("Section", "部位")}>
                <input
                  value={r.name}
                  onChange={(e) => section(i, { name: e.target.value })}
                />
              </Field>
              {(["width", "length", "count", "repeat", "offset"] as const).map(
                (key, j) => (
                  <NumberField
                    key={key}
                    label={
                      [
                        t("Finished width (cm)", "成品宽度（厘米）"),
                        t("Finished length (cm)", "成品长度（厘米）"),
                        t("Pieces", "件数"),
                        t("Multiple of", "花样针数倍数"),
                        t("Plus stitches", "另加针数"),
                      ][j]
                    }
                    value={r[key]}
                    onChange={(value) => section(i, { [key]: value })}
                    min={key === "offset" ? 0 : 1}
                  />
                ),
              )}
              <Field label={t("Stitch structure", "组织")}>
                <select
                  value={r.structure}
                  onChange={(e) => {
                    const structure = e.target.value as keyof typeof STRUCTURES;
                    section(i, { structure, ratio: STRUCTURES[structure] });
                  }}
                >
                  {Object.entries(structures).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <NumberField
                label={t("Yarn take-up ratio", "用线系数")}
                value={r.ratio}
                min={0.01}
                onChange={(ratio) => section(i, { ratio })}
              />
            </div>
            {result && (
              <p className="wb-calculation">
                <strong>
                  {result.rows[i].patternStitches} → {result.rows[i].stitches}{" "}
                  {t("stitches", "针")} · {result.rows[i].patternRowCount} →{" "}
                  {result.rows[i].rows} {t("rows", "行")}
                </strong>{" "}
                · {t("Pre-wash length", "洗前长度")}{" "}
                {result.rows[i].preWashLength.toFixed(1)} cm ·{" "}
                {result.rows[i].meters.toFixed(1)} m ·{" "}
                {result.rows[i].grams.toFixed(1)} g
              </p>
            )}
            <button
              className="button quiet"
              disabled={s.sections.length <= 1}
              onClick={() =>
                set({ sections: s.sections.filter((_, j) => i !== j) })
              }
            >
              {t("Remove section", "删除部位")}
            </button>
          </div>
        ))}
        <button
          className="button"
          onClick={() =>
            set({
              sections: [
                ...s.sections,
                {
                  name: "",
                  width: 30,
                  length: 10,
                  count: 1,
                  repeat: 4,
                  offset: 0,
                  structure: "stockinette",
                  ratio: 1,
                },
              ],
            })
          }
        >
          {t("Add section", "新增部位")}
        </button>
      </section>
      <section className="wb-panel">
        <h2>{t("Keep the calculation", "保存计算结果")}</h2>
        <ExportBar
          name="knit-calculation.json"
          content={JSON.stringify(report, null, 2)}
          disabled={!result}
        />
        <ExportBar name="knit-sections.csv" content={csv} disabled={!result} />
        <details>
          <summary>
            {t("Import saved calculation JSON", "导入已保存的 JSON 计算文件")}
          </summary>
          <TextImport
            label={t("Saved calculation JSON", "计算文件 JSON")}
            accept=".json"
            value={importText}
            onChange={setImportText}
          />
          <button
            className="button"
            onClick={() => {
              try {
                const parsed = JSON.parse(importText);
                const next = parsed.assumptions?.settings ?? parsed;
                calculateKnit(next);
                set(next);
                setImportError(false);
              } catch {
                setImportError(true);
              }
            }}
          >
            {t("Restore calculation", "恢复这份计算")}
          </button>
          {importError && (
            <p role="alert">
              {t(
                "This is not a valid knitting calculation file.",
                "这不是有效的编织计算文件，请检查内容。",
              )}
            </p>
          )}
        </details>
      </section>
      <LocalStatus stored={stored} />
    </ToolShell>
  );
}
