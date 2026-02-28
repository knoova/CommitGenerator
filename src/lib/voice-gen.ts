"use server";
import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import * as Echogarden from "echogarden";
import { config } from "@/config";
import type { Genre } from "@/remotion/types";

const execFileAsync = promisify(execFile);
const ITALIAN_VOICE = "it_IT-paola-medium";

// Funzione principale - sceglie tra voce parlata o cantata in base al genere
export const generateVoice = async (params: {
  lyrics: string;
  genre: Genre;
  commitSha: string;
  durationSeconds?: number;
}): Promise<{ voicePath: string }> => {
  const tempDir = path.join(process.cwd(), config.tempDir);
  await fs.mkdir(tempDir, { recursive: true });

  const shortSha = params.commitSha.slice(0, 7);
  const voicePath = path.join(tempDir, `${shortSha}_voice.wav`);

  // Generi che meritano voce cantata
  const sungGenres = ["pop", "rock", "opera"];
  const shouldSing = sungGenres.includes(params.genre);

  if (shouldSing) {
    return await generateSungVoice({
      lyrics: params.lyrics,
      genre: params.genre,
      commitSha: params.commitSha,
      durationSeconds: params.durationSeconds,
    });
  } else {
    return await generateSpokenVoice({
      lyrics: params.lyrics,
      genre: params.genre,
      commitSha: params.commitSha,
      durationSeconds: params.durationSeconds,
    });
  }
};

// Genera voce cantata usando Echogarden + effetti audio
const generateSungVoice = async (params: {
  lyrics: string;
  genre: Genre;
  commitSha: string;
  durationSeconds?: number;
}): Promise<{ voicePath: string }> => {
  const tempDir = path.join(process.cwd(), config.tempDir);
  const shortSha = params.commitSha.slice(0, 7);
  
  // Genera voce base con Echogarden
  const baseVoicePath = path.join(tempDir, `${shortSha}_voice_base.wav`);
  const { audio } = await Echogarden.synthesize(params.lyrics, {
    engine: "vits",
    language: "it",
    voice: ITALIAN_VOICE,
    splitToSentences: false,
    outputAudioFormat: { codec: "wav" },
  });

  const wavBuffer = Buffer.isBuffer(audio) ? audio : Buffer.from(audio as unknown as ArrayBuffer);
  await fs.writeFile(baseVoicePath, wavBuffer);

  // Applica effetti per renderla più cantata
  const sungVoicePath = path.join(tempDir, `${shortSha}_voice_sung.wav`);
  
  await execFileAsync("ffmpeg", [
    "-y",
    "-i", baseVoicePath,
    "-af", "chorus=0.7:0.9:55:0.4:0.25:2, flanger=delay=10:depth=5:regen=30:width=71:speed=0.5:shape=sin, aecho=0.8:0.9:1000:0.3",
    sungVoicePath,
  ]);

  // Pulisci file temporanei
  try { await fs.unlink(baseVoicePath); } catch { /* ignore */ }

  console.log(
    `[voice-gen] Generated sung voice: ${(wavBuffer.length / 1024).toFixed(0)}KB, ` +
      `genre=${params.genre}, duration=${params.durationSeconds || 'auto'}, engine=vits, voice=${ITALIAN_VOICE}`,
  );

  return { voicePath: sungVoicePath };
};

// Genera voce parlata tradizionale
const generateSpokenVoice = async (params: {
  lyrics: string;
  genre: Genre;
  commitSha: string;
  durationSeconds?: number;
}): Promise<{ voicePath: string }> => {
  const tempDir = path.join(process.cwd(), config.tempDir);
  const shortSha = params.commitSha.slice(0, 7);
  const voicePath = path.join(tempDir, `${shortSha}_voice.wav`);

  const { audio } = await Echogarden.synthesize(params.lyrics, {
    engine: "vits",
    language: "it",
    voice: ITALIAN_VOICE,
    splitToSentences: false,
    outputAudioFormat: { codec: "wav" },
  });

  const wavBuffer = Buffer.isBuffer(audio) ? audio : Buffer.from(audio as unknown as ArrayBuffer);
  await fs.writeFile(voicePath, wavBuffer);

  console.log(
    `[voice-gen] Generated spoken voice: ${(wavBuffer.length / 1024).toFixed(0)}KB, ` +
      `genre=${params.genre}, duration=${params.durationSeconds || 'auto'}, engine=vits, voice=${ITALIAN_VOICE}`,
  );

  return { voicePath };
};
