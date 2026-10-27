import Link from "next/link";
import { ArrowUpRight, Asterisk } from "lucide-react";
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="One Hundred home">
      <span className="brand-symbol">
        <Asterisk size={25} strokeWidth={1.8} />
      </span>
      <span>
        one hundred<span className="brand-period">.</span>
      </span>
    </Link>
  );
}
export function SiteHeader() {
  return (
    <header className="site-header">
      <Brand />
      <span className="header-caption mono">
        AN INDEPENDENT TOOLMAKING EXPERIMENT
      </span>
      <a
        className="repo-link mono"
        href="https://github.com/Leochens/grok-bot-100-tools"
        target="_blank"
        rel="noreferrer"
      >
        OPEN SOURCE <ArrowUpRight size={14} />
      </a>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <Brand />
      <span>Small by design. Yours by default.</span>
      <span className="mono">100 DAYS / 100 SPECIFIC PROBLEMS</span>
    </footer>
  );
}
