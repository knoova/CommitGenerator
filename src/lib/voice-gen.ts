"use server";
import fs from "fs/promises";
import path from "path";
import * as Echogarden from "echogarden";
import { config } from "@/config";
import type { Genre } from "@/remotion/types";

const ITALIAN_VOICE = "it_IT-paola-medium";

export const generateVoice = async (params: {
  lyrics: string;
  genre: Genre;
  commitSha: string;
}): Promise<{ voicePath: string }> => {
  const tempDir = path.join(process.cwd(), config.tempDir);
  await fs.mkdir(tempDir, { recursive: true });

  const shortSha = params.commitSha.slice(0, 7);
  const voicePath = path.join(tempDir, `${shortSha}_voice.wav`);

  const { audio } = await Echogarden.synthesize(params.lyrics, {
    engine: "vits",
    language: "it",
    voice: ITALIAN_VOICE,
    splitToSentences: false,
    outputAudioFormat: { codec: "wav" },
  });

  const wavBuffer =
    Buffer.isBuffer(audio) ? audio : Buffer.from(audio as unknown as ArrayBuffer);
  await fs.writeFile(voicePath, wavBuffer);

  console.log(
    `[voice-gen] Generated voice: ${(wavBuffer.length / 1024).toFixed(0)}KB, ` +
      `genre=${params.genre}, engine=vits, voice=${ITALIAN_VOICE}`,
  );

  return { voicePath };
};
