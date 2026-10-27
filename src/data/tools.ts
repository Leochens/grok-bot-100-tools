export type ToolOptimization = {
  date: string;
  source: string;
  complaint: string;
  resolution: string;
};

export type ToolEntry = {
  day: number;
  slug: string;
  title: string;
  tier: "daily" | "weekly";
  nicheAudience: string;
  painPoint: string;
  summary: string;
  sourcePlatform: "X" | "Reddit";
  sourceAuthor: string;
  sourceUrl: string;
  sourceDate: string;
  originalComplaint: string;
  originalPostFull: string;
  requirementsAnalysis: {
    who: string;
    whyExistingToolsFail: string;
    isolatedPainPoint: string;
    localFirstDesign: string;
  };
  optimizations: ToolOptimization[];
};

export const tools: ToolEntry[] = [
  {
    day: 1,
    slug: "day-001-subtitle-cps-fixer",
    title: "Subtitle CPS Fixer",
    tier: "daily",
    nicheAudience: "Subtitle translators & fansub QC editors",
    painPoint:
      "Spot and rebalance SRT cues that exceed reading-speed and line-length limits.",
    summary: "Catch too-fast subtitles. Rebalance the lines. Keep your flow.",
    sourcePlatform: "Reddit",
    sourceAuthor: "r/editors · u/C_vansky",
    sourceUrl: "https://www.reddit.com/r/editors/comments/1s5gosy/subtitles/",
    sourceDate: "March 2026 · approximate",
    originalComplaint:
      "With that said is there a way to keep this more consistent and scalable throughout a team of editors that you have found? Is there any tips for getting this more correct on the first try?",
    originalPostFull: `Subtitles — u/C_vansky, r/editors

I work for an agency that historically we haven't done many subtitles. With the new ADA regulations coming into affect next month we all of a sudden are subtitling everything and it is causing a bunch of revisions.

Our current process is to have premiere transcribe, use that transcription to generate subtitles and then go through and edit the bad translations, etc.
The process it seems should be fine, but I have gotten so many notes on different ways to punctuate, capitalize and just generally I miss some things that should've been edited. Some I swear I edited, but seem to look like I haven't.

With that said is there a way to keep this more consistent and scalable throughout a team of editors that you have found? Is there any tips for getting this more correct on the first try?

THREAD CONTEXT (editorial summary)
Commenters discuss the craft of caption QC, including CPS and line breaks, recommend Netflix's timed-text style guide, and describe exporting to Subtitle Edit before importing back into an NLE. The post is about general consistency; the specific CPS inspector is our isolated interpretation of that discussion and the project brief, rather than a verbatim feature request. The original poster clarified that their own job did not involve translation. We extend the same QC bottleneck to subtitle translators and fansub editors.

SOURCE NOTE
Reddit displayed “7mo ago” when reviewed on October 27, 2026; the date above is approximate. This is a real public thread, not an endorsement.`,
    requirementsAnalysis: {
      who: "Broadcast & streaming subtitle translators and fansub QC editors reviewing exported .srt files before delivery. The source thread also includes agency video editors handling caption QC.",
      whyExistingToolsFail:
        "The thread describes QC revisions and a workflow that exports captions to a separate desktop editor. For a quick reading-speed pass, opening a full editing project adds friction. Our tool isolates numerical checks; it does not replace linguistic review or video synchronization.",
      isolatedPainPoint:
        "Immediately find cues over a chosen CPS or characters-per-line limit, edit their wording or timestamps, and balance them into two lines. Wrapping changes layout, not the time available to read the words.",
      localFirstDesign:
        "SRT parsing, Unicode character counting, live checks and balanced wrapping run entirely in the browser. File API reads local files, localStorage saves the working draft and settings, and Blob/Clipboard APIs export it. No account, API, database, telemetry, or upload.",
    },
    optimizations: [
      {
        date: "2026-10-27",
        source: "Initial implementation · requirements review",
        complaint:
          "A cue can fit on two lines and still be too fast to read. An automatic line break must not conceal a CPS violation.",
        resolution:
          "Separate CPS, line-length, line-count and timing warnings. Keep timing unchanged during auto-wrap, and recalculate all metrics after every edit. This is an implementation review, not a later user report.",
      },
    ],
  },
];

export type RoadmapSlot = {
  day: number;
  tier: ToolEntry["tier"];
  status: "built" | "upcoming";
  tool?: ToolEntry;
};
export const roadmap: RoadmapSlot[] = Array.from(
  { length: 100 },
  (_, index) => {
    const day = index + 1;
    const tool = tools.find((entry) => entry.day === day);
    return {
      day,
      tier: day % 7 === 0 ? "weekly" : "daily",
      status: tool ? "built" : "upcoming",
      tool,
    };
  },
);
export const formatDay = (day: number) => String(day).padStart(3, "0");
