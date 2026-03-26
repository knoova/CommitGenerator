"use server";
import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { WaveFile } from "wavefile";
import { config } from "@/config";
import type { Genre } from "@/remotion/types";

const execFileAsync = promisify(execFile);

/**
 * Allinea la voce a una durata fissa (trim se troppo lunga, silenzio in coda se corta)
 * e converte a 44.1kHz mono PCM — compatibile con mix ffmpeg tipico (instrumental MP3).
 */
const adjustVoiceToDuration = async (
  inputWav: string,
  outputWav: string,
  durationSeconds: number,
): Promise<void> => {
  const t = Math.max(0.25, durationSeconds);
  const tf = t.toFixed(3);
  await execFileAsync("ffmpeg", [
    "-y",
    "-i",
    inputWav,
    "-af",
    `atrim=0:${tf},apad=whole_dur=${tf}`,
    "-ar",
    "44100",
    "-ac",
    "1",
    "-c:a",
    "pcm_s16le",
    outputWav,
  ]);
};

// Istruzioni di stile per genere musicale
const styleByGenre: Record<Genre, string> = {
  rock: "con voce potente, ritmica e appassionata, come in un anthem rock da stadio",
  pop: "con tono allegro, melodico e coinvolgente, come in una canzone pop radiofonica",
  opera: "con tono lirico, drammatico e vibrante, come in un'aria d'opera italiana",
  reggaeton: "con ritmo sincopato, cadenza latina rilassata e groove tropicale",
  "death-metal": "con tono aggressivo, deciso e molto intenso",
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: { mimeType?: string; data?: string };
      }>;
    };
  }>;
  error?: { message?: string };
};

export const generateVoice = async (params: {
  lyrics: string;
  genre: Genre;
  commitSha: string;
  durationSeconds?: number;
}): Promise<{ voicePath: string }> => {
  const tempDir = path.join(process.cwd(), config.tempDir);
  await fs.mkdir(tempDir, { recursive: true });

  const shortSha = params.commitSha.slice(0, 7);
  const rawPath = path.join(tempDir, `${shortSha}_voice_raw.wav`);
  const voicePath = path.join(tempDir, `${shortSha}_voice.wav`);

  const style = styleByGenre[params.genre];
  const prompt = `Leggi il seguente testo in italiano ${style}:\n\n${params.lyrics}`;

  const model = "gemini-2.5-flash-preview-tts";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Aoede" },
          },
          languageCode: "it-IT",
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini TTS error ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as GeminiResponse;

  if (data.error?.message) {
    throw new Error(`Gemini TTS API error: ${data.error.message}`);
  }

  const audioBase64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!audioBase64) {
    throw new Error("Gemini TTS non ha restituito dati audio");
  }

  // L'audio è PCM L16 a 24000Hz, mono — convertiamo in WAV con WaveFile
  const pcmBuffer = Buffer.from(audioBase64, "base64");
  const int16Data = new Int16Array(
    pcmBuffer.buffer,
    pcmBuffer.byteOffset,
    pcmBuffer.length / Int16Array.BYTES_PER_ELEMENT,
  );

  const wav = new WaveFile();
  wav.fromScratch(1, 24000, "16", Array.from(int16Data));
  await fs.writeFile(rawPath, Buffer.from(wav.toBuffer()));

  const targetDur = params.durationSeconds;
  if (typeof targetDur === "number" && targetDur > 0 && Number.isFinite(targetDur)) {
    try {
      await adjustVoiceToDuration(rawPath, voicePath, targetDur);
    } finally {
      try {
        await fs.unlink(rawPath);
      } catch {
        /* ignore */
      }
    }
    console.log(
      `[voice-gen] Gemini TTS: PCM → WAV normalizzato a ${targetDur.toFixed(2)}s @ 44.1kHz mono, genre=${params.genre}`,
    );
  } else {
    try {
      await fs.rename(rawPath, voicePath);
    } catch {
      await fs.copyFile(rawPath, voicePath);
      try {
        await fs.unlink(rawPath);
      } catch {
        /* ignore */
      }
    }
    console.log(
      `[voice-gen] Gemini TTS: ${(pcmBuffer.length / 1024).toFixed(0)}KB PCM → WAV 24kHz, genre=${params.genre}, voice=Aoede (nessun target duration)`,
    );
  }

  return { voicePath };
};
