"use server";
import fs from "fs/promises";
import path from "path";

const LOGS_DIR = path.join(process.cwd(), "logs");
const LOG_FILE = "errors.log";

type LogContext = {
  caller: string;
  commitSha: string;
  commitMessage: string;
  error: unknown;
};

const formatError = (err: unknown): string => {
  if (err instanceof Error) {
    return `${err.message}${err.stack ? `\n${err.stack}` : ""}`;
  }
  return String(err);
};

export const logError = async (ctx: LogContext): Promise<void> => {
  const timestamp = new Date().toISOString();
  const shortSha = ctx.commitSha.slice(0, 7);
  const errorStr = formatError(ctx.error);
  const line = `${timestamp} | ${ctx.caller} | ${shortSha} | ${ctx.commitMessage.replace(/\n/g, " ").slice(0, 80)} | ${errorStr.replace(/\n/g, " ")}\n`;

  await fs.mkdir(LOGS_DIR, { recursive: true });
  await fs.appendFile(path.join(LOGS_DIR, LOG_FILE), line);
};
