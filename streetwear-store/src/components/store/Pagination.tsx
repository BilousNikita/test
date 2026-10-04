import Link from "next/link";

export function Pagination({
  page,
  pages,
  basePath,
  params,
}: {
  page: number;
  pages: number;
  basePath: string;
  params: Record<string, string | string[] | undefined>;
}) {
  if (pages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (k === "page" || v == null) continue;
      sp.set(k, Array.isArray(v) ? v.join(",") : v);
    }
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return `${basePath}${qs ? `?${qs}` : ""}`;
  };
  return (
    <nav className="mt-16 flex items-center justify-center gap-2" aria-label="Pagination">
      {page > 1 && (
        <Link
          href={href(page - 1)}
          className="border-line hover:border-ink h-10 border px-4 text-xs leading-10 font-semibold uppercase"
          rel="prev"
        >
          Prev
        </Link>
      )}
      {Array.from({ length: pages }, (_, i) => i + 1)
        .filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 1)
        .map((p, i, arr) => (
          <span key={p} className="flex items-center gap-2">
            {i > 0 && p - arr[i - 1]! > 1 && <span className="text-muted">…</span>}
            <Link
              href={href(p)}
              aria-current={p === page ? "page" : undefined}
              className={`h-10 w-10 border text-center text-xs leading-10 font-semibold ${p === page ? "border-ink bg-ink text-bg" : "border-line hover:border-ink"}`}
            >
              {p}
            </Link>
          </span>
        ))}
      {page < pages && (
        <Link
          href={href(page + 1)}
          className="border-line hover:border-ink h-10 border px-4 text-xs leading-10 font-semibold uppercase"
          rel="next"
        >
          Next
        </Link>
      )}
    </nav>
  );
}
