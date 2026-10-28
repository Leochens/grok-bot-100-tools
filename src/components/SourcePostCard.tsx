"use client";
import {
  ArrowUpRight,
  MessageCircle,
  Repeat2,
  Heart,
  ChartNoAxesColumn,
} from "lucide-react";
import {
  cardMetadata,
  type SourceCardMetadata,
  type SourcePostLink,
} from "@/data/source-types";
import type { ToolEntry } from "@/data/tools";
import { useLanguage } from "./LanguageProvider";
type Props = {
  variant: "compact" | "full";
  tool?: ToolEntry;
  post?: SourcePostLink;
  metadata?: SourceCardMetadata;
};
export function SourcePostCard({ variant, tool, post, metadata }: Props) {
  const { language, t } = useLanguage();
  const p = post ?? tool?.sourcePosts.find((p) => p.url === tool.sourceUrl);
  if (!p) return null;
  const m = metadata ?? (tool ? tool.sourceCard : cardMetadata(p));
  const count = (n: number | undefined) =>
    n === undefined
      ? "—"
      : new Intl.NumberFormat(language === "zh" ? "zh-CN" : "en", {
          notation: "compact",
        }).format(n);
  const quote = language === "zh" ? p.quoteZh : p.quote;
  const date =
    p.date === "Date not verified"
      ? t("Date not verified", "日期未核实")
      : p.date === "See original for date"
        ? t("See original for date", "具体日期见原帖")
        : p.date;
  const author =
    p.author === "Reddit contributor"
      ? t("Author: see original", "作者见原帖")
      : p.author;
  const context =
    p.context === "summary"
      ? t("Thread summary", "讨论摘要")
      : p.context === "title"
        ? t("Thread title", "原帖标题")
        : p.context === "related"
          ? t("Related workflow reference", "相关工作流参考")
          : t("Post excerpt", "帖文节选");
  return (
    <article
      className={`source-post-card source-${p.platform.toLowerCase()} source-${variant}`}
      onClick={(e) => e.stopPropagation()}
    >
      {p.platform === "X" ? (
        <>
          <header className="post-header">
            <span className="post-avatar" aria-hidden="true">
              {m.displayName.replace(/^@/, "").slice(0, 2).toUpperCase()}
            </span>
            <div>
              <strong>{m.displayName}</strong>
              <span>
                {m.handle} · <time>{date}</time>
              </span>
            </div>
            <span className="post-x-mark" aria-label="X">
              𝕏
            </span>
          </header>
          <p className="post-context">
            {context}
            {language === "zh" ? t("", " · 中文翻译") : ""}
          </p>
          <p className="post-body">{quote}</p>
          <div className="x-metrics">
            <span>
              <MessageCircle size={14} />
              {count(m.replies)}
              <small>{t("Replies", "回复")}</small>
            </span>
            <span>
              <Repeat2 size={14} />
              {count(m.reposts)}
              <small>{t("Reposts", "转发")}</small>
            </span>
            <span>
              <Heart size={14} />
              {count(m.likes)}
              <small>{t("Likes", "喜欢")}</small>
            </span>
            <span>
              <ChartNoAxesColumn size={14} />
              {count(m.views)}
              <small>{t("Views", "浏览")}</small>
            </span>
          </div>
        </>
      ) : (
        <>
          <header className="reddit-post-header">
            <span className="subreddit-pill">
              {m.subreddit ?? p.handleOrSubreddit}
            </span>
            <span>
              {author} · <time>{date}</time>
            </span>
          </header>
          <span className="reddit-flair">
            {language === "zh" ? m.flairZh : m.flair}
          </span>
          <h4>{language === "zh" ? m.titleZh : m.title}</h4>
          <p className="post-context">{context}</p>
          {p.context !== "title" && <p className="post-body">{quote}</p>}
          <div className="reddit-metrics">
            <span>
              ⬆ {count(m.upvotes)} {t("upvotes", "赞")} ⬇
            </span>
            <span>
              💬 {count(m.comments)} {t("comments", "评论")}
            </span>
          </div>
        </>
      )}
      <footer className="post-footer">
        <small>
          {t("Engagement unavailable · see original", "互动数未核实，详见原帖")}
        </small>
        <a
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          className="post-source-link"
        >
          {t(`Open original ${p.platform} post`, `直达 ${p.platform} 原帖`)}
          <ArrowUpRight size={16} />
        </a>
      </footer>
      {variant === "full" && p.verification === "brief" && (
        <p className="post-provenance">
          {t(
            "Link and excerpt supplied in the project brief; X could not be independently retrieved.",
            "链接和节选由项目提供，暂未能独立读取 X 帖文。",
          )}
        </p>
      )}
    </article>
  );
}
