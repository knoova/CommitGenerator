"use client";

import { useMemo, useState } from "react";

export type OutVideoItem = {
  name: string;
  mtimeMs: number;
  sizeBytes: number;
};

type SortKey = "name" | "mtime";

function streamUrl(name: string) {
  return `/api/out-video/${encodeURIComponent(name)}`;
}

function downloadUrl(name: string) {
  return `/api/out-video/${encodeURIComponent(name)}?download=1`;
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1);
  const value = bytes / Math.pow(k, i);
  const digits = i === 0 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[i]}`;
}

function formatDurationSeconds(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
}

export function LocalVideosList({ items }: { items: OutVideoItem[] }) {
  const [sortBy, setSortBy] = useState<SortKey>("mtime");
  const [newestFirst, setNewestFirst] = useState(true);
  const [durationsByName, setDurationsByName] = useState<Record<string, number>>(
    {},
  );

  const sorted = useMemo(() => {
    const copy = [...items];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") {
        cmp = a.name.localeCompare(b.name, "it", { sensitivity: "base" });
      } else {
        cmp = a.mtimeMs - b.mtimeMs;
      }
      return newestFirst ? -cmp : cmp;
    });
    return copy;
  }, [items, sortBy, newestFirst]);

  const sortBtn = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 ${
      active
        ? "border border-cyan-500/40 bg-cyan-950/50 text-cyan-200"
        : "border border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
    }`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Ordina
        </span>
        <button
          type="button"
          className={sortBtn(sortBy === "name")}
          onClick={() => setSortBy("name")}
        >
          Nome file
        </button>
        <button
          type="button"
          className={sortBtn(sortBy === "mtime")}
          onClick={() => setSortBy("mtime")}
        >
          Data modifica
        </button>
        <button
          type="button"
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
          onClick={() => setNewestFirst((v) => !v)}
          title={newestFirst ? "Inverti ordine" : "Inverti ordine"}
        >
          {newestFirst ? "Prima i più recenti ↓" : "Prima i meno recenti ↑"}
        </button>
      </div>

      <ul className="space-y-8">
        {sorted.map((item) => (
          <li
            key={item.name}
            className="overflow-hidden rounded-xl border border-white/10 bg-black/30"
          >
            <video
              className="aspect-video w-full bg-zinc-950 object-contain"
              controls
              preload="metadata"
              src={streamUrl(item.name)}
              onLoadedMetadata={(e) => {
                const dur = e.currentTarget.duration;
                if (!Number.isFinite(dur) || dur <= 0) return;
                setDurationsByName((prev) => {
                  if (prev[item.name] !== undefined) return prev;
                  return { ...prev, [item.name]: dur };
                });
              }}
            />
            <div className="flex flex-col gap-3 border-t border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-sm font-medium text-zinc-200">{item.name}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Modificato:{" "}
                  <time dateTime={new Date(item.mtimeMs).toISOString()}>
                    {new Date(item.mtimeMs).toLocaleString("it-IT", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </time>
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Dimensione: {formatBytes(item.sizeBytes)}
                  {durationsByName[item.name] !== undefined ? (
                    <> · Durata: {formatDurationSeconds(durationsByName[item.name])}</>
                  ) : null}
                </p>
              </div>
              <a
                href={downloadUrl(item.name)}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-cyan-500/35 bg-cyan-950/40 px-4 py-2 text-sm font-medium text-cyan-200 transition-colors hover:border-cyan-400/60 hover:bg-cyan-900/50"
                download={item.name}
              >
                <span aria-hidden>⬇</span>
                Scarica MP4
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
