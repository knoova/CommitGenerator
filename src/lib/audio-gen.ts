"use server";
import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { z } from "zod";
import { config } from "@/config";
import { logError } from "@/lib/logger";
import type { Genre } from "@/remotion/types";

const execFileAsync = promisify(execFile);

// MiniMax Music 2.5+ genera sempre clip di ~30-60 secondi con voce cantata
const GENERATION_TIMEOUT_MS = 180_000; // 3 minuti
const MINIMAX_MAX_RETRIES = 4;
const MINIMAX_RETRY_BASE_MS = 1_500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const truncateForLog = (s: string, max = 600) => (s.length <= max ? s : `${s.slice(0, max)}…`);

/** `base_resp` presente nelle risposte MiniMax (successo ed errori applicativi). */
const miniMaxBaseRespSchema = z.object({
  status_code: z.number(),
  status_msg: z.string().optional(),
});

/** Risposta attesa quando `base_resp.status_code === 0` e `output_format: "hex"`. */
const miniMaxMusicDataSchema = z.object({
  audio: z.string().min(1, "audio hex mancante o vuoto"),
  status: z.number().optional(),
});

const readResponseText = async (res: Response): Promise<string> => res.text();

const parseJsonBody = (text: string, httpStatus: number): unknown => {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error(`MiniMax: corpo risposta vuoto (HTTP ${httpStatus})`);
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    throw new Error(`MiniMax: risposta non-JSON (HTTP ${httpStatus}): ${truncateForLog(trimmed)}`);
  }
};

/**
 * Valida JSON MiniMax music_generation e restituisce l’hex MP3.
 * @see https://platform.minimax.io/docs/guides/music-generation
 */
const parseMiniMaxMusicSuccess = (json: unknown): string => {
  const root = z.record(z.string(), z.unknown()).safeParse(json);
  if (!root.success) {
    throw new Error(
      `MiniMax: JSON root non valido: ${JSON.stringify(z.treeifyError(root.error))}`,
    );
  }
  const obj = root.data;

  const br = miniMaxBaseRespSchema.safeParse(obj.base_resp);
  if (!br.success) {
    throw new Error(
      `MiniMax: base_resp mancante o non valido: ${JSON.stringify(z.treeifyError(br.error))}. Raw keys: ${Object.keys(obj).join(", ")}`,
    );
  }

  const { status_code, status_msg } = br.data;
  if (status_code !== 0) {
    throw new Error(
      `MiniMax (errore applicativo): ${status_msg ?? "nessun messaggio"} [status_code=${status_code}]`,
    );
  }

  const dataParsed = miniMaxMusicDataSchema.safeParse(obj.data);
  if (!dataParsed.success) {
    throw new Error(
      `MiniMax: status_code=0 ma data non valido: ${JSON.stringify(z.treeifyError(dataParsed.error))}`,
    );
  }

  const hex = dataParsed.data.audio;
  const buf = Buffer.from(hex, "hex");
  if (buf.length === 0) {
    throw new Error(
      "MiniMax: campo data.audio presente ma non è hex MP3 valido (buffer vuoto dopo decode)",
    );
  }

  return hex;
};

const httpStatusShouldRetry = (status: number): boolean =>
  status === 429 || status === 502 || status === 503;

const errorMessageIndicatesRetry = (msg: string): boolean =>
  /\b429\b|rate\s*limit|too\s*many\s*requests|temporarily\s*unavailable|503|502|timeout/i.test(
    msg,
  );

const backoffMs = (attempt: number): number =>
  MINIMAX_RETRY_BASE_MS * 2 ** attempt + Math.floor(Math.random() * 400);

// Prompt di stile per genere (in inglese per MiniMax)
const musicPromptByGenre: Record<Genre, string> = {
  rock: "energetic rock anthem, powerful electric guitar, driving drums, stadium rock, passionate vocals",
  pop: "catchy upbeat pop, bright synths, dance groove, cheerful melody, modern pop production",
  opera: "dramatic Italian opera, orchestral strings, operatic soprano, classical grandeur, emotional crescendo",
  reggaeton: "reggaeton beat, dembow rhythm, latin bass, tropical percussion, urban latin groove",
  "death-metal": "aggressive death metal, heavy distorted guitar, blast beat drums, intense brutal vocals",
};

// Formatta i testi con tag struttura che MiniMax usa per organizzare la canzone.
// I tag non vengono mostrati nel video (il karaoke usa generatedText originale).
const formatLyricsForMiniMax = (lyrics: string): string => {
  const lines = lyrics.split("\n").filter((l) => l.trim());
  const mid = Math.ceil(lines.length / 2);
  const verse = lines.slice(0, mid).join("\n");
  const chorus = lines.slice(mid).join("\n");
  if (chorus.trim()) {
    return `[Verse]\n${verse}\n\n[Chorus]\n${chorus}\n\n[Outro]\n${verse.split("\n")[0] ?? ""}`;
  }
  return `[Verse]\n${verse}\n\n[Outro]\n${lines[0] ?? ""}`;
};

// --------------- Generazione canzone completa via MiniMax Music 2.5+ ---------------

const generateSong = async (params: {
  genre: Genre;
  lyrics: string; // testo grezzo dall'LLM (senza tag struttura)
  shortSha: string;
  tempDir: string;
}): Promise<string> => {
  const apiKey = config.MINIMAX_API_KEY;
  if (!apiKey) {
    throw new Error(
      "MINIMAX_API_KEY is not set. Add it to .env to generate music (see .env.example).",
    );
  }

  const mp3Path = path.join(params.tempDir, `${params.shortSha}_song.mp3`);
  const prompt = musicPromptByGenre[params.genre];
  const formattedLyrics = formatLyricsForMiniMax(params.lyrics);

  console.log(`[audio-gen] MiniMax Music 2.5+: genre=${params.genre}, lyrics=${formattedLyrics.length} chars`);

  const body = JSON.stringify({
    model: "music-2.5+",
    lyrics: formattedLyrics,
    prompt,
    output_format: "hex",
    audio_setting: {
      sample_rate: 44100,
      bitrate: 256000,
      format: "mp3",
    },
  });

  let lastErr: unknown;
  let hexAudio: string | undefined;

  for (let attempt = 0; attempt < MINIMAX_MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);
    try {
      const response = await fetch("https://api.minimax.io/v1/music_generation", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body,
        signal: controller.signal,
      });

      const text = await readResponseText(response);

      let json: unknown;
      try {
        json = parseJsonBody(text, response.status);
      } catch (parseBodyErr) {
        if (
          attempt < MINIMAX_MAX_RETRIES - 1 &&
          httpStatusShouldRetry(response.status)
        ) {
          const wait = backoffMs(attempt);
          console.warn(
            `[audio-gen] MiniMax HTTP ${response.status} con body non-JSON, retry tra ${wait}ms`,
          );
          await sleep(wait);
          continue;
        }
        if (!response.ok) {
          throw new Error(
            `MiniMax HTTP ${response.status}: ${truncateForLog(text)}`,
          );
        }
        throw parseBodyErr;
      }

      if (!response.ok) {
        if (httpStatusShouldRetry(response.status) && attempt < MINIMAX_MAX_RETRIES - 1) {
          const wait = backoffMs(attempt);
          console.warn(
            `[audio-gen] MiniMax HTTP ${response.status}, attendo ${wait}ms e riprovo (${attempt + 1}/${MINIMAX_MAX_RETRIES})`,
          );
          await sleep(wait);
          continue;
        }
        let detail = truncateForLog(text);
        if (
          typeof json === "object" &&
          json !== null &&
          "base_resp" in json
        ) {
          const br = miniMaxBaseRespSchema.safeParse(
            (json as { base_resp: unknown }).base_resp,
          );
          if (br.success && br.data.status_msg) {
            detail = `${br.data.status_msg} [code=${br.data.status_code}]`;
          }
        }
        throw new Error(`MiniMax HTTP ${response.status}: ${detail}`);
      }

      try {
        hexAudio = parseMiniMaxMusicSuccess(json);
        break;
      } catch (parseErr) {
        const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
        if (errorMessageIndicatesRetry(msg) && attempt < MINIMAX_MAX_RETRIES - 1) {
          const wait = backoffMs(attempt);
          console.warn(`[audio-gen] MiniMax errore recuperabile, retry tra ${wait}ms: ${msg}`);
          await sleep(wait);
          lastErr = parseErr;
          continue;
        }
        throw parseErr;
      }
    } catch (e) {
      lastErr = e;
      if (e instanceof Error && e.name === "AbortError") {
        throw new Error(`MiniMax: timeout dopo ${GENERATION_TIMEOUT_MS / 1000}s`);
      }
      const retriable =
        attempt < MINIMAX_MAX_RETRIES - 1 &&
        (e instanceof TypeError ||
          (e instanceof Error &&
            /fetch|network|ECONNRESET|ETIMEDOUT|socket/i.test(e.message)));
      if (retriable) {
        const wait = backoffMs(attempt);
        console.warn(`[audio-gen] MiniMax rete/transiente, retry tra ${wait}ms:`, e);
        await sleep(wait);
        continue;
      }
      throw e;
    } finally {
      clearTimeout(timeout);
    }
  }

  if (!hexAudio) {
    throw lastErr instanceof Error
      ? lastErr
      : new Error("MiniMax: generazione fallita dopo i tentativi");
  }

  const audioBuffer = Buffer.from(hexAudio, "hex");
  await fs.writeFile(mp3Path, audioBuffer);

  console.log(`[audio-gen] MiniMax canzone generata: ${mp3Path} (${(audioBuffer.length / 1024).toFixed(0)}KB)`);
  return mp3Path;
};

// --------------- Trim opzionale per adattare alla durata video ---------------

const trimAudio = async (inputPath: string, outputPath: string, durationSeconds: number): Promise<void> => {
  await execFileAsync("ffmpeg", [
    "-y",
    "-i", inputPath,
    "-t", durationSeconds.toString(),
    "-acodec", "copy",
    outputPath,
  ]);
};

// --------------- API pubblica ---------------

export const generateAudio = async (params: {
  genre: Genre;
  commitMessage: string;
  commitSha: string;
  lyrics: string; // testo con tag struttura [Verse]/[Chorus]
  durationSeconds?: number;
}): Promise<{ audioAbsolutePath: string }> => {
  const tempDir = path.join(process.cwd(), config.tempDir);
  await fs.mkdir(tempDir, { recursive: true });

  const shortSha = params.commitSha.slice(0, 7);
  const finalMp3 = path.join(tempDir, `${shortSha}.mp3`);

  let songPath: string;
  try {
    songPath = await generateSong({
      genre: params.genre,
      lyrics: params.lyrics,
      shortSha,
      tempDir,
    });
  } catch (err) {
    await logError({
      caller: "generateSong",
      commitSha: params.commitSha,
      commitMessage: params.commitMessage,
      error: err,
    });
    throw err instanceof Error ? err : new Error(String(err));
  }

  // Trim alla durata video se richiesto
  if (params.durationSeconds && songPath !== finalMp3) {
    await trimAudio(songPath, finalMp3, params.durationSeconds);
    try { await fs.unlink(songPath); } catch { /* ignore */ }
  } else {
    await fs.rename(songPath, finalMp3);
  }

  console.log(`[audio-gen] Audio finale: ${finalMp3}`);
  return { audioAbsolutePath: finalMp3 };
};
