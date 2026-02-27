import fs from "fs/promises";
import path from "path";

type HistoryRow = {
  date: string;
  author: string;
  title: string;
  release: string;
};

const parseHistory = (content: string): HistoryRow[] => {
  const rows = content
    .split("\n")
    .filter((line) => line.trim().startsWith("|") && !line.includes("---"));

  return rows
    .slice(1)
    .map((row) => row.split("|").map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 6)
    .map((cells) => ({
      date: cells[1] ?? "",
      author: cells[2] ?? "",
      title: cells[3] ?? "",
      release: cells[4] ?? "",
    }));
};

export default async function HomePage() {
  const historyPath = path.join(process.cwd(), "HISTORY.md");
  const outPath = path.join(process.cwd(), "out");

  let historyRows: HistoryRow[] = [];
  let files: string[] = [];

  try {
    const historyContent = await fs.readFile(historyPath, "utf8");
    historyRows = parseHistory(historyContent).slice(0, 10);
  } catch {
    historyRows = [];
  }

  try {
    const outFiles = await fs.readdir(outPath);
    files = outFiles.filter((file) => file.endsWith(".mp4")).slice(0, 10);
  } catch {
    files = [];
  }

  return (
    <main style={{ maxWidth: 1080, margin: "0 auto", padding: "2rem 1.25rem" }}>
      <h1 style={{ margin: 0, fontSize: "2rem" }}>Idiotsyncratic Commits Generator</h1>
      <p style={{ opacity: 0.85 }}>
        Il repository e&apos; il motore. I video finali sono pubblicati nelle GitHub Releases.
      </p>

      <section style={{ marginTop: "2rem" }}>
        <h2>Webhook Endpoint</h2>
        <code>/api/github</code>
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Ultimi video locali (out/)</h2>
        {files.length === 0 ? (
          <p>Nessun file video locale trovato.</p>
        ) : (
          <ul>
            {files.map((file) => (
              <li key={file}>
                <code>{file}</code>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Storico Releases (HISTORY.md)</h2>
        {historyRows.length === 0 ? (
          <p>Nessuna entry nello storico.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th align="left">Data</th>
                <th align="left">Autore</th>
                <th align="left">Titolo</th>
                <th align="left">Release</th>
              </tr>
            </thead>
            <tbody>
              {historyRows.map((row, idx) => (
                <tr key={`${row.date}-${idx}`}>
                  <td>{row.date}</td>
                  <td>{row.author}</td>
                  <td>{row.title}</td>
                  <td>{row.release}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
