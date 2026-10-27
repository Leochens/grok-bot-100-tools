"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  X,
  Users,
  ScanLine,
  Focus,
  ShieldCheck,
} from "lucide-react";
import { formatDay, localizeTool, type ToolEntry } from "@/data/tools";

import { useLanguage } from "./LanguageProvider";

export function OriginalPostModal({
  tool: originalTool,
  onClose,
}: {
  tool: ToolEntry;
  onClose: () => void;
}) {
  const { language, t } = useLanguage();
  const tool = localizeTool(originalTool, language);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  const analysis = [
    [Users, t("Target niche group", "给谁用"), tool.requirementsAnalysis.who],
    [
      ScanLine,
      t("Why existing tools failed", "现有工具哪里不顺手"),
      tool.requirementsAnalysis.whyExistingToolsFail,
    ],
    [
      Focus,
      t("Single isolated pain point", "这次只解决一个问题"),
      tool.requirementsAnalysis.isolatedPainPoint,
    ],
    [
      ShieldCheck,
      t("100% local-first architecture", "全程在本地，数据不外传"),
      tool.requirementsAnalysis.localFirstDesign,
    ],
  ] as const;
  return (
    <dialog
      ref={ref}
      className="source-dialog"
      aria-labelledby="source-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="dialog-inner">
        <div className="dialog-top">
          <span className="eyebrow">
            {t("FIELD NOTES / DAY", "造物笔记 / 第")} {formatDay(tool.day)}
            {t("", " 天")}
          </span>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label={t("Close original post", "关闭原帖")}
          >
            <X size={20} />
          </button>
        </div>
        <h2 id="source-title">
          {t("A real frustration.", "真实的烦恼，")}
          <br />
          <em>{t("A focused response.", "认真解决。")}</em>
        </h2>
        <p className="muted">
          {t("Original Post & Requirements Analysis", "原帖与需求分析")}
        </p>
        <div className="source-byline">
          <span className={`badge ${tool.sourcePlatform.toLowerCase()}`}>
            {tool.sourcePlatform}
          </span>
          <span>{tool.sourceAuthor}</span>
          <span>{tool.sourceDate}</span>
        </div>
        <blockquote className="dialog-quote">
          “{tool.originalComplaint}”
        </blockquote>
        <details open className="original-context">
          <summary>
            {t("Full original post & thread context", "原帖全文与讨论背景")}
          </summary>
          <p className="whitespace-pre-line">{tool.originalPostFull}</p>
        </details>
        <a
          className="text-link"
          href={tool.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          {t(
            `View original ${tool.sourcePlatform} post`,
            `前往 ${tool.sourcePlatform} 查看原帖`,
          )}{" "}
          <ArrowUpRight size={15} />
        </a>
        <div className="analysis-grid">
          {analysis.map(([Icon, title, body]) => (
            <section key={title}>
              <Icon size={18} />
              <h3>{title}</h3>
              <p>{body}</p>
            </section>
          ))}
        </div>
        <section className="history">
          <span className="eyebrow">
            {t("USER COMPLAINT & OPTIMIZATION HISTORY", "问题反馈与改进记录")}
          </span>
          {tool.optimizations.map((entry, index) => {
            const item = language === "zh" ? { ...entry, ...entry.zh } : entry;
            return (
              <div key={index}>
                <span className="mono">
                  {item.date} / {item.source}
                </span>
                <h3>{item.complaint}</h3>
                <p>{item.resolution}</p>
              </div>
            );
          })}
        </section>
        <Link
          href={`/tools/${tool.slug}`}
          className="button primary dialog-launch"
          onClick={onClose}
        >
          {t(`Launch ${tool.title}`, `打开${tool.title}`)}
          <ArrowRight size={17} />
        </Link>
      </div>
    </dialog>
  );
}
