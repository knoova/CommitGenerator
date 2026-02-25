import fs from "node:fs/promises";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";
import { config } from "@/config";
import type { Genre } from "@/remotion/types";

const TTS_MODEL = "gemini-2.5-flash-preview-tts";

const voiceConfigByGenre: Record<Genre, { voiceName: string; style: string }> = {
  rock: {
    voiceName: "Enceladus",
    style: "Canta con energia e grinta rock, voce potente e ritmica, in italiano",
  },
  pop: {
    voiceName: "Kore",
    style: "Canta con allegria e ritmo pop, voce dolce e orecchiabile, in italiano",
  },
  opera: {
    voiceName: "Charon",
    style: "Canta con drammaticità stile opera lirica, voce impostata e teatrale, in italiano",
  },
  reggaeton: {
    voiceName: "Puck",
    style: "Canta con flow e ritmo reggaeton, voce calda e groovy, in italiano",
  },
  "death-metal": {
    voiceName: "Fenrir",
    style: "Canta con aggressività e potenza stile death metal, voce gutturale e intensa, in italiano",
  },
};

export const generateVoice = async (params: {
  lyrics: string;
  genre: Genre;
  commitSha: string;
}): Promise<{ voicePath: string }> => {
  if (!config.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY required for voice generation");
  }

  const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
  const voiceCfg = voiceConfigByGenre[params.genre];

  const response = await ai.models.generateContent({
    model: TTS_MODEL,
    contents: [
      {
        parts: [
          {
            text: `${voiceCfg.style}:\n\n${params.lyrics}`,
          },
        ],
      },
    ],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voiceCfg.voiceName },
        },
      },
    },
  });

  const audioPart = response.candidates?.[0]?.content?.parts?.[0];
  if (!audioPart?.inlineData?.data) {
    throw new Error("Gemini TTS returned no audio data");
  }

  const pcmBuffer = Buffer.from(audioPart.inlineData.data, "base64");

  const tempDir = path.join(process.cwd(), config.tempDir);
  await fs.mkdir(tempDir, { recursive: true });

  const shortSha = params.commitSha.slice(0, 7);
  const voicePath = path.join(tempDir, `${shortSha}_voice.pcm`);
  await fs.writeFile(voicePath, pcmBuffer);

  console.log(
    `[voice-gen] Generated voice: ${(pcmBuffer.length / (24000 * 2)).toFixed(1)}s, ` +
    `genre=${params.genre}, voice=${voiceCfg.voiceName}`,
  );

  return { voicePath };
};
