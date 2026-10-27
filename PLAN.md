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
     - Reference to `PLAN.md`.
     - The selected niche pain point, original X/Reddit post quote & metadata, target slug `day-XXX-<slug>`, and whether today is a **Daily Micro-Tool** or **Weekly Medium-Scale Tool** (plus any existing tool optimization tasks).
   - **Step 4 (Verification & Release)**:
     - `codex exec` implements `/src/app/tools/day-XXX-<slug>/page.tsx`, updates `/src/data/tools.ts`, runs `npm run build` to verify zero TypeScript/Next.js build errors, commits, and pushes to `origin main`.
2. **100-Day Completion**:
   - After 100 days, the directory showcases all 100 daily and weekly tools, complete with their originating X/Reddit posts and evolution history.
