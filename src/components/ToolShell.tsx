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
import { formatDay, localizeTool, type ToolEntry } from "@/data/tools";
import { SiteHeader, Footer } from "./Brand";
import { useLanguage } from "./LanguageProvider";
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
  const { language, t } = useLanguage();
  const copy = localizeTool(tool, language);
  const [sourceOpen, setSourceOpen] = useState(false);
  return (
    <div className="site-wrap tool-site">
      <SiteHeader />
      <main>
        <nav className="tool-nav" aria-label={t("Tool navigation", "工具导航")}>
          <Link href="/" className="back-link">
            <ArrowLeft size={15} />
            {t("Back to Directory", "返回工具目录")}
          </Link>
          <div className="tool-nav-badges">
            <span className="badge">
              {t("Day", "第")} {formatDay(tool.day)}
              {t("", " 天")}
            </span>
            <span className={`badge ${tool.tier}`}>
              {tool.tier === "daily"
                ? t("Daily", "每日微工具")
                : t("Weekly Medium", "每周中型工具")}
            </span>
            <span className="badge niche-nav">{copy.nicheAudience}</span>
          </div>
        </nav>
        <div className="tool-title-row">
          <div>
            <span className="eyebrow">
              {t("THE SMALL FIX / NO.", "今天解决的小问题 / 第")}{" "}
              {formatDay(tool.day)}
              {t("", " 号")}
            </span>
            <h1>
              {copy.title}
              <span className="green-text">.</span>
            </h1>
            <p>{copy.summary}</p>
          </div>
          <span className="local-seal">
            <ShieldCheck size={17} />
            {t("100% LOCAL-FIRST", "100% 本地运行")}
          </span>
        </div>
        <div className="tool-actions">
          <button className="button" onClick={() => setSourceOpen(true)}>
            <BookOpen size={15} />
            {t(
              `View Original ${tool.sourcePlatform} Post`,
              `查看 ${tool.sourcePlatform} 原帖`,
            )}
          </button>
          <div>
            <button className="button sample-button" onClick={onSample}>
              <FlaskConical size={15} />
              {t("Load Sample Data", "加载示例字幕")}
            </button>
            <button className="button quiet" onClick={onReset}>
              <RotateCcw size={14} />
              {t("Reset Local State", "重置本地数据")}
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
