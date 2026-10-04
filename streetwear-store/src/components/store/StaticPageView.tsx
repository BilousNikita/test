import type { StaticPage } from "@/content/pages";
import { getSettings } from "@/lib/settings";

/** Renders the simple markup used in src/content/pages.ts and highlights [REVIEW] markers. */
export async function StaticPageView({ page, children }: { page: StaticPage; children?: React.ReactNode }) {
  const s = await getSettings();
  const text = page.body.replaceAll("{{store}}", s.storeName).replaceAll("{{email}}", s.contactEmail);

  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length)
      blocks.push(
        <ul key={`ul${blocks.length}`}>
          {list.map((li, i) => (
            <li key={i}>{mark(li)}</li>
          ))}
        </ul>,
      );
    list = [];
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("- ")) {
      list.push(line.slice(2));
      continue;
    }
    flush();
    if (!line) continue;
    if (line.startsWith("## ")) blocks.push(<h2 key={blocks.length}>{line.slice(3)}</h2>);
    else blocks.push(<p key={blocks.length}>{mark(line)}</p>);
  }
  flush();

  return (
    <div className="container-x max-w-3xl py-12 sm:py-20">
      <h1 className="display text-6xl sm:text-8xl">{page.title}</h1>
      {!page.reviewed && (
        <div role="note" className="border-accent bg-surface mt-8 border-s-4 p-4 text-sm">
          <strong>Template text — store owner must review.</strong> Passages marked{" "}
          <mark className="bg-accent/25 px-1">[REVIEW]</mark> need to be adapted to your business and local
          law before launch. Edit <code>src/content/pages.ts</code> and set <code>reviewed: true</code> to
          hide this notice.
        </div>
      )}
      <div className="prose-store mt-10">{blocks}</div>
      {children}
    </div>
  );
}

function mark(line: string): React.ReactNode {
  const parts = line.split(/(\[REVIEW[^\]]*\])/g);
  return parts.map((p, i) =>
    p.startsWith("[REVIEW") ? (
      <mark key={i} className="bg-accent/25 text-ink px-1">
        {p}
      </mark>
    ) : (
      p
    ),
  );
}
