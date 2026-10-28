# One Hundred

100 local-first niche tools in one Next.js App Router project. **Twenty-two browser workbenches ship (Days 001–022): 22 / 22 foundation tools are built (`status: "built"`).** Days 023–100 remain upcoming slots. The original architecture brief remains in [`PLAN.md`](./PLAN.md).

## Run locally

Use Node.js 22.18+ (Node 22 LTS recommended).

```sh
npm ci
npm run dev
```

Open http://localhost:3000. No environment variables, accounts, external APIs, or databases are required.

```sh
npm run build      # Production build and Next.js TypeScript validation
npm start          # Serve the production build
npm run lint
npm run typecheck
npm test           # Parser, domain math, SVG geometry and CSS cascade regressions
```

## What is included

- An editorial directory with instant text/audience search, source and tier filters, an upcoming-slot toggle, and 100 clickable progress cells. The preview includes the next weekly medium slot; expand it to see the complete roadmap.
- A typed registry at `src/data/tools.ts`. Days 7, 14, …, 98 are reserved for weekly medium tools. All Days 001–022 of the foundation catalog are built (`status: "built"`); Days 023–100 remain upcoming slots. Only implemented tools count as built.
- The same accessible native-dialog source notebook on the directory and tool page. It contains authentic X/Reddit-style cards, thread context, requirements analysis, clickable primary/corroborating/related posts, and optimization history. Escape closes it; the browser handles modal focus containment.
- A responsive subtitle editor at `/tools/day-001-subtitle-cps-fixer`, with an eight-cue sample, drag/drop or paste, editable text/timestamps, live metrics, conservative presets and custom limits, violations-only view, balanced wrapping, and SRT download/clipboard export.

## Day 015 — Pattern Projector Grid Calibrator

`/tools/day-015-projector-grid-calibrator` compares ruler measurements at nine mat zones with a target square in mm, cm or inches. It separates scale, aspect stretch, matched opposite-edge keystone indicators and worst per-zone deviation, then gives bilingual correction directions. Download the nominal millimeter SVG test chart and JSON/CSV reports. Drafts persist locally; sample and reset actions are available. Projected dimensions must be checked with a ruler. Sparse readings cannot establish whole-mat accuracy, and measurements do not recover mount angles or model-specific keystone values. All Days 001–022 are now built; Days 023–100 remain upcoming slots.

## Batch 2 workbenches

| Day | Tool                        | Local engine and usable outputs                                                                                                   |
| --- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 008 | Filament Spool Budget       | Slicer G-code totals / extrusion motion, measured tare and density, reserved multi-print queues; inventory JSON/CSV               |
| 009 | Laser Kerf & Fit            | External/internal/N-cut calibration, tab/slot compensation; millimeter SVG comb and finger-joint coupons                          |
| 010 | Initiative & Round Ledger   | DEX tiebreaks, HP/Temp HP, concentration DC, automatic condition expiry; encounter JSON and Markdown log                          |
| 011 | Photo Sequence Renamer      | Real file metadata, template expansion, portable collision checks; guarded Bash/PowerShell and undo scripts, CSV manifest         |
| 012 | Anki Import Inspector       | Quoted CSV/TSV, duplicate first fields, Cloze/quote/orphan-row checks, inline fixes; UTF-8 Anki TSV                               |
| 013 | Vault Link Auditor          | Folder/file Markdown, YAML metadata and Dataview migration, wiki/Markdown resolution; audit JSON/Markdown, converted Markdown ZIP |
| 014 | Weekly Workshop Cut Planner | Three-step 1D/2D deterministic guillotine packing with kerf/grain, interactive SVG, reusable offcuts; SVG/CSV/Markdown/JSON       |

All seven use `useLocalDraft`, bilingual controls, real local inputs, sample/reset actions and clipboard/download exports. G-code motion estimates require confirming material and purge allowances; spool tare presets are approximate. Anki duplicate checks cover the imported file, not an existing collection. Cut packing is a deterministic heuristic and visibly reports unplaced parts. Generated rename scripts run from the source folder and preflight all paths before moving files.

Batch 2 balances three saved X workflow references with four Reddit primary discussions. Adjacent X references are explicitly labeled as related inspiration, not direct domain requests. The researched Reddit threads remain directly linked in each source set.

## Batch 1 workbenches

| Day | Tool                    | Inputs → outputs                                                                                      |
| --- | ----------------------- | ----------------------------------------------------------------------------------------------------- |
| 002 | Chapter Drift Shifter   | YouTube/FFmetadata/JSON → editable, validated chapter exports                                         |
| 003 | KiCad Solder Sorter     | BOM CSV → height stages, color bins, per-designator checks, CSV/Markdown                              |
| 004 | SVG Glyph Normalizer    | Filled SVG geometry → analytic bounds, baseline/overshoot alignment, SVG ZIP/JSON                     |
| 005 | Swatch Recalculator     | Measured gauge/weight and sections → repeat-aware counts, wash lengths, yarn estimates, JSON/CSV      |
| 006 | Retro Palette Quantizer | Hex/CSS → OKLab register matching, two-layer sprite editor, contrast matrix, GPL/HEX/CSS/PNG/JSON     |
| 007 | Weekly CSS Workbench    | CSS → scoped override review, shorthand coverage, specificity, isolated previews, diff and CSS export |

All workbenches persist independently in localStorage, accept real user inputs, and export actual computed results. SVG rejects unsupported geometry rather than silently dropping it; outline strokes/text and flatten masks/references before import. Optical centroids are raster estimates; geometric path bounds are analytic. Knitting yarn estimates use measured swatch weight and editable structure assumptions. NES/DMG colors are display approximations. CSS equal-value duplicates can be selected together; differing values need individual fallback review. Preview imports and remote resources are stripped before rendering, while exported CSS preserves unselected source declarations.

Sources have direct links and translated excerpts/titles. Unknown authors, dates and engagement counts are not fabricated. The supplied X links could not be independently fetched; they remain labeled as brief-supplied references. The supplied sewing/bash references are explicitly marked as adjacent workflows. Later-day research titles are provisional until the next batch brief.

## Subtitle behavior

The editor accepts UTF-8 SRT files up to 5 MB, optional numeric cue IDs, CRLF/LF line endings, and comma/period millisecond separators. Exports use sequential IDs and SRT comma timestamps. Malformed blocks stay in the raw input and block editing/export until corrected; invalid or reversed timing and empty cues also block export. Overlaps and unresolved readability warnings remain visible and may be exported for further editorial work.

CPS counts Unicode code points, spaces and punctuation, excludes HTML/ASS formatting tags, and joins cue lines with a space. CPL counts each line separately. A two-line maximum is checked. Auto-wrap scores word boundaries for balanced lines and prefers punctuation; it preserves words and timing. Very long cues or indivisible words can still exceed the limits. Wrapping does not reduce CPS. Shorten the text or edit its timestamps, then review synchronization against the original video.

The 17 CPS / 42 CPL Netflix preset is deliberately conservative. [Netflix English guidance](https://partnerhelp.netflixstudios.com/hc/en-us/articles/30806198616339-English-UK-Timed-Text-Style-Guide) permits 20 CPS for adults and 17 for children. The BBC-style 15 CPS / 37 CPL preset is a workflow approximation: [BBC guidance](https://www.bbc.co.uk/accessibility/forproducts/guides/subtitles/) uses word-rate guidance and a 37-character teletext limit. These checks do not certify full platform compliance.

All subtitle processing occurs in the browser. The draft, filename, preset, custom thresholds and view filter persist under `one-hundred:subtitle-cps:v1` in `localStorage`. Reset clears the working data and restores defaults. If storage or clipboard permissions are unavailable, the interface explains the fallback. No file is uploaded; there are no runtime API calls or telemetry integrations. External source links open only when selected. This is local-first processing after the app loads, not a service-worker-powered offline installation.

## Source provenance

The real source is [“Subtitles” by u/C_vansky in r/editors](https://www.reddit.com/r/editors/comments/1s5gosy/subtitles/). The original post asks for more consistent caption QC; replies discuss CPS, line breaks, Netflix guidelines and desktop-editor workflows. The exact CPS-focused tool and translator audience are our requirements interpretation, not a fabricated verbatim feature request. A later search-index review exposed the March 27, 2026 date. The initial optimization log is explicitly an implementation review, not invented user feedback.

## Browser checks

```sh
npx playwright install chromium
npm run build
npm run test:e2e
```

On a system with an existing Chrome installation:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/chrome npm run test:e2e
```

The suite checks directory filters and all roadmap slots, modal navigation, mobile overflow, file input, malformed input, inline timing/text edits, persistence, wrapping, clipboard and download. Playwright starts the production server automatically.

## Add the next tool

1. Read `PLAN.md`, check the registry for repeated audiences or pain points, and apply its Niche + X/Reddit Balance Rule: reject overly narrow hobbies, require a broadly understandable pain point, and record both verified X posts (retrieved via the built-in X API) and Reddit threads in `sourcePosts`. Alternate primary platforms as evidence supports; use `sourcePlatform: "X"` when strong X complaints exist.
2. Add a complete `ToolEntry` to `src/data/tools.ts`; use `weekly` on every seventh day.
3. Add a modular engine under `src/lib/engines` and a bilingual UI under `src/components/workbenches`. Register the workbench in the shared `src/app/tools/[slug]/page.tsx`; static parameters come from registry entries marked `built`. Reuse `ToolShell` with sample/reset callbacks and keep all data processing local.
4. Record actual feedback and resolutions in `optimizations`, then run the build and relevant checks.

## Vercel

Import this repository as **one Next.js project**, with the repository root as the project root. Use `npm run build` and the default Next.js output setting; no environment variables are needed. The directory and all twenty-one published tool routes are statically prerendered.

The 03:00 AM Asia/Shanghai daily schedule is displayed as the project cadence. This scaffold does not provision the external research/build bot, a cron job, or automatic Git pushes.


## Day 016 — Recipe Serving & Unit Scaler

`/tools/day-016-recipe-serving-scaler` scales ingredient lists by servings or a pivot ingredient, parses mixed/Unicode fractions, and normalizes kitchen units within volume or mass families. Import a text file and export a scaled recipe, JSON report or CSV; unparsed quantity lines remain marked and preserved. Uses US customary cups/spoons; no density is assumed. Local drafts, bilingual controls and sample/reset are included. This replaces the planned coffee-water blender under the niche filter: resizing dinner is a clear everyday workflow. All Days 001–022 are now built; Days 023–100 remain upcoming slots.


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
