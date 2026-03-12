"use server";
import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { config } from "@/config";
import { logError } from "@/lib/logger";
import type { Genre } from "@/remotion/types";

const execFileAsync = promisify(execFile);

// MiniMax Music 2.5+ genera sempre clip di ~30-60 secondi con voce cantata
const GENERATION_TIMEOUT_MS = 180_000; // 3 minuti

// Prompt di stile per genere (in inglese per MiniMax)
const musicPromptByGenre: Record<Genre, string> = {
  rock: "energetic rock anthem, powerful electric guitar, driving drums, stadium rock, passionate vocals",
  pop: "catchy upbeat pop, bright synths, dance groove, cheerful melody, modern pop production",
  opera: "dramatic Italian opera, orchestral strings, operatic soprano, classical grandeur, emotional crescendo",
  reggaeton: "reggaeton beat, dembow rhythm, latin bass, tropical percussion, urban latin groove",
  "death-metal": "aggressive death metal, heavy distorted guitar, blast beat drums, intense brutal vocals",
};

type MiniMaxResponse = {
  data?: {
    audio?: string; // hex-encoded MP3
    status?: number; // 1 = in progress, 2 = completed
  };
  base_resp?: {
    status_code?: number;
    status_msg?: string;
  };
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
  const mp3Path = path.join(params.tempDir, `${params.shortSha}_song.mp3`);
  const prompt = musicPromptByGenre[params.genre];
  const formattedLyrics = formatLyricsForMiniMax(params.lyrics);

  console.log(`[audio-gen] MiniMax Music 2.5+: genre=${params.genre}, lyrics=${formattedLyrics.length} chars`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch("https://api.minimax.io/v1/music_generation", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.MINIMAX_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "music-2.5+",
        lyrics: formattedLyrics,
        prompt,
        output_format: "hex",
        audio_setting: {
          sample_rate: 44100,
          bitrate: 256000,
          format: "mp3",
        },
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`MiniMax API error ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as MiniMaxResponse;

  if (data.base_resp?.status_code !== 0) {
    throw new Error(
      `MiniMax API error: ${data.base_resp?.status_msg ?? "risposta non valida"} (code ${data.base_resp?.status_code})`,
    );
  }

  const hexAudio = data.data?.audio;
  if (!hexAudio) {
    throw new Error("MiniMax non ha restituito audio");
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
