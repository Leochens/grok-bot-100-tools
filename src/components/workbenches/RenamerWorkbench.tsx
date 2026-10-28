"use client";
import { tools } from "@/data/tools";
import {
  PHOTO_SAMPLE,
  parsePhotoList,
  planRenames,
  renameScript,
  type RenameRow,
} from "@/lib/engines/renamer";
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
const initial = {
  raw: "",
  pattern: "{event}_{seq:03d}_{date}",
  event: "Workshop",
  start: 1,
  sort: false,
  shell: "bash" as "bash" | "powershell",
};
export function RenamerWorkbench() {
  const { t } = useLanguage(),
    {
      state: s,
      set,
      reset,
      stored,
    } = useLocalDraft("one-hundred:renamer:v1", initial);
  let rows: RenameRow[] = [],
    error = "",
    script = "",
    undo = "";
  try {
    rows = planRenames(
      parsePhotoList(s.raw),
      s.pattern,
      s.event,
      s.start,
      s.sort,
    );
    if (
      rows.length &&
      !rows.some((r) => r.issues.some((i) => i !== "timestamp-order"))
    ) {
      script = renameScript(rows, s.shell);
      undo = renameScript(rows, s.shell, true);
    }
  } catch (e) {
    error = (e as Error).message;
  }
  const issues: Record<string, string> = {
    illegal: t(
      "Illegal OS filename / path or reserved device name",
      "含非法字符、路径或系统保留名称",
    ),
    collision: t(
      "Duplicate destination (case-insensitive)",
      "目标重名（忽略大小写）",
    ),
    occupied: t(
      "Destination is an existing selected source",
      "目标占用其他所选源文件名",
    ),
    "case-only": t(
      "Case-only rename is not portable",
      "仅大小写变化不适用于所有系统",
    ),
    "duplicate-source": t(
      "Duplicate source name; use files from one folder",
      "源文件重名；请仅选择同一文件夹的文件",
    ),
    "timestamp-order": t(
      "Timestamp is earlier than previous row",
      "时间戳早于上一行",
    ),
  };
  return (
    <ToolShell
      tool={tools.find((x) => x.day === 11)!}
      onSample={() => set({ ...initial, raw: PHOTO_SAMPLE })}
      onReset={reset}
    >
      <div className="wb-layout">
        <section className="wb-panel">
          <h2>
            {t("1. Select files or paste metadata", "1. 选择文件或粘贴元数据")}
          </h2>
          <FileDrop
            accept="*/*"
            label={t(
              "Photo files (names and last-modified timestamps only)",
              "照片文件（仅读取名称和修改时间）",
            )}
            onFiles={(files) => {
              if (files.some((f) => /[\t\r\n]/.test(f.name)))
                throw new Error("Filename contains a tab or newline");
              set({
                raw: files
                  .map(
                    (f) =>
                      f.name + "\t" + new Date(f.lastModified).toISOString(),
                  )
                  .join("\n"),
              });
            }}
          />
          <TextImport
            label={t(
              "One filename + TAB + ISO timestamp per line",
              "每行：文件名 + 制表符 + ISO 时间戳",
            )}
            value={s.raw}
            onChange={(raw) => set({ raw })}
            accept=".tsv,.txt"
          />
          <p>
            {t(
              "File timestamps are filesystem last-modified times, not EXIF capture dates. Paste capture metadata to use EXIF dates. Dates in the pattern use UTC. Run scripts in the source folder; files are never uploaded or renamed by this page.",
              "文件时间为文件系统修改时间。若需 EXIF 拍摄时间，请粘贴拍摄元数据。日期使用 UTC。脚本需在源文件夹运行；此页面不会上传或直接修改文件。",
            )}
          </p>
        </section>
        <section className="wb-panel">
          <h2>{t("2. Define the naming pattern", "2. 设置命名模式")}</h2>
          <Field label={t("Filename pattern", "文件名模式")}>
            <input
              value={s.pattern}
              onChange={(e) => set({ pattern: e.target.value })}
            />
          </Field>
          <p>
            <code>{"{event}_{seq:03d}_{date}"}</code> · <code>{"{name}"}</code>{" "}
            · <code>{"{ext}"}</code>
          </p>
          <p>
            {t(
              "The original extension is appended unless {ext} is used. Names stay in the same folder.",
              "未使用 {ext} 时会自动保留原扩展名。文件留在原文件夹中。",
            )}
          </p>
          <Field label={t("Event name", "活动名称")}>
            <input
              value={s.event}
              onChange={(e) => set({ event: e.target.value })}
            />
          </Field>
          <NumberField
            label={t("Starting sequence", "起始序号")}
            min={0}
            step={1}
            value={s.start}
            onChange={(start) => set({ start })}
          />
          <label className="wb-check">
            <input
              type="checkbox"
              checked={s.sort}
              onChange={(e) => set({ sort: e.target.checked })}
            />
            {t("Sort chronologically before numbering", "按时间排序后编号")}
          </label>
          <Field label={t("Script platform", "脚本平台")}>
            <select
              value={s.shell}
              onChange={(e) => set({ shell: e.target.value as typeof s.shell })}
            >
              <option value="bash">Bash (mv -n)</option>
              <option value="powershell">PowerShell (Rename-Item)</option>
            </select>
          </Field>
          <BatchError code={error} />
        </section>
      </div>
      <section className="wb-panel">
        <h2>{t("3. Review destinations", "3. 核对目标名称")}</h2>
        <div className="wb-table-scroll">
          <table className="wb-table">
            <thead>
              <tr>
                <th>{t("Original", "原文件名")}</th>
                <th>{t("Destination", "新文件名")}</th>
                <th>{t("Checks", "检查结果")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.name}</td>
                  <td>{r.target}</td>
                  <td>
                    {r.issues.map((code) => (
                      <p key={code} className="wb-error">
                        {issues[code]}
                      </p>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ExportBar
          name={s.shell === "bash" ? "rename.sh" : "rename.ps1"}
          content={script}
          disabled={!script || !!error}
        />
        <ExportBar
          name={s.shell === "bash" ? "undo-rename.sh" : "undo-rename.ps1"}
          content={undo}
          disabled={!undo || !!error}
        />
        <ExportBar
          name="rename-manifest.csv"
          content={csvOutput([
            ["Original", "Destination", "Timestamp_UTC", "Issues"],
            ...rows.map((r) => [
              r.name,
              r.target,
              new Date(r.timestamp).toISOString(),
              r.issues.join(";"),
            ]),
          ])}
          disabled={!rows.length || !!error}
        />
        <details>
          <summary>{t("Preview executable script", "预览可执行脚本")}</summary>
          <pre className="wb-code">{script}</pre>
        </details>
      </section>
      <LocalStatus stored={stored} />
    </ToolShell>
  );
}
