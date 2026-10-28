import type { Metadata } from "next";
import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import { tools } from "@/data/tools";
import { SubtitleEditor } from "@/components/SubtitleEditor";
const ChapterWorkbench = dynamic(() =>
  import("@/components/workbenches/ChapterWorkbench").then(
    (m) => m.ChapterWorkbench,
  ),
);
const BomWorkbench = dynamic(() =>
  import("@/components/workbenches/BomWorkbench").then((m) => m.BomWorkbench),
);
const GlyphWorkbench = dynamic(() =>
  import("@/components/workbenches/GlyphWorkbench").then(
    (m) => m.GlyphWorkbench,
  ),
);
const KnitWorkbench = dynamic(() =>
  import("@/components/workbenches/KnitWorkbench").then((m) => m.KnitWorkbench),
);
const PaletteWorkbench = dynamic(() =>
  import("@/components/workbenches/PaletteWorkbench").then(
    (m) => m.PaletteWorkbench,
  ),
);
const CssWorkbench = dynamic(() =>
  import("@/components/workbenches/CssWorkbench").then((m) => m.CssWorkbench),
);
const FilamentWorkbench = dynamic(() =>
  import("@/components/workbenches/FilamentWorkbench").then(
    (m) => m.FilamentWorkbench,
  ),
);
const LaserWorkbench = dynamic(() =>
  import("@/components/workbenches/LaserWorkbench").then(
    (m) => m.LaserWorkbench,
  ),
);
const InitiativeWorkbench = dynamic(() =>
  import("@/components/workbenches/InitiativeWorkbench").then(
    (m) => m.InitiativeWorkbench,
  ),
);
const RenamerWorkbench = dynamic(() =>
  import("@/components/workbenches/RenamerWorkbench").then(
    (m) => m.RenamerWorkbench,
  ),
);
const AnkiWorkbench = dynamic(() =>
  import("@/components/workbenches/AnkiWorkbench").then((m) => m.AnkiWorkbench),
);
const VaultWorkbench = dynamic(() =>
  import("@/components/workbenches/VaultWorkbench").then(
    (m) => m.VaultWorkbench,
  ),
);
const CutPlannerWorkbench = dynamic(() =>
  import("@/components/workbenches/CutPlannerWorkbench").then(
    (m) => m.CutPlannerWorkbench,
  ),
);
const ProjectorWorkbench = dynamic(() =>
  import("@/components/workbenches/ProjectorWorkbench").then(
    (m) => m.ProjectorWorkbench,
  ),
);
const RecipeWorkbench = dynamic(() =>
  import("@/components/workbenches/RecipeWorkbench").then(
    (m) => m.RecipeWorkbench,
  ),
);
const SourdoughWorkbench = dynamic(() =>
  import("@/components/workbenches/SourdoughWorkbench").then(
    (m) => m.SourdoughWorkbench,
  ),
);
const BankCsvWorkbench = dynamic(() =>
  import("@/components/workbenches/BankCsvWorkbench").then(
    (m) => m.BankCsvWorkbench,
  ),
);
const IcsWorkbench = dynamic(() =>
  import("@/components/workbenches/IcsWorkbench").then((m) => m.IcsWorkbench),
);
const MdTableWorkbench = dynamic(() =>
  import("@/components/workbenches/MdTableWorkbench").then(
    (m) => m.MdTableWorkbench,
  ),
);
const TimesheetWorkbench = dynamic(() =>
  import("@/components/workbenches/TimesheetWorkbench").then(
    (m) => m.TimesheetWorkbench,
  ),
);
const BibtexWorkbench = dynamic(() =>
  import("@/components/workbenches/BibtexWorkbench").then(
    (m) => m.BibtexWorkbench,
  ),
);
const workbenches = {
  1: SubtitleEditor,
  2: ChapterWorkbench,
  3: BomWorkbench,
  4: GlyphWorkbench,
  5: KnitWorkbench,
  6: PaletteWorkbench,
  7: CssWorkbench,
  8: FilamentWorkbench,
  9: LaserWorkbench,
  10: InitiativeWorkbench,
  11: RenamerWorkbench,
  12: AnkiWorkbench,
  13: VaultWorkbench,
  14: CutPlannerWorkbench,
  15: ProjectorWorkbench,
  16: RecipeWorkbench,
  17: SourdoughWorkbench,
  18: BankCsvWorkbench,
  19: IcsWorkbench,
  20: MdTableWorkbench,
  21: TimesheetWorkbench,
  22: BibtexWorkbench,
};
export const dynamicParams = false;
export function generateStaticParams() {
  return tools
    .filter((tool) => tool.status === "built")
    .map((tool) => ({ slug: tool.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = tools.find((t) => t.slug === slug && t.status === "built");
  return tool ? { title: tool.title, description: tool.summary } : {};
}
export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = tools.find((t) => t.slug === slug && t.status === "built");
  if (!tool) notFound();
  const Workbench = workbenches[tool.day as keyof typeof workbenches];
  if (!Workbench) notFound();
  return <Workbench />;
}
