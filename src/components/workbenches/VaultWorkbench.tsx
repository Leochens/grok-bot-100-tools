"use client";
import { useState } from "react";
import { tools } from "@/data/tools";
import {
  VAULT_SAMPLE,
  auditVault,
  convertFrontmatter,
  dataviewFields,
  vaultMarkdown,
  type VaultFile,
} from "@/lib/engines/vault";
import { zipFiles } from "@/lib/engines/zip";
import { ToolShell } from "../ToolShell";
import { useLanguage } from "../LanguageProvider";
import {
  download,
  ExportBar,
  Field,
  LocalStatus,
  TextImport,
  useLocalDraft,
} from "./shared";
import { BatchError, FileDrop, localFilePath } from "./batch-shared";
const initial = { bundle: "", selected: "", filter: "issues" };
export function VaultWorkbench() {
  const { t } = useLanguage(),
    {
      state: s,
      set,
      reset,
      stored,
    } = useLocalDraft("one-hundred:vault:v1", initial),
    [error, setError] = useState("");
  let audit: ReturnType<typeof auditVault> | undefined,
    parseError = "";
  try {
    const files: unknown = s.bundle.trim() ? JSON.parse(s.bundle) : [];
    if (
      !Array.isArray(files) ||
      !files.every(
        (f) => f && typeof f.path === "string" && typeof f.content === "string",
      )
    )
      throw new Error("bundle");
    audit = auditVault(files as VaultFile[]);
  } catch (e) {
    parseError = (e as Error).message;
  }
  const selected =
    audit?.notes.find((n) => n.path === s.selected) || audit?.notes[0];
  const status: Record<string, string> = {
    ok: t("Resolved", "有效"),
    missing: t("Missing", "缺失"),
    case: t("Case mismatch", "大小写不一致"),
    alias: t(
      "Alias target — prefer canonical path",
      "别名目标，建议使用规范路径",
    ),
    ambiguous: t("Ambiguous name", "名称有歧义"),
    anchor: t("Missing heading", "标题锚点不存在"),
  };
  const store = (files: VaultFile[]) =>
    set({ bundle: JSON.stringify(files, null, 2) });
  return (
    <ToolShell
      tool={tools.find((x) => x.day === 13)!}
      onSample={() => {
        set({ ...initial, bundle: JSON.stringify(VAULT_SAMPLE, null, 2) });
        setError("");
      }}
      onReset={() => {
        reset();
        setError("");
      }}
    >
      <div className="wb-layout">
        <section className="wb-panel">
          <h2>{t("1. Open a Markdown vault", "1. 打开 Markdown 笔记库")}</h2>
          <FileDrop
            accept=".md"
            folder
            label={t(
              "Drop Markdown files or a vault folder",
              "拖入 Markdown 文件或笔记库文件夹",
            )}
            onFiles={async (files) => {
              const md = files.filter((f) =>
                f.name.toLowerCase().endsWith(".md"),
              );
              let records = await Promise.all(
                md.map(async (f) => ({
                  path: localFilePath(f),
                  content: await f.text(),
                })),
              );
              const roots = new Set(records.map((f) => f.path.split("/")[0]));
              if (
                roots.size === 1 &&
                records.every((f) => f.path.includes("/"))
              )
                records = records.map((f) => ({
                  ...f,
                  path: f.path.split("/").slice(1).join("/"),
                }));
              auditVault(records);
              store(records);
            }}
          />
          <TextImport
            label={t(
              'Multi-note JSON bundle: [{"path":"Note.md","content":"..."}]',
              '多笔记 JSON：[{"path":"Note.md","content":"..."}]',
            )}
            accept=".json"
            value={s.bundle}
            onChange={(bundle) => set({ bundle })}
          />
          <p>
            {t(
              "Folder paths are preserved. Audit scope is the imported Markdown files; attachments and external URLs are skipped. Notes without incoming links are listed as orphans.",
              "保留文件夹路径。仅审计已导入的 Markdown 文件，跳过附件与外部网址。孤立笔记指没有其他笔记链接指向的笔记。",
            )}
          </p>
          <BatchError code={parseError || error} />
        </section>
        <section className="wb-panel">
          <h2>
            {t("2. Missing targets grouped by name", "2. 按目标汇总缺失链接")}
          </h2>
          {audit && (
            <>
              <p>
                {audit.notes.length} {t("notes", "篇笔记")} ·{" "}
                {audit.links.length} {t("links", "条链接")} ·{" "}
                {Object.keys(audit.missing).length}{" "}
                {t("missing targets", "个缺失目标")}
              </p>
              {Object.entries(audit.missing)
                .sort((a, b) => b[1].length - a[1].length)
                .map(([target, sources]) => (
                  <div key={target}>
                    <strong>{target}</strong> × {sources.length}
                    <p>{[...new Set(sources)].join(", ")}</p>
                  </div>
                ))}
              <h3>{t("Notes without incoming links", "无入链笔记")}</h3>
              <p>{audit.orphans.join(", ") || t("None", "无")}</p>
              <ExportBar
                name="vault-audit.json"
                content={JSON.stringify(audit, null, 2)}
                disabled={!audit.notes.length}
              />
              <ExportBar
                name="vault-audit.md"
                content={vaultMarkdown(audit)}
                disabled={!audit.notes.length}
              />
              <ExportBar
                name="vault-bundle.json"
                content={s.bundle}
                disabled={!audit.notes.length}
              />
            </>
          )}
        </section>
      </div>
      {audit && (
        <>
          <section className="wb-panel">
            <h2>{t("Link resolution details", "链接解析详情")}</h2>
            <Field label={t("Show links", "显示链接")}>
              <select
                value={s.filter}
                onChange={(e) => set({ filter: e.target.value })}
              >
                <option value="issues">{t("Issues only", "仅问题")}</option>
                <option value="all">{t("All links", "全部链接")}</option>
              </select>
            </Field>
            <div className="wb-table-scroll">
              <table className="wb-table">
                <thead>
                  <tr>
                    {[
                      t("Source", "来源"),
                      t("Target", "目标"),
                      t("Resolution", "解析结果"),
                      t("Status", "状态"),
                    ].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {audit.links
                    .filter((l) => s.filter === "all" || l.status !== "ok")
                    .map((l, i) => (
                      <tr key={i}>
                        <td>{l.source}</td>
                        <td>{l.target}</td>
                        <td>{l.resolved || "—"}</td>
                        <td>{status[l.status]}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="wb-panel">
            <h2>
              {t(
                "3. Inspect metadata & convert Dataview fields",
                "3. 检查元数据并转换 Dataview 字段",
              )}
            </h2>
            <Field label={t("Selected note", "选择笔记")}>
              <select
                value={selected?.path || ""}
                onChange={(e) => set({ selected: e.target.value })}
              >
                {audit.notes.map((n) => (
                  <option key={n.path}>{n.path}</option>
                ))}
              </select>
            </Field>
            {selected && (
              <>
                <p>
                  {t("Title", "标题")}: {selected.title} ·{" "}
                  {t("Aliases", "别名")}: {selected.aliases.join(", ")} ·{" "}
                  {t("Tags", "标签")}: {selected.tags.join(", ")}
                </p>
                <pre className="wb-code">
                  {JSON.stringify(dataviewFields(selected), null, 2)}
                </pre>
                {selected.warnings.map((w) => (
                  <p key={w} role="alert">
                    {t(
                      "Invalid or unclosed YAML; correct the note before conversion.",
                      "YAML 格式损坏或未闭合，请修正后再转换。",
                    )}{" "}
                    {w}
                  </p>
                ))}
                <Field label={t("Edit note Markdown", "编辑笔记 Markdown")}>
                  <textarea
                    value={selected.content}
                    onChange={(e) =>
                      store(
                        audit.notes.map((n) => ({
                          path: n.path,
                          content:
                            n.path === selected.path
                              ? e.target.value
                              : n.content,
                        })),
                      )
                    }
                  />
                </Field>
                <p>
                  {t(
                    "Inline Key:: Value lines become YAML fields. Existing YAML values take priority. Code blocks stay intact. Review the converted output before replacing notes.",
                    "将行内 Key:: Value 转为 YAML 字段，已有 YAML 值优先保留。保留代码块。替换笔记前请核对转换结果。",
                  )}
                </p>
                <ExportBar
                  name={selected.path.split("/").pop()!}
                  content={
                    selected.warnings.length ? "" : convertFrontmatter(selected)
                  }
                  disabled={!!selected.warnings.length}
                />
              </>
            )}
            <button
              className="button primary"
              disabled={
                !audit.notes.length ||
                audit.notes.some((n) => !!n.warnings.length)
              }
              onClick={() => {
                try {
                  download(
                    "converted-vault.zip",
                    zipFiles(
                      audit.notes.map((n) => ({
                        name: n.path,
                        content: convertFrontmatter(n),
                      })),
                    ),
                    "application/zip",
                  );
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              {t("Download converted Markdown ZIP", "下载转换后 Markdown ZIP")}
            </button>
          </section>
        </>
      )}
      <LocalStatus stored={stored} />
    </ToolShell>
  );
}
