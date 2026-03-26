"use client";

import { useEffect, useState } from "react";
import { formatRelativeTimeIt, parseHistoryDateString } from "@/lib/relative-time";

/**
 * Relative time runs only after mount so server HTML matches the first client paint
 * (avoids hydration mismatch from `Intl.RelativeTimeFormat` + `Date` differing SSR vs browser).
 */
export function HistoryDateCell({ absolute }: { absolute: string }) {
  const parsed = parseHistoryDateString(absolute);
  const iso = parsed ? parsed.toISOString() : undefined;

  const [relative, setRelative] = useState<string | null>(null);

  useEffect(() => {
    setRelative(formatRelativeTimeIt(absolute));
  }, [absolute]);

  return (
    <div className="flex flex-col gap-0.5 leading-tight">
      <time
        dateTime={iso}
        className="whitespace-nowrap text-zinc-300 tabular-nums"
      >
        {absolute}
      </time>
      {relative ? (
        <span className="text-xs font-medium text-zinc-500" title={relative}>
          {relative}
        </span>
      ) : null}
    </div>
  );
}
