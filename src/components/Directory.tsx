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
import { tools, roadmap, formatDay, type ToolEntry } from "@/data/tools";
import { SiteHeader, Footer } from "./Brand";
import { OriginalPostModal } from "./OriginalPostModal";

export function Directory() {
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
  const [selected, setSelected] = useState<ToolEntry | null>(null);
  const slots = roadmap.filter((slot) => {
    if (tier !== "all" && tier !== slot.tier) return false;
    if (!slot.tool)
      return upcoming && source === "all" && !search.trim() && !audience.trim();
    return (
      (source === "all" || source === slot.tool.sourcePlatform) &&
      slot.tool.nicheAudience
        .toLowerCase()
        .includes(audience.trim().toLowerCase()) &&
      [
        slot.tool.title,
        slot.tool.painPoint,
        slot.tool.nicheAudience,
        slot.tool.originalComplaint,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search.trim().toLowerCase())
    );
  });
  const preview = slots.slice(0, 5);
  const nextWeekly = slots.find(
    (slot) => slot.tier === "weekly" && slot.status === "upcoming",
  );
  if (
    nextWeekly &&
    preview.length === 5 &&
    !preview.some((slot) => slot.tier === "weekly")
  )
    preview[4] = nextWeekly;
  const visible = expanded ? slots : preview;
  const built = tools.length;
  return (
    <div className="site-wrap">
      <SiteHeader />
      <main>
        <section className="hero">
          <div className="hero-main">
            <span className="eyebrow">
              <span className="status-dot" /> THE INTERNET HAS ENOUGH BIG APPS.
            </span>
            <h1>
              Small tools.
              <br />
              <em>Specific problems.</em>
              <span className="hero-star">✳</span>
            </h1>
            <p>
              One real frustration. One thoughtfully small solution.
              <br />
              100 local-first tools, built in public over 100 days.
            </p>
            <a href="#directory" className="hero-link">
              Find your small fix <ArrowDown size={16} />
            </a>
          </div>
          <aside className="manifesto">
            <span className="mono">
              A LITTLE LESS SOFTWARE.
              <br />A LITTLE MORE USEFUL.
            </span>
            <div className="manifesto-number">
              100
              <span>
                tools.
                <br />
                zero noise.
              </span>
            </div>
            <div className="manifesto-row">
              <ShieldCheck size={17} />
              <span>Your data stays on your device</span>
            </div>
            <div className="manifesto-row">
              <Globe2 size={17} />
              <span>No accounts. No API keys.</span>
            </div>
            <div className="manifesto-row">
              <Zap size={17} />
              <span>Open it. Use it. Get on with it.</span>
            </div>
          </aside>
        </section>
        <section className="progress-panel" aria-label="100-day progress">
          <div className="progress-heading">
            <div>
              <span className="eyebrow">THE 100-DAY FIELDWORK</span>
              <h2>
                Day {built}
                <span> / 100 Built</span>
                <span className="live-badge">
                  <span className="status-dot" /> IN PROGRESS
                </span>
              </h2>
            </div>
            <div className="schedule">
              <span>
                <Clock3 size={14} /> DAILY 03:00 AM{" "}
                <span className="muted">ASIA/SHANGHAI</span>
              </span>
              <span>
                <CalendarDays size={14} /> EVERY 7TH DAY{" "}
                <span className="muted">WEEKLY MEDIUM-SCALE TOOL</span>
              </span>
            </div>
          </div>
          <div className="progress-grid">
            {roadmap.map((slot) => (
              <button
                key={slot.day}
                aria-label={`Day ${formatDay(slot.day)}: ${slot.status}, ${slot.tier === "weekly" ? "weekly medium-scale" : "daily"}`}
                title={`Day ${formatDay(slot.day)} · ${slot.status} · ${slot.tier}`}
                className={`progress-slot ${slot.status} ${slot.tier}`}
                onClick={() => {
                  if (slot.tool) setSelected(slot.tool);
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
              <i className="legend-dot built" /> BUILT{" "}
              <i className="legend-dot" /> UPCOMING{" "}
              <i className="legend-dot weekly" /> WEEKLY MEDIUM
            </span>
            <span>
              {100 - built} GOOD PROBLEMS TO GO <ArrowUpRight size={13} />
            </span>
          </div>
        </section>
        <section id="directory" className="directory-section">
          <div className="section-heading">
            <h2>
              The tool directory<span>({String(built).padStart(2, "0")})</span>
            </h2>
            <span className="mono">REAL PEOPLE. REAL PAIN POINTS.</span>
          </div>
          <div className="filter-panel">
            <div className="search-input">
              <Search size={18} />
              <input
                ref={searchRef}
                aria-label="Search tools"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="A tool for that one thing…"
              />
              <kbd>/</kbd>
            </div>
            <div className="filter-select">
              <SlidersHorizontal size={15} />
              <select
                aria-label="Filter by source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                <option value="all">All sources</option>
                <option value="X">X</option>
                <option value="Reddit">Reddit</option>
              </select>
            </div>
            <input
              className="audience-input"
              aria-label="Filter by niche audience"
              placeholder="Niche audience…"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
            />
          </div>
          <div className="filter-bottom">
            <div className="tier-tabs" aria-label="Filter by tier">
              {[
                ["all", "All tools"],
                ["daily", "Daily Micro-Tool"],
                ["weekly", "Weekly Medium-Scale Tool"],
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
              Show upcoming slots
            </label>
          </div>
          <div className="tool-grid">
            {visible.map((slot) =>
              slot.tool ? (
                <article
                  key={slot.day}
                  className="tool-card built-card"
                  id={`slot-${slot.day}`}
                  onClick={() => setSelected(slot.tool!)}
                >
                  <div className="card-top">
                    <span className="mono">
                      DAY {formatDay(slot.day)}{" "}
                      <span className="card-divider">/</span>{" "}
                      <span className="green-text">BUILT & READY</span>
                    </span>
                    <span className="badge daily">
                      <Zap size={11} /> Daily
                    </span>
                  </div>
                  <div className="tool-card-content">
                    <div className="tool-icon">
                      <Command size={25} />
                    </div>
                    <span className="eyebrow">WHAT WAS BUILT</span>
                    <h3>
                      {slot.tool.title}
                      <MoveUpRight size={25} />
                    </h3>
                    <span className="niche-badge">
                      {slot.tool.nicheAudience}
                    </span>
                    <p className="card-summary">{slot.tool.summary}</p>
                    <div className="subtitle-mini" aria-hidden="true">
                      <div>
                        <span>00:04,200 → 00:06,100</span>
                        <span className="mini-error">24.2 CPS</span>
                      </div>
                      <p>
                        Some subtitles move a little too fast.
                        <br />
                        <span>Let’s give every word room to breathe.</span>
                      </p>
                      <div className="mini-meter">
                        <i />
                      </div>
                      <span className="mini-label">
                        SPOT THE RED. FIND THE BALANCE.
                      </span>
                    </div>
                    <div className="card-source">
                      <span className="badge reddit">r/</span>
                      <span>
                        {slot.tool.sourceAuthor}
                        <small>{slot.tool.sourceDate} · SOURCE</small>
                      </span>
                    </div>
                    <blockquote>
                      <span className="quote-mark">“</span>
                      <span>{slot.tool.originalComplaint}</span>
                    </blockquote>
                  </div>
                  <div className="card-actions">
                    <button
                      className="inspect-link"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(slot.tool!);
                      }}
                    >
                      Inspect Original Post & Analysis <Plus size={14} />
                    </button>
                    <Link
                      className="button primary"
                      href={`/tools/${slot.tool.slug}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Open Tool <ArrowRight size={16} />
                    </Link>
                  </div>
                </article>
              ) : (
                <article
                  key={slot.day}
                  id={`slot-${slot.day}`}
                  className={`tool-card upcoming-card ${slot.tier === "weekly" ? "weekly-card" : ""}`}
                >
                  <div className="card-top">
                    <span className="mono">DAY {formatDay(slot.day)}</span>
                    <span
                      className={`badge ${slot.tier === "weekly" ? "weekly" : "pending"}`}
                    >
                      {slot.tier === "weekly" ? "Weekly Medium" : "Daily"}
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
                        ? "ROOM TO GO A LITTLE DEEPER"
                        : "A NEW DAY. A NEW NICHE."}
                    </span>
                    <h3>
                      {slot.tier === "weekly"
                        ? "A bigger small idea."
                        : "The next small fix."}
                    </h3>
                    <p>
                      {slot.tier === "weekly"
                        ? "Every seventh day, a more involved workflow gets the same thoughtful treatment."
                        : "Another real frustration waiting for a focused solution. Audience & source to be discovered."}
                    </p>
                  </div>
                  <div className="upcoming-footer mono">
                    <span className="status-dot pending-dot" /> UPCOMING{" "}
                    <span>
                      {slot.tier === "weekly"
                        ? "MEDIUM-SCALE BUILD"
                        : "RESEARCH → BUILD → SHIP"}
                    </span>
                  </div>
                </article>
              ),
            )}
          </div>
          {slots.length === 0 && (
            <div className="empty-state">
              <Search size={28} />
              <h3>No tools in this corner. Yet.</h3>
              <p>Try another audience or source, or include upcoming slots.</p>
              <button
                className="button"
                onClick={() => {
                  setTier("all");
                  setSource("all");
                  setSearch("");
                  setAudience("");
                }}
              >
                Clear filters
              </button>
            </div>
          )}
          {slots.length > 5 && (
            <button
              className="roadmap-button"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded
                ? "Show fewer slots"
                : `Explore all ${slots.length} matching roadmap slots`}
              <ArrowDown size={16} className={expanded ? "rotate-180" : ""} />
            </button>
          )}
          <div className="directory-note">
            <ShieldCheck size={16} />
            <p>Useful software doesn’t need your email. Or your data.</p>
            <span className="mono">LOCAL-FIRST. ALWAYS.</span>
          </div>
        </section>
      </main>
      <Footer />
      {selected && (
        <OriginalPostModal tool={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
