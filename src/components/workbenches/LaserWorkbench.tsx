"use client";
import { tools } from "@/data/tools";
import {
  jointFit,
  measureKerf,
  kerfCoupon,
  type Fit,
} from "@/lib/engines/laser";
import { ToolShell } from "../ToolShell";
import { useLanguage } from "../LanguageProvider";
import {
  ExportBar,
  Field,
  LocalStatus,
  NumberField,
  useLocalDraft,
} from "./shared";
import { BatchError } from "./batch-shared";
const initial = {
  nominal: 20,
  measured: 19.84,
  cuts: 10,
  method: "external" as "external" | "internal" | "comb",
  thickness: 3,
  fit: "snug" as Fit,
  adjustment: 0,
  step: 0.05,
  count: 9,
};
export function LaserWorkbench() {
  const { t } = useLanguage(),
    {
      state: s,
      set,
      reset,
      stored,
    } = useLocalDraft("one-hundred:laser:v1", initial);
  let error = "",
    kerf = 0,
    result: ReturnType<typeof jointFit> | undefined,
    svg = "";
  try {
    kerf = measureKerf(s.nominal, s.measured, s.cuts, s.method);
    result = jointFit(s.thickness, kerf, s.fit, s.adjustment);
    svg = kerfCoupon(s.thickness, kerf, s.step, s.count);
  } catch (e) {
    error = (e as Error).message;
  }
  return (
    <ToolShell
      tool={tools.find((x) => x.day === 9)!}
      onSample={() => set(initial)}
      onReset={reset}
    >
      <div className="wb-layout">
        <section className="wb-panel">
          <h2>{t("1. Calibrate the cut", "1. 校准切缝")}</h2>
          <Field label={t("Measurement method", "测量方法")}>
            <select
              value={s.method}
              onChange={(e) =>
                set({ method: e.target.value as typeof s.method })
              }
            >
              <option value="external">
                {t(
                  "External square: nominal − measured",
                  "外部方块：标称 − 实测",
                )}
              </option>
              <option value="internal">
                {t(
                  "Internal hole: measured − nominal",
                  "内部孔洞：实测 − 标称",
                )}
              </option>
              <option value="comb">
                {t(
                  "N-cut strip: total width loss ÷ N",
                  "N 刀条带：总损失宽度 ÷ N",
                )}
              </option>
            </select>
          </Field>
          <p>
            {t(
              "For the N-cut test, sum all retained strip widths, without gaps, and enter the number of full-width kerfs removed. Each removed cut counts once.",
              "N 刀测试请将所有保留条带宽度相加，不留间隙，并填入完整切缝的数量。每道完整切缝计一次。",
            )}
          </p>
          <NumberField
            label={t("Nominal width (mm)", "标称宽度（mm）")}
            value={s.nominal}
            min={0.01}
            onChange={(nominal) => set({ nominal })}
          />
          <NumberField
            label={t("Measured width (mm)", "实测宽度（mm）")}
            value={s.measured}
            min={0.01}
            onChange={(measured) => set({ measured })}
          />
          {s.method === "comb" && (
            <NumberField
              label={t("Number of kerfs removed", "完整切缝数量")}
              value={s.cuts}
              min={1}
              step={1}
              onChange={(cuts) => set({ cuts })}
            />
          )}
          <h2>{t("2. Set joint fit", "2. 设置榫接配合")}</h2>
          <NumberField
            label={t("Material thickness (mm)", "材料厚度（mm）")}
            value={s.thickness}
            min={0.1}
            onChange={(thickness) => set({ thickness })}
          />
          <Field label={t("Fit", "配合方式")}>
            <select
              value={s.fit}
              onChange={(e) => set({ fit: e.target.value as Fit })}
            >
              <option value="press">
                {t("Press: −0.10 mm", "压入：−0.10 mm")}
              </option>
              <option value="snug">
                {t("Snug: 0.00 mm", "贴合：0.00 mm")}
              </option>
              <option value="slip">
                {t("Slip: +0.20 mm", "滑入：+0.20 mm")}
              </option>
            </select>
          </Field>
          <NumberField
            label={t("Extra total clearance (mm)", "额外总间隙（mm）")}
            value={s.adjustment}
            onChange={(adjustment) => set({ adjustment })}
          />
          <BatchError code={error} />
        </section>
        <section className="wb-panel">
          <h2>{t("Compensated drawing dimensions", "补偿后的绘图尺寸")}</h2>
          {result && (
            <>
              <p className="wb-big-number">
                {kerf.toFixed(3)} <small>mm {t("kerf", "切缝")}</small>
              </p>
              <p>
                {t("Draw tab width", "绘制榫头宽度")}:{" "}
                <strong>{result.tabDraw.toFixed(3)} mm</strong>
              </p>
              <p>
                {t("Draw slot width", "绘制槽口宽度")}:{" "}
                <strong>{result.slotDraw.toFixed(3)} mm</strong>
              </p>
              <p>
                {t("Finished tab / slot", "成品榫头 / 槽口")}:{" "}
                {result.tabFinished.toFixed(3)} /{" "}
                {result.slotFinished.toFixed(3)} mm
              </p>
              <p>
                {t(
                  "The tab loses one kerf in width; the slot gains one kerf. Disable additional cutter compensation. Clearance is total width, not per side.",
                  "榫头总宽减少一道切缝，槽口总宽增加一道切缝。请关闭软件中的额外补偿。间隙指总宽度，而非单侧。",
                )}
              </p>
            </>
          )}
          <NumberField
            label={t("Comb clearance step (mm)", "梳齿间隙步进（mm）")}
            min={0.001}
            value={s.step}
            onChange={(step) => set({ step })}
          />
          <NumberField
            label={t("Comb slot count (3–21)", "梳齿槽数（3–21）")}
            min={3}
            max={21}
            step={1}
            value={s.count}
            onChange={(count) => set({ count })}
          />
          <p>
            {t(
              "Coupon supports 0–8 mm material. Red geometry cuts; black labels engrave. Import SVG at 100% scale with mm units.",
              "试片支持 0–8 mm 厚材料。红色线条切割，黑色文字雕刻。请以 mm 单位和 100% 比例导入 SVG。",
            )}
          </p>
          <ExportBar
            name="kerf-gauge.svg"
            content={svg}
            mime="image/svg+xml"
            disabled={!!error}
          />
          <ExportBar
            name="joint-fit.json"
            content={JSON.stringify({ inputs: s, kerf, result }, null, 2)}
            disabled={!result}
          />
        </section>
      </div>
      {svg && (
        <section className="wb-panel">
          <h2>{t("Kerf comb & finger-joint coupon", "切缝梳尺与指接试片")}</h2>
          <div
            className="wb-svg-preview"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </section>
      )}
      <LocalStatus stored={stored} />
    </ToolShell>
  );
}
