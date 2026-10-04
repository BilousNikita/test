export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <h1 className="display text-4xl sm:text-5xl">{title}</h1>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`border-line bg-surface border p-5 ${className}`}>
      {title && <h2 className="mb-4 text-xs font-semibold tracking-[0.16em] uppercase">{title}</h2>}
      {children}
    </section>
  );
}

const TONES: Record<string, string> = {
  pending: "bg-subtle text-ink",
  paid: "bg-accent/20 text-ink",
  processing: "bg-accent/20 text-ink",
  placed: "bg-accent/20 text-ink",
  shipped: "bg-ink text-bg",
  delivered: "bg-success/15 text-success",
  cancelled: "bg-danger/10 text-danger",
  refunded: "bg-danger/10 text-danger",
  active: "bg-success/15 text-success",
  draft: "bg-subtle text-muted",
  archived: "bg-subtle text-muted",
};

export function Badge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${TONES[status] ?? "bg-subtle"}`}
    >
      {status}
    </span>
  );
}

export function Field({
  label,
  htmlFor,
  children,
  hint,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="label">
        {label}
      </label>
      {children}
      {hint && <p className="text-muted mt-1 text-xs">{hint}</p>}
    </div>
  );
}

export const th = "px-3 py-2 text-start text-[11px] font-semibold tracking-wide text-muted uppercase";
export const td = "px-3 py-2.5 align-top";
