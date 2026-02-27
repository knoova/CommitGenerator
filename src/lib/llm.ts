import { Ollama } from "ollama";
import { config } from "@/config";
import { genres, type Genre } from "@/remotion/types";
import { logError } from "@/lib/logger";

const ollama = new Ollama({ host: config.OLLAMA_HOST || 'http://localhost:11434' });

type LlmOutput = {
  genre: Genre;
  generatedText: string;
  generatedTitle: string;
};

const genreLabel: Record<Genre, string> = {
  rock: "Rock",
  pop: "Pop",
  opera: "Opera lirica",
  reggaeton: "Reggaeton",
  "death-metal": "Death Metal",
};

const pickGenre = (): Genre => {
  const idx = Math.floor(Math.random() * genres.length);
  return genres[idx] ?? "pop";
};

const truncateToWordCount = (text: string, maxWords: number): string => {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text.trim();
  return words.slice(0, maxWords).join(" ");
};

const throwWithLog = async (
  commitMessage: string,
  commitSha: string,
  error: unknown,
): Promise<never> => {
  await logError({
    caller: "generateFunnyLyrics",
    commitSha,
    commitMessage,
    error,
  });
  throw error instanceof Error ? error : new Error(String(error));
};

export const generateFunnyLyrics = async (
  commitMessage: string,
  commitSha: string,
): Promise<LlmOutput> => {
  const genre = pickGenre();

  const responseSchema = {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Titolo ironico breve della canzone",
      },
      lyrics: {
        type: "string",
        description: "Testo della canzone, esattamente 15 parole, su più righe con a capo",
      },
    },
    required: ["title", "lyrics"],
    additionalProperties: false,
  };

  const prompt = `
Sei un autore comico musicale italiano specializzato in canzoni su commit.
Devi generare un JSON con esattamente questa struttura:
{
  "title": "Titolo breve della canzone",
  "lyrics": "Testo ESATTAMENTE di 15 parole, con rime e ritmo"
}

Regole FERME:
1. Il campo "lyrics" deve contenere ESATTAMENTE 15 parole (controlla)
2. Usa solo il genere ${genreLabel[genre]} con tono ironico/memabile
3. Ispirati INDIRETTAMENTE al commit: "${commitMessage}"
4. Formato JSON VALIDO con doppi apici
5. NIENTE altri campi oltre a title e lyrics
6. Esempio di output corretto:
{
  "title": "Il Bug Ballabile",
  "lyrics": "Danziamo sul codice rotto\nIl fix è quasi pronto\nMa il test fallisce ancora"
}

Ora genera il JSON richiesto:
`.trim();

  try {
    const ollamaResponse = await ollama.generate({
      model: "llama3",
      prompt: prompt,
      format: "json",
      options: {
        temperature: 1.1,
      },
    });
    const response = { text: ollamaResponse.response };

    const rawText = response.text?.trim();
    if (typeof rawText !== "string" || !rawText) {
      await throwWithLog(
        commitMessage,
        commitSha,
        new Error("Ollama ha restituito risposta vuota"),
      );
    }
    const textStr = rawText as string;

    const parsed = JSON.parse(textStr) as { title?: string; lyrics?: string; " lyrics"?: string };

    const lyrics = parsed.lyrics ?? parsed[" lyrics"];
    if (typeof lyrics !== "string" || !lyrics.trim()) {
      const debug = `Full response: ${textStr}`;
      await throwWithLog(
        commitMessage,
        commitSha,
        new Error(`Ollama ha restituito JSON senza campo lyrics valido. ${debug}`),
      );
    }

    const lyricsStr = lyrics!.trim();
    const trimmedLyrics = truncateToWordCount(lyricsStr, 15);
    return {
      genre,
      generatedTitle: parsed.title?.trim() || `Commit ${genreLabel[genre]}`,
      generatedText: trimmedLyrics,
    };
  } catch (err) {
    await throwWithLog(commitMessage, commitSha, err);
    throw err instanceof Error ? err : new Error(String(err));
  }
};
