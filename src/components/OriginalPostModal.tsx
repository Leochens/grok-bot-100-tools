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
import { formatDay, type ToolEntry } from "@/data/tools";

export function OriginalPostModal({
  tool,
  onClose,
}: {
  tool: ToolEntry;
  onClose: () => void;
}) {
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
    [Users, "Target niche group", tool.requirementsAnalysis.who],
    [
      ScanLine,
      "Why existing tools failed",
      tool.requirementsAnalysis.whyExistingToolsFail,
    ],
    [
      Focus,
      "Single isolated pain point",
      tool.requirementsAnalysis.isolatedPainPoint,
    ],
    [
      ShieldCheck,
      "100% local-first architecture",
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
            FIELD NOTES / DAY {formatDay(tool.day)}
          </span>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close original post"
          >
            <X size={20} />
          </button>
        </div>
        <h2 id="source-title">
          A real frustration.
          <br />
          <em>A focused response.</em>
        </h2>
        <p className="muted">Original Post & Requirements Analysis</p>
        <div className="source-byline">
          <span className="badge reddit">Reddit</span>
          <span>{tool.sourceAuthor}</span>
          <span>{tool.sourceDate}</span>
        </div>
        <blockquote className="dialog-quote">
          “{tool.originalComplaint}”
        </blockquote>
        <details open className="original-context">
          <summary>Full original post & thread context</summary>
          <p className="whitespace-pre-line">{tool.originalPostFull}</p>
        </details>
        <a
          className="text-link"
          href={tool.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          View original {tool.sourcePlatform} post <ArrowUpRight size={15} />
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
          <span className="eyebrow">USER COMPLAINT & OPTIMIZATION HISTORY</span>
          {tool.optimizations.map((item, index) => (
            <div key={index}>
              <span className="mono">
                {item.date} / {item.source}
              </span>
              <h3>{item.complaint}</h3>
              <p>{item.resolution}</p>
            </div>
          ))}
        </section>
        <Link
          href={`/tools/${tool.slug}`}
          className="button primary dialog-launch"
          onClick={onClose}
        >
          Launch {tool.title}
          <ArrowRight size={17} />
        </Link>
      </div>
    </dialog>
  );
}
