/**
 * Parse HISTORY.md date cells like `2026-02-28 17:07` as local time.
 */
export function parseHistoryDateString(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/**
 * Italian relative time (e.g. "3 giorni fa") using `Intl.RelativeTimeFormat`.
 */
export function formatRelativeTimeIt(
  absolute: string,
  now: Date = new Date(),
): string | null {
  const d = parseHistoryDateString(absolute);
  if (!d) return null;

  const diffSec = (d.getTime() - now.getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("it", { numeric: "auto" });
  const absSec = Math.abs(diffSec);

  if (absSec < 45) {
    return rtf.format(Math.trunc(diffSec), "second");
  }
  if (absSec < 3600) {
    return rtf.format(Math.trunc(diffSec / 60), "minute");
  }
  if (absSec < 86400) {
    return rtf.format(Math.trunc(diffSec / 3600), "hour");
  }
  if (absSec < 86400 * 7) {
    return rtf.format(Math.trunc(diffSec / 86400), "day");
  }
  if (absSec < 86400 * 45) {
    return rtf.format(Math.trunc(diffSec / (86400 * 30)), "month");
  }
  return rtf.format(Math.trunc(diffSec / (86400 * 365)), "year");
}
