# One Hundred

100 local-first niche tools in one Next.js App Router project. Day 001 is a working **Subtitle CPS Fixer** for subtitle translators and fansub QC editors. The original architecture brief remains in [`PLAN.md`](./PLAN.md).

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
npm test           # SRT parser, metrics, wrapping and round-trip tests
```

## What is included

- An editorial directory with instant text/audience search, source and tier filters, an upcoming-slot toggle, and 100 clickable progress cells. The preview includes the next weekly medium slot; expand it to see the complete roadmap.
- A typed registry at `src/data/tools.ts`. Days 7, 14, …, 98 are reserved for weekly medium tools. Upcoming slots are reserved space, not invented tools or source posts.
- The same accessible native-dialog source notebook on the directory and tool page. It contains the original Reddit post, thread context, requirements analysis, source link, and optimization history. Escape closes it; the browser handles modal focus containment.
- A responsive subtitle editor at `/tools/day-001-subtitle-cps-fixer`, with an eight-cue sample, drag/drop or paste, editable text/timestamps, live metrics, conservative presets and custom limits, violations-only view, balanced wrapping, and SRT download/clipboard export.

## Subtitle behavior

The editor accepts UTF-8 SRT files up to 5 MB, optional numeric cue IDs, CRLF/LF line endings, and comma/period millisecond separators. Exports use sequential IDs and SRT comma timestamps. Malformed blocks stay in the raw input and block editing/export until corrected; invalid or reversed timing and empty cues also block export. Overlaps and unresolved readability warnings remain visible and may be exported for further editorial work.

CPS counts Unicode code points, spaces and punctuation, excludes HTML/ASS formatting tags, and joins cue lines with a space. CPL counts each line separately. A two-line maximum is checked. Auto-wrap scores word boundaries for balanced lines and prefers punctuation; it preserves words and timing. Very long cues or indivisible words can still exceed the limits. Wrapping does not reduce CPS. Shorten the text or edit its timestamps, then review synchronization against the original video.

The 17 CPS / 42 CPL Netflix preset is deliberately conservative. [Netflix English guidance](https://partnerhelp.netflixstudios.com/hc/en-us/articles/30806198616339-English-UK-Timed-Text-Style-Guide) permits 20 CPS for adults and 17 for children. The BBC-style 15 CPS / 37 CPL preset is a workflow approximation: [BBC guidance](https://www.bbc.co.uk/accessibility/forproducts/guides/subtitles/) uses word-rate guidance and a 37-character teletext limit. These checks do not certify full platform compliance.

All subtitle processing occurs in the browser. The draft, filename, preset, custom thresholds and view filter persist under `one-hundred:subtitle-cps:v1` in `localStorage`. Reset clears the working data and restores defaults. If storage or clipboard permissions are unavailable, the interface explains the fallback. No file is uploaded; there are no runtime API calls or telemetry integrations. External source links open only when selected. This is local-first processing after the app loads, not a service-worker-powered offline installation.

## Source provenance

The real source is [“Subtitles” by u/C_vansky in r/editors](https://www.reddit.com/r/editors/comments/1s5gosy/subtitles/). The original post asks for more consistent caption QC; replies discuss CPS, line breaks, Netflix guidelines and desktop-editor workflows. The exact CPS-focused tool and translator audience are our requirements interpretation, not a fabricated verbatim feature request. Reddit exposed a relative date, so the registry labels its date approximate. The initial optimization log is explicitly an implementation review, not invented user feedback.

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

1. Read `PLAN.md`, check the registry for repeated audiences or pain points, and record a real X/Reddit source.
2. Add a complete `ToolEntry` to `src/data/tools.ts`; use `weekly` on every seventh day.
3. Add `src/app/tools/<slug>/page.tsx`. Reuse `ToolShell` with sample/reset callbacks and keep all data processing local.
4. Record actual feedback and resolutions in `optimizations`, then run the build and relevant checks.

## Vercel

Import this repository as **one Next.js project**, with the repository root as the project root. Use `npm run build` and the default Next.js output setting; no environment variables are needed. Both routes are statically prerendered.

The 03:00 AM Asia/Shanghai daily schedule is displayed as the project cadence. This scaffold does not provision the external research/build bot, a cron job, or automatic Git pushes.
