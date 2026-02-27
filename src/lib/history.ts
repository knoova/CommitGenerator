"use server";
import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const HISTORY_HEADER = [
  "# Video History",
  "",
  "| Data | Autore | Titolo | Release | YouTube | Facebook |",
  "|------|--------|--------|---------|---------|----------|",
].join("\n");

const sanitizeCell = (value: string) => value.replaceAll("|", "\\|").trim();

const linkOrDash = (url: string | undefined, label: string) =>
  url ? `[${label}](${url})` : "-";

export const appendHistoryRow = async (params: {
  date: string;
  author: string;
  title: string;
  releaseUrl: string;
  tagName: string;
  youtubeUrl?: string;
  facebookUrl?: string;
}) => {
  const historyPath = path.join(process.cwd(), "HISTORY.md");

  let content = HISTORY_HEADER;
  try {
    content = await fs.readFile(historyPath, "utf8");
  } catch {
    content = HISTORY_HEADER;
  }

  const lines = content.split("\n");

  const headerIdx = lines.findIndex((l) => l.startsWith("| Data"));
  if (headerIdx !== -1 && !lines[headerIdx]!.includes("YouTube")) {
    lines[headerIdx] = "| Data | Autore | Titolo | Release | YouTube | Facebook |";
    const sepIdx = headerIdx + 1;
    if (sepIdx < lines.length && lines[sepIdx]!.startsWith("|---")) {
      lines[sepIdx] = "|------|--------|--------|---------|---------|----------|";
    }
  }

  const insertAt = lines.findIndex((line) => line.startsWith("|") && !line.includes("---"));
  const dataStart = insertAt === -1 ? lines.length : insertAt + 2;

  const releaseCell = params.releaseUrl
    ? `[${params.tagName}](${params.releaseUrl})`
    : params.tagName;
  const ytCell = linkOrDash(params.youtubeUrl, "YouTube");
  const fbCell = linkOrDash(params.facebookUrl, "Facebook");

  const row = `| ${sanitizeCell(params.date)} | ${sanitizeCell(params.author)} | ${sanitizeCell(params.title)} | ${sanitizeCell(releaseCell)} | ${sanitizeCell(ytCell)} | ${sanitizeCell(fbCell)} |`;

  lines.splice(dataStart, 0, row);
  const final = lines.join("\n");
  await fs.writeFile(historyPath, final.endsWith("\n") ? final : `${final}\n`, "utf8");
};

export const pushHistoryOnly = async () => {
  await execFileAsync("git", ["add", "HISTORY.md"]);
  await execFileAsync("git", ["commit", "-m", "docs: update HISTORY.md [skip ci]"]);
  await execFileAsync("git", ["push"]);
};
