"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  RotateCcw,
  FlaskConical,
  ShieldCheck,
} from "lucide-react";
import { formatDay, type ToolEntry } from "@/data/tools";
import { SiteHeader, Footer } from "./Brand";
import { OriginalPostModal } from "./OriginalPostModal";
export function ToolShell({
  tool,
  onSample,
  onReset,
  children,
}: {
  tool: ToolEntry;
  onSample: () => void;
  onReset: () => void;
  children: ReactNode;
}) {
  const [sourceOpen, setSourceOpen] = useState(false);
  return (
    <div className="site-wrap tool-site">
      <SiteHeader />
      <main>
        <nav className="tool-nav" aria-label="Tool navigation">
          <Link href="/" className="back-link">
            <ArrowLeft size={15} />
            Back to Directory
          </Link>
          <div className="tool-nav-badges">
            <span className="badge">Day {formatDay(tool.day)}</span>
            <span className={`badge ${tool.tier}`}>
              {tool.tier === "daily" ? "Daily" : "Weekly Medium"}
            </span>
            <span className="badge niche-nav">{tool.nicheAudience}</span>
          </div>
        </nav>
        <div className="tool-title-row">
          <div>
            <span className="eyebrow">
              THE SMALL FIX / NO. {formatDay(tool.day)}
            </span>
            <h1>
              {tool.title}
              <span className="green-text">.</span>
            </h1>
            <p>{tool.summary}</p>
          </div>
          <span className="local-seal">
            <ShieldCheck size={17} />
            100% LOCAL-FIRST
          </span>
        </div>
        <div className="tool-actions">
          <button className="button" onClick={() => setSourceOpen(true)}>
            <BookOpen size={15} />
            View Original {tool.sourcePlatform} Post
          </button>
          <div>
            <button className="button sample-button" onClick={onSample}>
              <FlaskConical size={15} />
              Load Sample Data
            </button>
            <button className="button quiet" onClick={onReset}>
              <RotateCcw size={14} />
              Reset Local State
            </button>
          </div>
        </div>
        {children}
      </main>
      <Footer />
      {sourceOpen && (
        <OriginalPostModal tool={tool} onClose={() => setSourceOpen(false)} />
      )}
    </div>
  );
}
