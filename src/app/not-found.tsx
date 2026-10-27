import Link from "next/link";
export default function NotFound() {
  return (
    <main className="not-found">
      <span className="eyebrow">404 / NOT BUILT YET</span>
      <h1>A small detour.</h1>
      <p>This tool hasn’t joined the directory yet.</p>
      <Link href="/" className="button primary">
        Back to Directory →
      </Link>
    </main>
  );
}
