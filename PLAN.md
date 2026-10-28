# grok-bot-100-tools — Codex CLI Execution Plan & Architecture Brief

## 1. Mission & Overview
`grok-bot-100-tools` is an open-source, single-repo Vercel web project containing **100 local-first niche tools built over 100 days**.
- **Repository**: `https://github.com/Leochens/grok-bot-100-tools`
- **Deployment**: Single Vercel project connected directly by the repo owner (`main` branch auto-deploys).
- **Execution Engine**: **Codex CLI (`codex exec`) only**. Never use Grok Build, and bots must never hand-write application code directly—all scaffolding, daily tool builds, weekly medium builds, and iterative optimizations must be delegated to `codex exec` following this `PLAN.md`.

---

## 2. Application Structure (One Vercel Project)
- **Framework**: Next.js (App Router, TypeScript, Tailwind CSS) configured for clean zero-config deployment on Vercel.
- **Main Page (`/`) — Card-Grid Directory**:
  - Hero header showing the 100-Day progress counter (e.g., `Day X / 100`), filters (All / Daily Micro-Tool / Weekly Medium Tool, Source: X / Reddit, Audience Niche), and instant search.
  - Responsive **Card Grid** where each card displays:
    1. **What Was Built**: Tool name, Day badge (`Day 001`), tier badge (`Daily` or `Weekly Medium`), target niche group, and a crisp one-line summary of the single pain point solved.
    2. **Source**: Platform badge (`X` or `Reddit`), author/subreddit context, and date.
    3. **User's Original Complaint / Wish**: The authentic quote or distilled frustration from the original conversation.
    4. **Implemented Tool Action**: Direct link/button to open the tool subpage (`/tools/[slug]`).
  - **Clicking a Card**: Opens an **Original Post & Requirements Modal/Drawer** showing:
    - The full original X post or Reddit thread context and link/reference.
    - Requirements analysis: who the niche user is, why existing solutions failed them, and the exact single pain point isolated.
    - Iteration / complaint optimization log (if users later reported friction and the tool was refined).
    - Primary CTA button to launch `/tools/[slug]`.
- **Tool Subpages (`/tools/[slug]`)**:
  - Every daily or weekly tool lives at `/tools/day-XXX-<slug>` inside the same project.
  - Shares a unified top navigation bar (back to directory, Day #, Niche badge, button to view the Original X/Reddit Post modal, local data reset/export controls) and unified design tokens.

---

## 3. Unified Style, UX & Aesthetics Standards
- **Cohesive Visual System**: Editorial, high-craft dark/light interface with consistent spacing, typography, border treatments, keyboard shortcuts, and tactile feedback across the directory and all 100 subpages.
- **Top-Left Grok Bot 3D Showcase**: The directory and every `/tools/day-XXX-<slug>` subpage must use the shared `Brand` through `SiteHeader` / `ToolShell`. Keep `one hundred.` alongside the bilingual Grok Bot badge (`GROK BOT · 100 TOOLS` / `Grok Bot · 100日造物实验`) and daily 03:00 caption. Use the official `https://x.ai/bot` black spherical mascot with exactly two white rounded-pill eyes, subtle spherical lighting and rim depth, and layered CSS `preserve-3d`. Match the reference upper-left glance: eye centers (19.7%, 41.8%) and (48.6%, 45.6%), widths 10.6% and 13.2%, height 27.8%, and 9.35° clockwise eye tilt. Add page-wide cursor tracking with a damped spring, 3D head tilt and spherical eye foreshortening, autonomous curious glances, gentle bobbing, natural single/double blinking, and playful hover/click squints and bounce. Keep it crisp and circular on mobile; under `prefers-reduced-motion: reduce`, retain the exact static reference pose and 3D depth without tracking, bobbing, blinking or reactions. Use the same mascot in the footer and a matching static SVG favicon.
- **Bilingual Copy — English Default, Natural Chinese**: Every daily 03:00 and weekly tool built via `codex exec`, including subsequent optimizations, must ship both English (`en`) and natural, conversational Chinese (`zh`, “说人话”). Use the shared `LanguageProvider` and segmented `EN` / `中文` toggle in the directory and tool top bars. SSR and the first client render must always use `en`; restore an explicitly saved choice only after hydration. Persist `en` / `zh` under `grok-bot-100-lang`, update the document language, and preserve the choice across navigation/reload. Language switching must preserve tool inputs and settings.
  - `src/data/tools.ts`: Keep English fields as the default and require structured `zh` copy for `title`, `nicheAudience`, `painPoint`, `summary`, `sourceDate`, `originalComplaint`, `originalPostFull`, and every `requirementsAnalysis` field. Every optimization must include `zh.source`, `zh.complaint`, and `zh.resolution`. Preserve original source links, authors and dates; label translated source excerpts and distinguish editorial analysis from authentic requests.
  - `/tools/day-XXX-<slug>`: Translate all headings, actions, placeholders, presets, metrics, validation messages, status notices, export/reset/sample controls and accessible labels. Directory cards, filters, roadmap and source/requirements modals must switch together. Keep uploaded user content unchanged; Chinese should read naturally, never like a word-for-word machine translation.
- **Zero-Friction UX**: Every tool subpage must be immediately usable on load without onboarding walls, login prompts, or clutter. Provide a one-click **"Load Sample Data"** button on every tool so visitors can test the workflow in one second.

---

## 4. Strict Tool Constraints
### Daily Tools (Days 1–100, excluding Weekly Medium slots)
1. **Single-Page**: Self-contained within its `/tools/[slug]` route.
2. **No Database**: Zero server-side databases or cloud storage dependencies.
3. **No Networking**: Zero external API calls, telemetry, or remote fetches required for the tool to function.
4. **100% Local-First**: Runs entirely in the user's browser using native Web APIs (`localStorage`, `IndexedDB`, File/Blob API, Canvas, Web Audio, Web Workers, Clipboard, etc.).
5. **Laser-Focused on One Pain Point**: Solve **only the single most painful bottleneck** for a specific niche group. No feature creep, no multi-purpose Swiss-army bloat.
6. **Varied Audiences & Zero Repeats**: Each day must target a distinct niche group (e.g., podcast editors, PCB designers, tabletop RPG GMs, subtitle translators, sewing pattern makers, indie pixel artists, lab technicians, live VJ performers). Check `src/data/tools.ts` before building to guarantee no duplicate tools or repeated problems.

### Weekly Medium-Scale Tools (Every 7th Day)
1. **Medium Complexity**: Addresses a deeper, multi-step niche workflow (e.g., richer local state, canvas/timeline manipulation, batch file inspection/transformation, local IndexedDB persistence) while remaining 100% local-first, no-DB, and no-network.
2. **Disciplined Scope**: Handle real-world usage complexity thoughtfully, but **add no unneeded features**.

### Continuous Monitoring & Optimization of Existing Tools
- Before or alongside building a new tool, inspect recent X/Reddit discussions or user feedback on already-published tools in the repository.
- When users point out a rough edge or complaint on an existing tool, update that tool's subpage via `codex exec` and append an entry to its `optimizations` log in `src/data/tools.ts`.

---

## 5. Idea Discovery & Requirements Analysis Pipeline
- **Source of Truth**: Organic conversations on **X** and **Reddit**—never "top tool idea" lists or clones of existing SaaS products.
- **Niche + X/Reddit Balance Rule**: Reject overly narrow hobbies; require a broadly understandable pain point. Every newly researched or built day must include both verified X posts (`https://x.com/<handle>/status/<id>`) and verified Reddit threads in `sourcePosts`. Retrieve and verify X posts through the built-in X API. Alternate primary platforms as the evidence supports, and use `sourcePlatform: "X"` when strong X complaints exist rather than defaulting every tool to Reddit-only.
- **Requirements Analysis Process**:
  1. Search X and Reddit for frustration signals (`"I wish there was a simple way to"`, `"hate having to open a giant app just to"`, `"why does every tool for X require a login"`, `"spent 2 hours manually"`).
  2. Filter out generic mainstream requests; select a genuine **niche group** with an acute, underserved workflow pain.
  3. Extract:
     - `sourcePlatform`: `"X"` or `"Reddit"`
     - `sourceContext`: Handle/subreddit, post timestamp, URL, and verbatim complaint/wish.
     - `nicheAudience`: The specific group experiencing the pain.
     - `painPoint`: The single bottleneck to eliminate.
     - `solutionSummary`: How the local-first single-page tool resolves it immediately.

---

## 6. Daily 3:00 AM & Weekly Execution Workflow
1. **03:00 AM (Asia/Shanghai) Daily Trigger**:
   - **Step 1 (Research & Feedback Check)**: Grok Bot searches X and Reddit for unmet niche needs (and checks for complaints on existing tools).
   - **Step 2 (Deduplication)**: Compare candidate pain points against `src/data/tools.ts` to ensure a fresh audience and zero repeats.
   - **Step 3 (Codex CLI Build)**: Invoke `codex exec` in `/workspace/grok-bot-100-tools` with:
     - Reference to `PLAN.md`, explicitly including the shared Grok Bot 3D showcase and bilingual `en` / `zh` requirements above.
     - The selected niche pain point, original X/Reddit post quote & metadata, target slug `day-XXX-<slug>`, and whether today is a **Daily Micro-Tool** or **Weekly Medium-Scale Tool** (plus any existing tool optimization tasks).
     - Both English and natural Chinese copy for the complete tool metadata, source context, requirements, optimization log and tool UI. Reuse the shared provider, header/showcase and language toggle.
   - **Step 4 (Verification & Release)**:
     - `codex exec` implements a modular workbench registered in `/src/app/tools/[slug]/page.tsx`, updates `/src/data/tools.ts`, runs `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and Playwright E2E checks (using the available Chromium path) to verify zero errors, then commits and pushes to `origin main` only when release is authorized. Verify English SSR/default, Chinese switching and persistence across directory → modal → tool → reload, return to English, responsive layout and reduced-motion 3D rendering. A request for local preview overrides release: leave changes in the working tree without committing or pushing.
2. **100-Day Completion**:
   - After 100 days, the directory showcases all 100 daily and weekly tools, complete with their originating X/Reddit posts and evolution history.

## 7. Foundation contract — three batches, Days 001–022

### No prototypes, demos or placeholder engines

Every published tool must be a **complete, production-usable local problem solver**. A sample is only optional input for the same real engine used for user files. Hardcoded results, mock parsers, fake calculations, disabled export buttons standing in for features, and presentational demos do not count as built tools. Each published workflow must include real parsing or domain calculations, interactive editing, recoverable validation, localStorage persistence, and usable downloadable/copyable output. Preserve invalid source text and block exports that would silently discard it. Report storage/clipboard failures and offer file export. Keep execution, previews and assets local; never upload a user's file.

### Authentic original-post cards and provenance

- **Niche + X/Reddit Balance Rule**: Reject overly narrow hobbies and require a broadly understandable pain point. For every newly researched or built day, `sourcePosts` must contain both verified X posts with direct `https://x.com/<handle>/status/<id>` URLs and verified Reddit threads. Retrieve X evidence through the built-in X API; alternate primary platforms as supported by the evidence and use `sourcePlatform: "X"` when strong X complaints exist instead of defaulting every tool to Reddit-only. Existing brief-only X references do not satisfy this verification requirement for future research/builds.
- `src/components/SourcePostCard.tsx` is the single shared renderer. Render `variant="compact"` on **every researched directory tool card**, and `variant="full"` for the primary source inside `OriginalPostModal.tsx`.
- X uses a circular initials avatar, display name, `@handle`, timestamp, official `𝕏` mark, post text and Replies / Reposts / Likes / Views metrics row.
- Reddit uses the `r/...` subreddit pill, `u/...` commenter/author when verified, timestamp, flair, original thread title, excerpt/body and pill bar with `⬆ upvotes ⬇` and `💬 comments`.
- Each card has a prominent primary `sourceUrl` link with `target="_blank" rel="noopener noreferrer"`. Clicking that link opens the original directly; it must not be intercepted by the directory's modal handler.
- `ToolEntry.sourcePosts: SourcePostLink[]` is required for **every Day 001–022 entry**. Each record has `platform`, `author`, `handleOrSubreddit`, `date`, `url`, `quote`, `quoteZh`, `metricsLabel`. Include the primary source and 2–3 distinct original X/Reddit corroborating or explicitly related workflow posts. Render `+N similar posts linked` / `+N 条同款痛点原帖` on the directory card.
- The modal must also show **All Matching Original Posts (X & Reddit)** / **同款痛点原帖汇总（点击直达）**. Render every `sourcePosts` item as a mini platform card with its own direct URL, including the primary item.
- Never invent engagement counts, author identities, timestamps or verbatim quotes to make a card look authentic. Missing metrics display `—`; unverified dates/authors refer readers to the original. Preserve the distinction between a thread author and a commenter. Mark editorial summaries, translated titles, brief-supplied X excerpts and adjacent workflow references. A real URL alone does not prove that a post asks for the proposed tool.
- Earlier foundation research on 2026-10-28 could read/index the Reddit discussions, while its brief-supplied X links were not independently retrievable. Those earlier X URLs/excerpts remain attributed to the project brief; no engagement or exact posting date is asserted for them. Day 017 now uses two verified X excerpts retrieved through the built-in X API on 2026-10-28, with exact supplied dates and engagement, alongside two corroborating Reddit summaries. The supplied Day 004 r/bash reference and Day 005 r/sewing references concern adjacent workflows, not direct corroboration of glyph normalization or knitting yarn ratios. Keep that distinction visible.

### Routing and delivery boundaries

- Use **one** `src/app/tools/[slug]/page.tsx`, with `generateStaticParams()` over entries whose `status === "built"`, per-tool metadata, `dynamicParams = false`, and a modular workbench registry. Remove the old static Day 001 route folder. Unknown/unimplemented slugs return 404.
- `tools` contains the 22-day foundation catalog; `status: "built" | "planned"` separates working solvers from later-batch research. Only working solvers affect the built counter. Planned entries expose their real source cards and analysis, without a launch CTA or an unfinished tool route.
- **Foundation complete: 22 / 22 built.** All Days 001–022 have working solvers and `status: "built"`; Days 023–100 remain upcoming slots.
- Batch 2/3 must replace each planned entry with a real solver before marking it built. Adding a metadata entry alone must never increment the published count.

| Day | Batch 1 delivery | Engine and outputs |
| --- | --- | --- |
| 001 | Subtitle CPS Fixer | Existing SRT parser/editor preserved; shared source cards and matching post links added. |
| 002 | Chapter Drift Shifter | YouTube lists, FFmetadata time bases/escaping, chapter JSON; ripple offsets, sentence delay, editable markers; YouTube, JSON and FFmetadata exports. Validate zero start, order, count and every 10-second interval including the final chapter. YouTube uses whole seconds and is revalidated after rounding. |
| 003 | KiCad Solder Sorter | RFC-4180 CSV, grouped/ranged designators, Qty/DNP checks, inferred editable height stages, deterministic labeled color bins, per-part progress; CSV and printable Markdown. Heights are inferred from package names and must be confirmed against the physical parts. |
| 004 | SVG Glyph Normalizer | XML/shape/path parsing, flattened affine transforms, analytic quadratic/cubic/elliptical-arc extrema, 512px alpha-weighted optical centroid estimate, baseline/cap-height/padding and per-glyph round/pointed overshoot; individual SVG, offline ZIP and JSON path dictionary. Fill geometry only: unsupported clipping, CSS, references and strokes must be flattened/outlined before import, with explicit validation rather than silent omission. |
| 005 | Swatch Recalculator | Measured blocked/unblocked gauge and stockinette swatch weight, pattern repeat `multiple + offset`, multi-section counts, wash-length conversion, editable structure take-up and waste; JSON report/restore and CSV. Yarn totals are calibrated estimates, not universal physical predictions. |
| 006 | Retro Palette Quantizer | OKLab nearest-register distance, CGA high/low banks, DMG, PICO-8 and NES registers, editable two-layer pixel preview and WCAG matrix; GPL, HEX, CSS, sprite PNG/JSON. DMG/NES display colors are named approximations; preserve register identities rather than claiming a unique analog RGB truth. |
| 007 | Weekly CSS Workbench | PostCSS + selector/value ASTs, matching conditional scopes (reopened media/supports/container scopes included; anonymous layers isolated), margin/padding/border longhand effects, `!important`, specificity, partial shorthand coverage, selector review/pruning and adjacent-only merging; isolated offline previews, live line diff, UTF-8 byte savings and CSS export. Distinct-value overrides require review because they may be compatibility fallbacks. Prune exact duplicates for any property; preserve native nesting and differing values/effects of custom/logical properties and unsupported shorthands. |

### Verification before review

Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and Playwright against the production build. Verify the seven generated paths, direct source links and all 22 source sets, real file imports, error recovery, calculations, exports/clipboard, persistence/reset, English SSR, natural Chinese switching, mobile overflow and offline tool use. Include mathematical and parser regressions for malformed inputs and CSS cascade preservation; do not substitute screenshot-only checks for engine tests.

**Batch 1 release instruction: do not run `git commit` or `git push`.** Leave the complete, validated result in the working tree for review.

## Batch 2 delivery — Days 008–014

Seven real browser engines and bilingual workbenches are registered in the shared tool route. Day 014 remains a weekly tool and provides a three-step stock/layout/schedule workflow. Inputs, assumptions, invalid-data diagnostics, local drafts and portable exports are part of each workflow. Domain tests cover G-code modes, kerf geometry, concentration and condition timing, executable rename/undo scripts, Anki import failures, YAML/link audits and cut-area conservation.

Keep Batch 2 changes uncommitted and unpushed for review.


## Day 015 delivery — projector calibration

Nine-zone ruler measurements feed a browser engine that reports scale, aspect stretch, matched opposite-edge keystone indicators and per-zone deviations. A nominal SVG chart uses millimeter dimensions and labeled measurement cells; JSON/CSV preserve readings and analysis. Bilingual controls, sample/reset, local drafts, direction guidance, validation and sparse-coverage diagnostics are implemented. Correction directions require physical verification and do not infer optical angles. Focused engine and foundation browser checks cover the workflow. All Days 001–022 are now built; Days 023–100 remain upcoming slots.


## Day 016 delivery — Recipe Serving & Unit Scaler

The niche filter rejected the planned Coffee Water Recipe Blender: mineral-concentrate water preparation is too specialized to explain its pain to a non-specialist in one sentence. Its replacement scales a pasted ingredient list for a different number of diners or an available ingredient amount. The local parser handles cooking fractions and units, keeps unparsed lines with warnings, normalizes within volume/mass families, and exports text, JSON and CSV. Bilingual controls, local drafts, sample/reset and file import use the shared workbench helpers. All Days 001–022 are now built; Days 023–100 remain upcoming slots.


## Day 017 — Sourdough Baker’s Percentage Recalculator

`/tools/day-017-sourdough-bakers-percent` splits starter flour and water, calculates true hydration and baker’s percentages against total flour including starter flour, and preserves ratios when scaling to total dough or total flour weight. Edit grams or percentages with a total-flour/dough anchor. Other ingredients contribute weight only, not hydration. Bilingual controls, local drafts, sample/reset, printable TXT and JSON/CSV exports use shared workbench helpers. The niche filter **kept** the sourdough topic: home bakers in large public communities repeatedly need starter-inclusive hydration math. This is distinct from Day 016’s ingredient-list serving scaler. Results support process planning; flour absorption and dough feel still need baker judgment. All Days 001–022 are now built; Days 023–100 remain upcoming slots.

Sources: two verified X excerpts retrieved through the built-in X API on 2026-10-28, both posted 2026-10-10: primary [Jakub Biedrzycki (@jakubbied)](https://x.com/jakubbied/status/2108814998252277870) (1 reply · 0 reposts · 0 likes · 11 views) and [Sami Co (@samibobammie)](https://x.com/samibobammie/status/2108731194556678499) (1 reply · 10 likes · 265 views). Two corroborating Reddit editorial summaries complete the four-entry `sourcePosts` set: [Hydration Help](https://www.reddit.com/r/Sourdough/comments/1rvvigt/hydration_help/) and [How is hydration calculated?](https://www.reddit.com/r/Sourdough/comments/1pjwrbs/i_have_a_dumb_question_how_is_hydration_calculated/). Day 017 uses `sourcePlatform: "X"`; Reddit dates and engagement remain unavailable.


## Day 018 — Bank & Card CSV Debit/Credit Normalizer

`/tools/day-018-bank-csv-normalizer` imports RFC-4180 bank/card CSVs locally, maps date/payee/description and split debit/credit, type or signed amount columns, and normalizes outflows as negative and inflows as positive. Explicit MDY/DMY/YMD slash-date order and final sign inversion handle ambiguous dates and card conventions. Integer cents drive totals, running balances in file order, and optional opening + net = closing reconciliation with an exact discrepancy. All records remain in diagnostics; invalid dates/amounts, unknown type tokens, both-populated debit/credit rows and mapping errors block clean CSV export. JSON preserves raw CSV and row issues; TXT provides a bilingual reconciliation summary. Local drafts, file import, sample/reset and EN/中文 controls use shared helpers.

The niche filter **rejected and replaced LED Current & Resistor Budget (`led-resistor-budget`)**: a single-LED Ohm’s-law calculation is too narrow and elementary. Statement-import sign cleanup addresses an understandable recurring problem for freelancers and personal budgeters. All Days 001–022 are now built; Days 023–100 remain upcoming slots.

Sources: X excerpts verified via the X API on 2026-10-28 and supplied in the implementation brief: [ZeraBooks](https://x.com/ZeraBooks/status/2112257475025965093) (2026-10-19; 0 replies, 0 reposts, 0 likes, 2 views) and [Akhil](https://x.com/akhilworks/status/2111334566699139278) (2026-10-17; 1 reply, 1 like, 14 views). Two reviewed Reddit editorial summaries complete the source set: [Capital One CSV type-column cleanup](https://www.reddit.com/r/MonarchMoney/comments/1mtabox/csv_imports_theres_got_to_be_a_better_way/) and [reversed credit-card transaction signs](https://www.reddit.com/r/MonarchMoney/comments/18p9vot/imported_credit_card_transactions_showing_up_as/). Exact Reddit dates and engagement remain unavailable. Day 018 uses `sourcePlatform: "X"`.


## Day 019 — Calendar Invite ICS Timezone Preview

`/tools/day-019-ics-timezone-preview` unfolds and parses ICS locally, inspects events and VTIMEZONE offsets, and previews UTC and fixed-offset display times. Floating times and missing definitions remain unresolved. STANDARD/DAYLIGHT selection uses RRULE BYMONTH when available, otherwise a northern Mar–Oct fallback; transition days and historical rules are not evaluated and approximations are exposed. JSON/TXT diagnostics retain input, warnings and selected offsets. Original uploaded bytes remain downloadable; a guarded custom-TZID relabel preserves embedded rules without claiming IANA rule validation. Bilingual controls, local drafts, sample/reset and file/drop imports use shared helpers.

The niche filter **REJECTS / REPLACES ADIF Contact Log Reconciler (`adif-log-reconciler`)**: amateur-radio ADIF reconciliation is too specialist. Remote workers checking calendar invites face an understandable email-versus-calendar mismatch. **All Days 001–022 are now built; Days 023–100 remain upcoming slots. Day 020’s former ICS research was superseded by Day 019 and is replaced under the niche filter by Spreadsheet ↔ Markdown Table Converter.**

Sources: X excerpts verified through the X API on 2026-10-28 and supplied in the brief: [RameshKrishnamoorthy](https://x.com/ramesh009144/status/2104495170054242471) (2026-09-28; 0 replies, 0 reposts, 0 likes, 1 view) and [Sujal](https://x.com/hecodesforme/status/2107017813667852309) (2026-10-05; 5 views). Two reviewed Reddit editorial summaries: [Samsung invite display mismatch](https://www.reddit.com/r/samsunggalaxy/comments/1u45mpf/calendar_invite_shows_wrong_time_when_opening_or/) and [Proton unsupported invitation timezone](https://www.reddit.com/r/ProtonMail/comments/u6z9k5/unsupported_invitation_timezone_issues/). Reddit dates and engagement are unavailable. Day 019 uses `sourcePlatform: "X"`.


## Day 020 — Spreadsheet ↔ Markdown Table Converter

`/tools/day-020-md-table-converter` detects and parses spreadsheet TSV, quoted RFC-4180 CSV and GFM Markdown locally. Leading zeros, empty cells, pipe characters and literal formatting stay text. Preview the grid, set per-column alignment, trim whitespace optionally, and choose whether the first row is a header. Without a header, Markdown adds numbered column names; CSV/TSV keep the input grid. Download/copy `table.md`, `table.tsv`, `table.csv` and JSON diagnostics retaining raw text. Malformed quotes or Markdown row widths block table exports instead of dropping records. Multiline cells flatten to spaces for Markdown with a visible warning; quoted CSV/TSV retain line breaks. Shared imports/file drop, local drafts, sample/reset and EN/中文 controls are included. Limits: 2 MB, 10,000 rows, 200 columns; the adjustable preview limit never truncates exports. Spreadsheet apps may infer numbers when reopening CSV/TSV; import those columns as text to retain leading zeros.

The niche filter **REJECTS / REPLACES ICS Timezone Inspector (`ics-timezone-inspector`)** because Day 019 Calendar Invite ICS Timezone Preview already covers that pain point. Spreadsheet-to-Markdown conversion addresses a distinct writing, notes and AI-chat workflow. **All Days 001–022 are now built; Days 023–100 remain upcoming slots.**

Sources: two X excerpts verified via the X API on 2026-10-28 and supplied in the implementation brief, both by Himanshu Rathore: [spreadsheet columns in ChatGPT](https://x.com/himanshu19890/status/2113929704294289441) (2026-10-24; 2 replies, 0 reposts, 0 likes, 41 views) and [leading zeros, pipes and literal formatting](https://x.com/himanshu19890/status/2115117421878976544) (2026-10-27; 1 reply, 11 views; other counts unavailable). Two reviewed Reddit editorial summaries complete the four-entry `sourcePosts`: [copying Obsidian tables into other apps](https://www.reddit.com/r/ObsidianMD/comments/1p9kjct/is_there_no_plugin_that_allows_you_to_copy_and/) and [Markdown tables back to Google Sheets](https://www.reddit.com/r/ObsidianMD/comments/1ijxd4u/converting_markdown_tables_back_to_google_sheets/). Exact Reddit dates and engagement remain unavailable. Day 020 uses `sourcePlatform: "X"`.


## Day 021 — Freelancer Timesheet → Invoice Lines Workbench (weekly)

`/tools/day-021-timesheet-invoice-workbench` provides four local steps: import/map quoted CSV or TSV; normalize durations and round seconds; apply rates and group; review/export invoice lines. Supports HH:MM[:SS], decimal hours (including decimal comma), spreadsheet day fractions and start/end wall times with one overnight wrap. Automatic numeric values in (0,1] are interpreted as spreadsheet days, with a warning and per-entry format override. Set decimal hours explicitly for 0.5h or 1h. Dates use ISO YYYY-MM-DD (slash dates use Y/M/D); inclusive date and non-billable filters preserve skipped rows in the audit.

Durations normalize to whole seconds, then each entry rounds (none/nearest half-up/floor/ceil) to 1, 6 or 15 minutes, or 36 seconds for two-decimal hours, before money math. Row rate overrides exact client rates, which override the default. Each entry rounds half up to integer cents; groups sum those cents and keep different rates separate. Client, client+project and row grouping are available. Hours export with up to 9 decimal places; grouped hours × rate can differ from summed entry cents. Use one currency throughout. Errors or no selected lines block `invoice-lines.csv` and `invoice-summary.md`; `timesheet-audit.json` retains raw input, rows, seconds, deltas and diagnostics. Local drafts, real file import/drop, sample/reset, EN/中文 and shared exports need no network. Limits: 2 MB, 10,000 entries, 100 columns; previews show 100 rows without truncating exports.

The niche filter **REJECTS / REPLACES VJ MIDI Mapping Workbench (`vj-midi-map-workbench`)**: live-visual MIDI mapping is too specialist. Turning tracked hours into invoice lines is a broadly understandable recurring freelancer workflow. This is duration → billable hours → money, distinct from Day 018 bank CSV sign normalization. **All Days 001–022 are now built; Days 023–100 remain upcoming slots.**

Sources: two X excerpts verified via the X API on 2026-10-28 and supplied in the implementation brief: primary [Jan Koenig (@itsjankoenig)](https://x.com/itsjankoenig/status/2113543493888958885) (2026-10-23; 1 reply, 0 reposts, 1 like, 14 views) and [Phillip Zannini (@phillymac)](https://x.com/phillymac/status/2111559048319717680) (2026-10-17; 18 views; other counts unavailable). Two reviewed Reddit editorial body summaries complete `sourcePosts`: [manual hourly invoicing](https://www.reddit.com/r/Freelancers/comments/1f8q63j/how_do_you_handle_invoicing_for_hourly_projects/) and [displayed duration vs invoiced fee](https://www.reddit.com/r/googlesheets/comments/1ihxpyi/invoicing_sheet_is_spitting_out_incorrect_fee/). Exact Reddit dates, authors and engagement are unavailable. Day 021 uses `sourcePlatform: "X"` and `tier: "weekly"`.


## Day 022 — BibTeX Merge Auditor (foundation complete)

`/tools/day-022-bibtex-merge-auditor` parses real BibTeX locally, including nested/quoted multiline fields, escaped braces, concatenated values and preserved `@comment`, `@string` and `@preamble` blocks. Exact keys, normalized DOI and title+year form transitive duplicate clusters. Select the primary record per cluster (most complete by default), inspect missing DOI and case-only key warnings, optionally brace title/booktitle acronyms, then export `merged.bib`, `citekey-remap.csv` / `.json` and `bibtex-audit.json`. Syntax errors block clean exports and keep raw input in the audit. Selected records are retained whole; discarded fields are not merged. String macros remain intact without expansion for matching or acronym fixes. Review title/year matches and identical-key intent before export; `.tex` citations are not automatically edited. Limits: 2 MB and 10,000 entries; the preview limit never truncates export. Shared local drafts, file imports, multiple-file drop/append, sample/reset and EN/中文 controls are included.

Niche filter: **KEEP BibTeX Merge Auditor (`bibtex-merge-auditor`)**. Graduate students, academic co-authors and technical writers using Overleaf/Zotero/LaTeX are a large, well-known workflow group; duplicate bibliographies are a classic collaboration pain. Sources balance two X excerpts verified via the X API on 2026-10-28 and supplied in the brief: [Hung](https://x.com/hyoungne2124/status/2109648669104308714) (2026-10-12; 0 replies, 0 reposts, 0 likes, 2 views) and [PRUTHVI GEEDH](https://x.com/pruthvigeedh_/status/2105350752667378142) (2026-09-30; 1 reply, 195 views; other counts unavailable), plus reviewed editorial Reddit summaries: [shared Overleaf duplicate entries](https://www.reddit.com/r/LaTeX/comments/lz6tpl/how_to_findmanage_duplicate_bibliographic_entries/) and [bulk merging Zotero duplicates](https://www.reddit.com/r/zotero/comments/10angho/is_there_any_way_to_bulk_merge_all_duplicates/). Reddit dates and engagement are unavailable. Primary platform: X.

**All Days 001–022 of the foundation catalog are now built (`status: "built"`): 22 / 22. Days 023–100 remain upcoming slots.** No commit or push is part of this delivery.
