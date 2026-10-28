"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Search,
  SlidersHorizontal,
  ShieldCheck,
  Globe2,
  Zap,
  Command,
  Clock3,
  Plus,
  CalendarDays,
  MoveUpRight,
} from "lucide-react";
import { tools, roadmap, formatDay, localizeTool } from "@/data/tools";
import { SiteHeader, Footer } from "./Brand";
import { SourcePostCard } from "./SourcePostCard";
import { OriginalPostModal } from "./OriginalPostModal";
import { useLanguage } from "./LanguageProvider";

export function Directory() {
  const { language, t } = useLanguage();
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        event.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) &&
        !target.isContentEditable &&
        !document.querySelector("dialog[open]")
      ) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const [tier, setTier] = useState("all");
  const [source, setSource] = useState("all");
  const [search, setSearch] = useState("");
  const [audience, setAudience] = useState("");
  const [upcoming, setUpcoming] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const slots = roadmap
    .filter((slot) => {
      if (tier !== "all" && tier !== slot.tier) return false;
      if (!slot.tool)
        return (
          upcoming && source === "all" && !search.trim() && !audience.trim()
        );
      if (slot.status === "upcoming" && !upcoming) return false;
      const copies = [slot.tool, slot.tool.zh];
      return (
        (source === "all" || source === slot.tool.sourcePlatform) &&
        copies
          .map((copy) => copy.nicheAudience)
          .join(" ")
          .toLowerCase()
          .includes(audience.trim().toLowerCase()) &&
        copies
          .flatMap((copy) => [
            copy.title,
            copy.painPoint,
            copy.summary,
            copy.nicheAudience,
            copy.originalComplaint,
          ])
          .join(" ")
          .toLowerCase()
          .includes(search.trim().toLowerCase())
      );
    })
    .map((slot) => ({
      ...slot,
      tool: slot.tool ? localizeTool(slot.tool, language) : undefined,
    }));
  const preview = slots.slice(0, 7);
  const nextWeekly = slots.find(
    (slot) => slot.tier === "weekly" && slot.status === "upcoming",
  );
  if (
    nextWeekly &&
    preview.length === 7 &&
    !preview.some((slot) => slot.tier === "weekly")
  )
    preview[6] = nextWeekly;
  const visible = expanded ? slots : preview;
  const built = tools.filter((tool) => tool.status === "built").length;
  return (
    <div className="site-wrap">
      <SiteHeader />
      <main>
        <section className="hero">
          <div className="hero-main">
            <span className="eyebrow">
              <span className="status-dot" />{" "}
              {t(
                "THE INTERNET HAS ENOUGH BIG APPS.",
                "大而全的应用已经够多了。",
              )}
            </span>
            <h1>
              {t("Small tools.", "工具小一点。")}
              <br />
              <em>{t("Specific problems.", "问题具体一点。")}</em>
              <span className="hero-star">✳</span>
            </h1>
            <p>
              {t(
                "One real frustration. One thoughtfully small solution.",
                "一个真实的烦恼，一个刚刚好的解法。",
              )}
              <br />
              {t(
                "100 local-first tools, built in public over 100 days.",
                "用 100 天，公开做出 100 个在本地运行的小工具。",
              )}
            </p>
            <a href="#directory" className="hero-link">
              {t("Find your small fix", "找个顺手的小工具")}{" "}
              <ArrowDown size={16} />
            </a>
          </div>
          <aside className="manifesto">
            <span className="mono">
              {t("A LITTLE LESS SOFTWARE.", "少一点软件负担，")}
              <br />
              {t("A LITTLE MORE USEFUL.", "多一点实际用处。")}
            </span>
            <div className="manifesto-number">
              100
              <span>
                {t("tools.", "个工具，")}
                <br />
                {t("zero noise.", "不添乱。")}
              </span>
            </div>
            <div className="manifesto-row">
              <ShieldCheck size={17} />
              <span>
                {t("Your data stays on your device", "数据留在自己的设备上")}
              </span>
            </div>
            <div className="manifesto-row">
              <Globe2 size={17} />
              <span>
                {t("No accounts. No API keys.", "不用注册，不用 API 密钥")}
              </span>
            </div>
            <div className="manifesto-row">
              <Zap size={17} />
              <span>
                {t("Open it. Use it. Get on with it.", "打开就用，用完接着忙")}
              </span>
            </div>
          </aside>
        </section>
        <section
          className="progress-panel"
          aria-label={t("100-day progress", "100 天造物进度")}
        >
          <div className="progress-heading">
            <div>
              <span className="eyebrow">
                {t("THE 100-DAY FIELDWORK", "100 天造物记录")}
              </span>
              <h2>
                {t(`Day ${built}`, `已完成 ${built}`)}
                <span>{t(" / 100 Built", " / 100 个工具")}</span>
                <span className="live-badge">
                  <span className="status-dot" /> {t("IN PROGRESS", "进行中")}
                </span>
              </h2>
            </div>
            <div className="schedule">
              <span>
                <Clock3 size={14} /> {t("DAILY 03:00 AM", "每日凌晨 03:00")}{" "}
                <span className="muted">{t("ASIA/SHANGHAI", "上海时间")}</span>
              </span>
              <span>
                <CalendarDays size={14} /> {t("EVERY 7TH DAY", "每逢第 7 天")}{" "}
                <span className="muted">
                  {t("WEEKLY MEDIUM-SCALE TOOL", "每周中型工具")}
                </span>
              </span>
            </div>
          </div>
          <div className="progress-grid">
            {roadmap.map((slot) => (
              <button
                key={slot.day}
                aria-label={t(
                  `Day ${formatDay(slot.day)}: ${slot.status}, ${slot.tier === "weekly" ? "weekly medium-scale" : "daily"}`,
                  `第 ${formatDay(slot.day)} 天：${slot.status === "built" ? "已上线" : "待构建"}，${slot.tier === "weekly" ? "每周中型工具" : "每日微工具"}`,
                )}
                title={t(
                  `Day ${formatDay(slot.day)} · ${slot.status} · ${slot.tier}`,
                  `第 ${formatDay(slot.day)} 天 · ${slot.status === "built" ? "已上线" : "待构建"} · ${slot.tier === "weekly" ? "每周中型工具" : "每日微工具"}`,
                )}
                className={`progress-slot ${slot.status} ${slot.tier}`}
                onClick={() => {
                  if (slot.tool) setSelected(slot.day);
                  else {
                    setUpcoming(true);
                    setExpanded(true);
                    setTier("all");
                    setSource("all");
                    setSearch("");
                    setAudience("");
                    requestAnimationFrame(() =>
                      document
                        .getElementById(`slot-${slot.day}`)
                        ?.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        }),
                    );
                  }
                }}
              />
            ))}
          </div>
          <div className="progress-legend mono">
            <span>
              <i className="legend-dot built" /> {t("BUILT", "已上线")}{" "}
              <i className="legend-dot" /> {t("UPCOMING", "待构建")}{" "}
              <i className="legend-dot weekly" />{" "}
              {t("WEEKLY MEDIUM", "每周中型工具")}
            </span>
            <span>
              {t(
                `${100 - built} GOOD PROBLEMS TO GO`,
                `还有 ${100 - built} 个问题等着解决`,
              )}{" "}
              <ArrowUpRight size={13} />
            </span>
          </div>
        </section>
        <section id="directory" className="directory-section">
          <div className="section-heading">
            <h2>
              {t("The tool directory", "工具目录")}
              <span>({String(built).padStart(2, "0")})</span>
            </h2>
            <span className="mono">
              {t("REAL PEOPLE. REAL PAIN POINTS.", "真人遇到的，真问题。")}
            </span>
          </div>
          <div className="filter-panel">
            <div className="search-input">
              <Search size={18} />
              <input
                ref={searchRef}
                aria-label={t("Search tools", "搜索工具")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t(
                  "A tool for that one thing…",
                  "你想解决什么小麻烦？",
                )}
              />
              <kbd>/</kbd>
            </div>
            <div className="filter-select">
              <SlidersHorizontal size={15} />
              <select
                aria-label={t("Filter by source", "按来源筛选")}
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                <option value="all">{t("All sources", "全部来源")}</option>
                <option value="X">{t("X", "来源：X")}</option>
                <option value="Reddit">{t("Reddit", "来源：Reddit")}</option>
              </select>
            </div>
            <input
              className="audience-input"
              aria-label={t("Filter by niche audience", "按使用人群筛选")}
              placeholder={t("Niche audience…", "谁会用到？")}
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
            />
          </div>
          <div className="filter-bottom">
            <div
              className="tier-tabs"
              aria-label={t("Filter by tier", "按工具规模筛选")}
            >
              {[
                ["all", t("All tools", "全部")],
                ["daily", t("Daily Micro-Tool", "每日微工具")],
                ["weekly", t("Weekly Medium-Scale Tool", "每周中型工具")],
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setTier(value)}
                  aria-pressed={tier === value}
                  className={tier === value ? "active" : ""}
                >
                  {label}
                  {value === "all" && <span>{built}</span>}
                </button>
              ))}
            </div>
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={upcoming}
                onChange={(e) => setUpcoming(e.target.checked)}
              />
              <span className="toggle" />
              {t("Show upcoming slots", "显示 100 天路线图")}
            </label>
          </div>
          <div className="tool-grid">
            {visible.map((slot) =>
              slot.tool ? (
                <article
                  key={slot.day}
                  className={`tool-card ${slot.status === "built" ? "built-card" : "upcoming-card planned-card"} ${slot.tier === "weekly" ? "weekly-card" : ""}`}
                  id={`slot-${slot.day}`}
                  onClick={() => setSelected(slot.day)}
                >
                  <div className="card-top">
                    <span className="mono">
                      {t("DAY", "第")} {formatDay(slot.day)}
                      {t("", " 天")} <span className="card-divider">/</span>{" "}
                      <span className="green-text">
                        {slot.status === "built"
                          ? t("BUILT & READY", "已上线，随时可用")
                          : t(
                              "RESEARCHED · LATER BATCH",
                              "已调研 · 后续批次构建",
                            )}
                      </span>
                    </span>
                    <span className={`badge ${slot.tier}`}>
                      <Zap size={11} />{" "}
                      {slot.tier === "daily"
                        ? t("Daily", "每日微工具")
                        : t("Weekly Medium", "每周中型工具")}
                    </span>
                  </div>
                  <div className="tool-card-content">
                    <div className="tool-icon">
                      <Command size={25} />
                    </div>
                    <span className="eyebrow">
                      {t("WHAT WAS BUILT", "做了什么")}
                    </span>
                    <h3>
                      {slot.tool.title}
                      <MoveUpRight size={25} />
                    </h3>
                    <span className="niche-badge">
                      {slot.tool.nicheAudience}
                    </span>
                    <p className="card-summary">{slot.tool.summary}</p>
                    <span className="eyebrow complaint-label">
                      {t(
                        "USER’S ORIGINAL COMPLAINT / WISH",
                        "用户当时的烦恼 / 愿望",
                      )}
                    </span>
                    <SourcePostCard tool={slot.tool} variant="compact" />
                    <button
                      className="similar-posts-badge"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(slot.day);
                      }}
                    >
                      {t(
                        `+${slot.tool.sourcePosts.length - 1} similar posts linked`,
                        `+${slot.tool.sourcePosts.length - 1} 条同款痛点原帖`,
                      )}
                    </button>
                  </div>
                  <div className="card-actions">
                    <button
                      className="inspect-link"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(slot.day);
                      }}
                    >
                      {t(
                        "Inspect Original Post & Analysis",
                        "查看原帖与需求分析",
                      )}{" "}
                      <Plus size={14} />
                    </button>
                    {slot.status === "built" && (
                      <Link
                        className="button primary"
                        href={`/tools/${slot.tool.slug}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {t("Open Tool", "打开工具")} <ArrowRight size={16} />
                      </Link>
                    )}
                  </div>
                </article>
              ) : (
                <article
                  key={slot.day}
                  id={`slot-${slot.day}`}
                  className={`tool-card upcoming-card ${slot.tier === "weekly" ? "weekly-card" : ""}`}
                >
                  <div className="card-top">
                    <span className="mono">
                      {t("DAY", "第")} {formatDay(slot.day)}
                      {t("", " 天")}
                    </span>
                    <span
                      className={`badge ${slot.tier === "weekly" ? "weekly" : "pending"}`}
                    >
                      {slot.tier === "weekly"
                        ? t("Weekly Medium", "每周中型工具")
                        : t("Daily", "每日微工具")}
                    </span>
                  </div>
                  <div className="upcoming-art" aria-hidden="true">
                    {slot.tier === "weekly" ? (
                      <span className="weekly-art">✳</span>
                    ) : (
                      <span className="crosshair">
                        <Plus size={35} strokeWidth={1} />
                      </span>
                    )}
                  </div>
                  <div className="upcoming-copy">
                    <span className="eyebrow">
                      {slot.tier === "weekly"
                        ? t(
                            "ROOM TO GO A LITTLE DEEPER",
                            "这次，把问题再挖深一点",
                          )
                        : t(
                            "A NEW DAY. A NEW NICHE.",
                            "新的一天，帮一群不同的人。",
                          )}
                    </span>
                    <h3>
                      {slot.tier === "weekly"
                        ? t("A bigger small idea.", "小想法，也能多做一点。")
                        : t("The next small fix.", "下一个小问题，等着解决。")}
                    </h3>
                    <p>
                      {slot.tier === "weekly"
                        ? t(
                            "Every seventh day, a more involved workflow gets the same thoughtful treatment.",
                            "每到第七天，留点时间，认真理顺一个更复杂的工作流程。",
                          )
                        : t(
                            "Another real frustration waiting for a focused solution. Audience & source to be discovered.",
                            "下一个真实的烦恼还在寻找中。先找到需要它的人，再动手做。",
                          )}
                    </p>
                  </div>
                  <div className="upcoming-footer mono">
                    <span className="status-dot pending-dot" />{" "}
                    {t("UPCOMING", "待构建")}{" "}
                    <span>
                      {slot.tier === "weekly"
                        ? t("MEDIUM-SCALE BUILD", "中型工具构建")
                        : t(
                            "RESEARCH → BUILD → SHIP",
                            "找问题 → 做工具 → 上线",
                          )}
                    </span>
                  </div>
                </article>
              ),
            )}
          </div>
          {slots.length === 0 && (
            <div className="empty-state">
              <Search size={28} />
              <h3>
                {t("No tools in this corner. Yet.", "暂时还没找到合适的工具。")}
              </h3>
              <p>
                {t(
                  "Try another audience or source, or include upcoming slots.",
                  "换个人群或来源试试，也可以看看接下来的计划。",
                )}
              </p>
              <button
                className="button"
                onClick={() => {
                  setTier("all");
                  setSource("all");
                  setSearch("");
                  setAudience("");
                }}
              >
                {t("Clear filters", "清除筛选")}
              </button>
            </div>
          )}
          {slots.length > 5 && (
            <button
              className="roadmap-button"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded
                ? t("Show fewer slots", "收起路线图")
                : t(
                    `Explore all ${slots.length} matching roadmap slots`,
                    `展开全部 ${slots.length} 个匹配的路线图位置`,
                  )}
              <ArrowDown size={16} className={expanded ? "rotate-180" : ""} />
            </button>
          )}
          <div className="directory-note">
            <ShieldCheck size={16} />
            <p>
              {t(
                "Useful software doesn’t need your email. Or your data.",
                "好用的工具，不用拿邮箱和数据来换。",
              )}
            </p>
            <span className="mono">
              {t("LOCAL-FIRST. ALWAYS.", "始终在本地运行。")}
            </span>
          </div>
        </section>
      </main>
      <Footer />
      {selected !== null && (
        <OriginalPostModal
          tool={tools.find((tool) => tool.day === selected)!}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
