import { genres, type Genre } from "@/remotion/types";
import { logError } from "@/lib/logger";
import {
  checkOllamaModelReady,
  getOllamaClient,
  getOllamaModel,
} from "@/lib/ollama-health";

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

/** Placeholder lyrics/title when Ollama is down or the model is missing. */
const buildFallbackOutput = (commitMessage: string, genre: Genre): LlmOutput => {
  const firstLine = commitMessage.split("\n")[0]?.trim().slice(0, 100) || "commit";
  const raw = [
    `Commit in stile ${genreLabel[genre]} senza la musa LLM`,
    `Il messaggio dice così: ${firstLine}`,
    `Ollama tace ma noi cantiamo lo stesso`,
    `Build verde o rossa il karaoke non si ferma`,
    `Shippiamo il video e la CI ci aspetta`,
    `Fix refactor deploy repeat sempre in pista`,
  ].join(" ");
  return {
    genre,
    generatedTitle: `Commit ${genreLabel[genre]} (fallback)`,
    generatedText: truncateToWordCount(raw, 45),
  };
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

  const health = await checkOllamaModelReady();
  if (!health.ok) {
    console.warn(`[llm] ${health.reason} — uso testo fallback per ${commitSha.slice(0, 7)}`);
    return buildFallbackOutput(commitMessage, genre);
  }

  const ollama = getOllamaClient();
  const model = getOllamaModel();

  const prompt = `
Sei un autore comico musicale italiano specializzato in canzoni su commit.
Devi generare un JSON con esattamente questa struttura:
{
  "title": "Titolo breve della canzone",
  "lyrics": "Testo ESATTAMENTE di 38 parole, con rime e ritmo"
}

Regole FERME:
1. Il campo "lyrics" deve contenere ESATTAMENTE 38 parole (controlla)
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
      model,
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
    const trimmedLyrics = truncateToWordCount(lyricsStr, 45);
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
