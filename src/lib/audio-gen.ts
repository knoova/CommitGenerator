"use server";
import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { GoogleAuth } from "google-auth-library";
import { config } from "@/config";
import { logError } from "@/lib/logger";
import { generateVoice } from "@/lib/voice-gen";
import type { Genre } from "@/remotion/types";

const execFileAsync = promisify(execFile);

// Lyria 2 genera sempre clip da 30 secondi a 48kHz
const LYRIA_DURATION_SECONDS = 30;

const musicPromptByGenre: Record<Genre, string> = {
  rock: "energetic rock guitar riff, driving drums, powerful bass, stadium anthem, electric guitar solo, distortion",
  pop: "catchy pop melody, upbeat synth, cheerful rhythm, dance groove, bright production, modern pop beat",
  opera: "dramatic orchestral strings, operatic choir, classical grandeur, crescendo, Italian opera, full orchestra",
  reggaeton: "reggaeton beat, dembow rhythm, latin bass, tropical percussion, urban latin vibes, dancehall groove",
  "death-metal":
    "aggressive death metal guitar, blast beat drums, dark heavy distortion, thrash riff, brutal metal, fast tempo",
};

const negativePromptByGenre: Record<Genre, string> = {
  rock: "slow, ambient, electronic, classical, acoustic",
  pop: "aggressive, dark, dissonant, slow, heavy",
  opera: "electronic, drum machines, modern pop, rock guitar",
  reggaeton: "classical, metal, jazz, opera",
  "death-metal": "gentle, acoustic, pop, classical, jazz",
};

type LyriaResponse = {
  predictions?: Array<{ audioContent?: string }>;
  error?: { message?: string };
};

// --------------- Instrumental via Google Vertex AI Lyria 2 ---------------

const generateInstrumental = async (params: {
  genre: Genre;
  commitMessage: string;
  shortSha: string;
  tempDir: string;
}): Promise<string> => {
  const wavPath = path.join(params.tempDir, `${params.shortSha}_instrumental.wav`);
  const mp3Path = path.join(params.tempDir, `${params.shortSha}_instrumental.mp3`);

  const prompt = `${musicPromptByGenre[params.genre]}, inspired by: ${params.commitMessage.slice(0, 80)}`;
  const negativePrompt = negativePromptByGenre[params.genre];

  const { GOOGLE_CLOUD_PROJECT: projectId, GOOGLE_CLOUD_LOCATION: location } = config;
  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/lyria-002:predict`;

  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token = tokenResponse.token;
  if (!token) throw new Error("Impossibile ottenere il token Google Cloud");

  console.log(`[audio-gen] Chiamata Lyria 2 per genre=${params.genre}...`);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      instances: [{ prompt, negative_prompt: negativePrompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Lyria 2 API error ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as LyriaResponse;

  if (data.error?.message) {
    throw new Error(`Lyria 2 API error: ${data.error.message}`);
  }

  const audioBase64 = data.predictions?.[0]?.audioContent;
  if (!audioBase64) throw new Error("Lyria 2 non ha restituito audio");

  // Salva il WAV (48kHz, 30s) restituito da Lyria 2
  const wavBuffer = Buffer.from(audioBase64, "base64");
  await fs.writeFile(wavPath, wavBuffer);
  console.log(`[audio-gen] Lyria 2 WAV: ${(wavBuffer.length / 1024).toFixed(0)}KB`);

  // Converti in MP3
  await execFileAsync("ffmpeg", ["-y", "-i", wavPath, "-q:a", "4", "-acodec", "libmp3lame", mp3Path]);
  try {
    await fs.unlink(wavPath);
  } catch {
    /* ignore */
  }

  console.log(`[audio-gen] Strumentale generato: ${mp3Path} (${LYRIA_DURATION_SECONDS}s)`);
  return mp3Path;
};

// --------------- Mix voce + strumentale ---------------

const mixAudio = async (params: {
  instrumentalPath: string;
  voicePath: string;
  outputPath: string;
  durationSeconds: number;
}): Promise<void> => {
  await execFileAsync("ffmpeg", [
    "-y",
    "-i",
    params.instrumentalPath,
    "-i",
    params.voicePath,
    "-filter_complex",
    "[0:a]volume=0.35[m];[1:a]volume=1.0,aformat=sample_rates=44100[v];[m][v]amix=inputs=2:duration=first",
    "-t",
    params.durationSeconds.toString(),
    "-acodec",
    "libmp3lame",
    "-q:a",
    "4",
    params.outputPath,
  ]);
};

// --------------- API pubblica ---------------

export const generateAudio = async (params: {
  genre: Genre;
  commitMessage: string;
  commitSha: string;
  lyrics: string;
  durationSeconds?: number;
}): Promise<{ audioAbsolutePath: string }> => {
  const tempDir = path.join(process.cwd(), config.tempDir);
  await fs.mkdir(tempDir, { recursive: true });

  const shortSha = params.commitSha.slice(0, 7);
  const finalMp3 = path.join(tempDir, `${shortSha}.mp3`);

  // Lyria 2 produce sempre 30s; trimmamo al tempo richiesto (durata video)
  const durationSeconds = Math.min(params.durationSeconds ?? LYRIA_DURATION_SECONDS, LYRIA_DURATION_SECONDS);

  const [instrumentalPath, voiceResult] = await Promise.all([
    generateInstrumental({
      genre: params.genre,
      commitMessage: params.commitMessage,
      shortSha,
      tempDir,
    }),
    generateVoice({
      lyrics: params.lyrics,
      genre: params.genre,
      commitSha: params.commitSha,
      durationSeconds,
    }).catch(async (err) => {
      await logError({
        caller: "generateVoice",
        commitSha: params.commitSha,
        commitMessage: params.commitMessage,
        error: err,
      });
      throw err instanceof Error ? err : new Error(String(err));
    }),
  ]);

  await mixAudio({
    instrumentalPath,
    voicePath: voiceResult.voicePath,
    outputPath: finalMp3,
    durationSeconds,
  });

  for (const tmp of [instrumentalPath, voiceResult.voicePath]) {
    try {
      await fs.unlink(tmp);
    } catch {
      /* ignore */
    }
  }

  console.log(`[audio-gen] Audio finale: ${finalMp3} (${durationSeconds}s)`);
  return { audioAbsolutePath: finalMp3 };
};
