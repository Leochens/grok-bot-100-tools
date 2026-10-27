import type { Metadata } from "next";
import { SubtitleEditor } from "@/components/SubtitleEditor";
export const metadata: Metadata = {
  title: "Subtitle CPS Fixer",
  description:
    "Inspect SRT reading speed, rebalance subtitle lines and edit timestamps. A private, local-first tool for subtitle translators and fansub QC editors.",
};
export default function SubtitlePage() {
  return <SubtitleEditor />;
}
