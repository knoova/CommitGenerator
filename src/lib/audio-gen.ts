import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { WaveFile } from "wavefile";
import {
  type MusicgenForConditionalGeneration,
  AutoTokenizer,
  MusicgenForConditionalGeneration as MusicgenModel,
} from "@huggingface/transformers";
import { config } from "@/config";
import { generateVoice } from "@/lib/voice-gen";
import type { Genre } from "@/remotion/types";

const execFileAsync = promisify(execFile);

const MODEL_ID = "Xenova/musicgen-small";
const MODEL_CACHE_DIR = path.join(process.cwd(), ".cache", "models");
const GENERATION_TIMEOUT_MS = 120_000;
const MAX_LOAD_RETRIES = 1;

const musicPromptByGenre: Record<Genre, string> = {
  rock: "energetic rock guitar riff, driving drums, powerful bass, stadium anthem",
  pop: "catchy pop melody, upbeat synth, cheerful rhythm, dance groove",
  opera: "dramatic orchestral strings, operatic choir, classical grandeur, crescendo",
  reggaeton: "reggaeton beat, dembow rhythm, latin bass, tropical percussion",
  "death-metal":
    "aggressive death metal guitar, blast beat drums, dark heavy distortion",
};

// --------------- MusicGen singleton management ---------------

let tokenizerPromise: ReturnType<typeof AutoTokenizer.from_pretrained> | null = null;
let modelPromise: ReturnType<typeof MusicgenModel.from_pretrained> | null = null;

const resetSingletons = () => {
  tokenizerPromise = null;
  modelPromise = null;
};

const purgeModelCache = async () => {
  const modelCachePath = path.join(MODEL_CACHE_DIR, MODEL_ID.replace("/", path.sep));
  try {
    await fs.rm(modelCachePath, { recursive: true, force: true });
    console.log(`[audio-gen] Purged corrupt cache at ${modelCachePath}`);
  } catch {
    /* directory may not exist */
  }
};

const loadTokenizer = () =>
  AutoTokenizer.from_pretrained(MODEL_ID, {
    cache_dir: MODEL_CACHE_DIR,
    progress_callback: (progress: { status: string; file?: string; progress?: number }) => {
      if (progress.status === "progress" && progress.file) {
        const pct = typeof progress.progress === "number" ? ` ${Math.round(progress.progress)}%` : "";
        console.log(`[audio-gen] Downloading tokenizer ${progress.file}${pct}`);
      }
    },
  });

const loadModel = () =>
  MusicgenModel.from_pretrained(MODEL_ID, {
    dtype: "fp32",
    cache_dir: MODEL_CACHE_DIR,
    progress_callback: (progress: { status: string; file?: string; progress?: number }) => {
      if (progress.status === "progress" && progress.file) {
        const pct = typeof progress.progress === "number" ? ` ${Math.round(progress.progress)}%` : "";
        console.log(`[audio-gen] Downloading model ${progress.file}${pct}`);
      }
    },
  });

const getTokenizer = () => {
  if (!tokenizerPromise) tokenizerPromise = loadTokenizer();
  return tokenizerPromise;
};

const getModel = () => {
  if (!modelPromise) modelPromise = loadModel();
  return modelPromise;
};

const loadModelsWithRetry = async (): Promise<
  [Awaited<ReturnType<typeof AutoTokenizer.from_pretrained>>, Awaited<ReturnType<typeof MusicgenModel.from_pretrained>>]
> => {
  for (let attempt = 0; attempt <= MAX_LOAD_RETRIES; attempt++) {
    try {
      return await Promise.all([getTokenizer(), getModel()]);
    } catch (err) {
      if (attempt === MAX_LOAD_RETRIES) throw err;
      console.warn(
        `[audio-gen] Model load failed (attempt ${attempt + 1}/${MAX_LOAD_RETRIES + 1}), purging cache...`,
        err instanceof Error ? err.message : err,
      );
      resetSingletons();
      await purgeModelCache();
    }
  }
  throw new Error("Unreachable");
};

// --------------- Instrumental generation (MusicGen) ---------------

const generateInstrumental = async (params: {
  genre: Genre;
  commitMessage: string;
  shortSha: string;
  tempDir: string;
}): Promise<string> => {
  const wavPath = path.join(params.tempDir, `${params.shortSha}_instrumental.wav`);
  const mp3Path = path.join(params.tempDir, `${params.shortSha}_instrumental.mp3`);

  const prompt = `${musicPromptByGenre[params.genre]}, inspired by: ${params.commitMessage.slice(0, 60)}`;

  const [tokenizer, model] = await loadModelsWithRetry();

  const inputs = await (
    tokenizer as (text: string, opts?: { padding?: boolean }) => Promise<object>
  )(prompt, { padding: true });

  const audioValues = await Promise.race([
    (model as MusicgenForConditionalGeneration).generate({
      ...inputs,
      max_new_tokens: 500,
      do_sample: true,
      guidance_scale: 3,
    } as Parameters<MusicgenForConditionalGeneration["generate"]>[0]),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("MusicGen generation timeout")), GENERATION_TIMEOUT_MS),
    ),
  ]);

  const samplingRate =
    (
      (model as MusicgenForConditionalGeneration).config as {
        audio_encoder?: { sampling_rate?: number };
      }
    )?.audio_encoder?.sampling_rate ?? 32000;

  const wav = new WaveFile();
  wav.fromScratch(1, samplingRate, "32f", Array.from((audioValues as { data: Float32Array }).data));
  await fs.writeFile(wavPath, Buffer.from(wav.toBuffer()));

  await execFileAsync("ffmpeg", ["-y", "-i", wavPath, "-q:a", "4", "-acodec", "libmp3lame", mp3Path]);

  try { await fs.unlink(wavPath); } catch { /* ignore */ }

  console.log(`[audio-gen] Instrumental generated: ${mp3Path}`);
  return mp3Path;
};

// --------------- Mix voice + instrumental ---------------

const mixAudio = async (params: {
  instrumentalPath: string;
  voicePath: string;
  outputPath: string;
}): Promise<void> => {
  await execFileAsync("ffmpeg", [
    "-y",
    "-i", params.instrumentalPath,
    "-f", "s16le", "-ar", "24000", "-ac", "1", "-i", params.voicePath,
    "-filter_complex",
    "[0:a]volume=0.3[m];[1:a]volume=1.0,aformat=sample_rates=44100[v];[m][v]amix=inputs=2:duration=first",
    "-t", "10",
    "-acodec", "libmp3lame", "-q:a", "4",
    params.outputPath,
  ]);
};

// --------------- Public API ---------------

export const generateAudio = async (params: {
  genre: Genre;
  commitMessage: string;
  commitSha: string;
  lyrics: string;
}): Promise<{ audioAbsolutePath: string }> => {
  const tempDir = path.join(process.cwd(), config.tempDir);
  await fs.mkdir(tempDir, { recursive: true });

  const shortSha = params.commitSha.slice(0, 7);
  const finalMp3 = path.join(tempDir, `${shortSha}.mp3`);

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
    }).catch((err) => {
      console.warn("[audio-gen] Voice generation failed, using instrumental only:", err instanceof Error ? err.message : err);
      return null;
    }),
  ]);

  if (voiceResult) {
    await mixAudio({
      instrumentalPath,
      voicePath: voiceResult.voicePath,
      outputPath: finalMp3,
    });

    for (const tmp of [instrumentalPath, voiceResult.voicePath]) {
      try { await fs.unlink(tmp); } catch { /* ignore */ }
    }
  } else {
    await fs.rename(instrumentalPath, finalMp3);
  }

  console.log(`[audio-gen] Final audio: ${finalMp3}`);
  return { audioAbsolutePath: finalMp3 };
};
