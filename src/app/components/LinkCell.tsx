/**
 * Renders [label](url) markdown links from HISTORY.md cells; otherwise plain text.
 */
export function LinkCell({ value }: { value: string }) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "-") {
    return <span className="text-zinc-500">—</span>;
  }
  const m = trimmed.match(/^\[([^\]]+)\]\((https?:[^)\s]+)\)$/);
  if (m) {
    const [, label, href] = m;
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 font-medium text-cyan-300 hover:text-cyan-200"
      >
        {label}
        <span className="text-zinc-500" aria-hidden>
          ↗
        </span>
      </a>
    );
  }
  return <span className="text-zinc-300">{trimmed}</span>;
}
