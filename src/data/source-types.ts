export type SourcePostLink = {
  platform: "X" | "Reddit";
  author: string;
  handleOrSubreddit: string;
  date: string;
  url: string;
  quote: string;
  quoteZh: string;
  metricsLabel: string;
  /** Distinguish editorial summaries and thread titles from verbatim excerpts. */
  context?: "excerpt" | "summary" | "title" | "related";
  verification?: "reviewed" | "brief";
};
export type SourceCardMetadata = {
  displayName: string;
  handle: string;
  subreddit?: string;
  title: string;
  titleZh: string;
  flair: string;
  flairZh: string;
  replies?: number;
  reposts?: number;
  likes?: number;
  views?: number;
  upvotes?: number;
  comments?: number;
};
export function cardMetadata(
  post: SourcePostLink,
  title?: string,
  titleZh?: string,
): SourceCardMetadata {
  return {
    displayName: post.author,
    handle:
      post.platform === "X"
        ? post.handleOrSubreddit
        : post.author.startsWith("u/")
          ? post.author
          : "",
    subreddit: post.platform === "Reddit" ? post.handleOrSubreddit : undefined,
    title: title ?? post.quote,
    titleZh: titleZh ?? post.quoteZh,
    flair:
      post.context === "related"
        ? "Related workflow"
        : post.context === "title"
          ? "Discussion"
          : "Source excerpt",
    flairZh:
      post.context === "related"
        ? "相关工作流"
        : post.context === "title"
          ? "讨论"
          : "原帖节选",
  };
}
