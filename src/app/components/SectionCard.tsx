import type { ReactNode } from "react";

export function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-lg shadow-black/20 backdrop-blur-sm transition-colors hover:border-white/[0.14] hover:bg-white/[0.05]">
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight text-white">{title}</h2>
        {description ? (
          <p className="text-sm leading-relaxed text-zinc-400">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
