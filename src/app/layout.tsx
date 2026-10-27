import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/components/LanguageProvider";
export const metadata: Metadata = {
  title: {
    default: "One Hundred — Small tools. Specific problems.",
    template: "%s — One Hundred",
  },
  description:
    "100 local-first niche tools, built over 100 days. Real frustrations, thoughtfully small solutions. Start with the Subtitle CPS Fixer.",
  icons: { icon: "/icon.svg" },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
