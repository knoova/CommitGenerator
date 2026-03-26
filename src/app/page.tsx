import fs from "fs/promises";
import path from "path";
import { HistoryDateCell } from "@/app/components/HistoryDateCell";
import type { OutVideoItem } from "@/app/components/LocalVideosList";
import { LocalVideosList } from "@/app/components/LocalVideosList";
import { LinkCell } from "@/app/components/LinkCell";
import { SectionCard } from "@/app/components/SectionCard";
import { WebhookSection } from "@/app/components/WebhookSection";

type HistoryRow = {
  date: string;
  author: string;
  title: string;
  release: string;
  youtube?: string;
  facebook?: string;
};

/** Split markdown table row on `|` but not on escaped `\|`. */
const splitTableRow = (row: string): string[] => {
  const cells: string[] = [];
  let cur = "";
  for (let i = 0; i < row.length; i++) {
    const c = row[i]!;
    if (c === "\\" && row[i + 1] === "|") {
      cur += "|";
      i++;
      continue;
    }
    if (c === "|") {
      cells.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  cells.push(cur.trim());
  return cells;
};

const unescapeHistoryCell = (cell: string) => cell.replace(/\\\|/g, "|");

const parseHistory = (content: string): HistoryRow[] => {
  const rows = content
    .split("\n")
    .filter((line) => line.trim().startsWith("|") && !line.includes("---"));

  return rows
    .slice(1)
    .map((row) => splitTableRow(row).map(unescapeHistoryCell))
    .filter((cells) => cells.length >= 6)
    .map((cells) => ({
      date: cells[1] ?? "",
      author: cells[2] ?? "",
      title: cells[3] ?? "",
      release: cells[4] ?? "",
      youtube: cells[5]?.trim() && cells[5].trim() !== "-" ? cells[5] : undefined,
      facebook: cells[6]?.trim() && cells[6].trim() !== "-" ? cells[6] : undefined,
    }));
};

export default async function HomePage() {
  const historyPath = path.join(process.cwd(), "HISTORY.md");
  const outPath = path.join(process.cwd(), "out");

  let historyRows: HistoryRow[] = [];
  let outVideos: OutVideoItem[] = [];

  try {
    const historyContent = await fs.readFile(historyPath, "utf8");
    historyRows = parseHistory(historyContent).slice(0, 12);
  } catch {
    historyRows = [];
  }

  try {
    const outFiles = await fs.readdir(outPath);
    const mp4Names = outFiles.filter((file) => file.endsWith(".mp4"));
    const withStat = await Promise.all(
      mp4Names.map(async (name) => {
        const full = path.join(outPath, name);
        try {
          const s = await fs.stat(full);
          if (!s.isFile()) return null;
          return { name, mtimeMs: s.mtimeMs, sizeBytes: s.size } satisfies OutVideoItem;
        } catch {
          return null;
        }
      }),
    );
    outVideos = withStat.filter((x): x is OutVideoItem => x !== null).slice(0, 12);
  } catch {
    outVideos = [];
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        {/* Hero */}
        <header className="mb-12 text-center sm:mb-16">
          <p className="mb-3 inline-flex items-center rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-fuchsia-200/90">
            Pipeline · Remotion · MiniMax
          </p>
          <h1 className="mx-auto max-w-3xl text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl">
            <span className="bg-gradient-to-r from-fuchsia-400 via-pink-300 to-cyan-400 bg-clip-text text-transparent">
              Idiotsyncratic Commits
            </span>{" "}
            <span className="text-zinc-100">Generator</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
            Il repository è il motore: ogni push può diventare un mini video karaoke. I file MP4
            finiscono sulle{" "}
            <span className="font-medium text-zinc-300">GitHub Releases</span> (e opzionalmente
            YouTube / Facebook).
          </p>
        </header>

        <div className="flex flex-col gap-8">
          <WebhookSection />

          <SectionCard
            title="Video locali"
            description="Ultimi file generati nella cartella out/ su questa macchina."
          >
            {outVideos.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-700/80 bg-zinc-950/40 px-4 py-8 text-center text-sm text-zinc-500">
                Nessun MP4 in <code className="font-mono text-zinc-400">out/</code>. Dopo un run
                della pipeline li vedrai qui.
              </p>
            ) : (
              <LocalVideosList items={outVideos} />
            )}
          </SectionCard>

          <SectionCard
            title="Storico release"
            description="Righe lette da HISTORY.md (ultimi 12). Link a release e social quando presenti."
          >
            {historyRows.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-700/80 bg-zinc-950/40 px-4 py-8 text-center text-sm text-zinc-500">
                Nessuna riga in <code className="font-mono text-zinc-400">HISTORY.md</code> ancora.
              </p>
            ) : (
              <div className="-mx-1 overflow-x-auto rounded-xl border border-white/5">
                <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.03]">
                      <th className="whitespace-nowrap px-3 py-3 font-semibold text-zinc-300 sm:px-4">
                        Data
                      </th>
                      <th className="whitespace-nowrap px-3 py-3 font-semibold text-zinc-300 sm:px-4">
                        Autore
                      </th>
                      <th className="min-w-[140px] px-3 py-3 font-semibold text-zinc-300 sm:px-4">
                        Titolo
                      </th>
                      <th className="whitespace-nowrap px-3 py-3 font-semibold text-zinc-300 sm:px-4">
                        Release
                      </th>
                      <th className="whitespace-nowrap px-3 py-3 font-semibold text-zinc-300 sm:px-4">
                        YouTube
                      </th>
                      <th className="whitespace-nowrap px-3 py-3 font-semibold text-zinc-300 sm:px-4">
                        Facebook
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRows.map((row, idx) => (
                      <tr
                        key={`${row.date}-${idx}`}
                        className="border-b border-white/[0.06] transition-colors hover:bg-white/[0.03]"
                      >
                        <td className="px-3 py-3 sm:px-4">
                          <HistoryDateCell absolute={row.date} />
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-zinc-300 sm:px-4">
                          {row.author}
                        </td>
                        <td className="max-w-[220px] px-3 py-3 text-zinc-200 sm:max-w-xs sm:px-4">
                          <span className="line-clamp-2" title={row.title}>
                            {row.title}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 sm:px-4">
                          <LinkCell value={row.release} />
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 sm:px-4">
                          <LinkCell value={row.youtube ?? "-"} />
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 sm:px-4">
                          <LinkCell value={row.facebook ?? "-"} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>

        <footer className="mt-14 border-t border-white/10 pt-8 text-center text-xs text-zinc-600">
          Commit Karaoke · Next.js + Remotion · Webhook <code className="font-mono">/api/github</code>
        </footer>
      </div>
    </div>
  );
}
