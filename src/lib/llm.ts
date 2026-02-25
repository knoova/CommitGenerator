import { GoogleGenAI } from "@google/genai";
import { config } from "@/config";
import { genres, type Genre } from "@/remotion/types";

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

const fallbackLyrics = (commitMessage: string, genre: Genre): LlmOutput => ({
  genre,
  generatedTitle: `Commit ${genreLabel[genre]}: caos in produzione`,
  generatedText: [
    `Ho pushato: ${commitMessage.slice(0, 40)}`,
    "La CI urla, il linter piange",
    "il deploy balla sul precipizio",
    "i bug ritornano come per magia",
    "ma noi cantiamo, ship it via!",
    "Produzione esplode, che allegria",
  ].join("\n"),
});

export const generateFunnyLyrics = async (commitMessage: string): Promise<LlmOutput> => {
  const genre = pickGenre();

  if (!config.GEMINI_API_KEY) {
    return fallbackLyrics(commitMessage, genre);
  }

  const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
  const prompt = `
Sei un autore comico musicale italiano.
Riscrivi il commit message come canzone ${genreLabel[genre]} da 10 secondi.

Vincoli:
- Scrivi esattamente 30 parole cantabili
- Il testo sara CANTATO da una voce: usa rime e ritmo
- Tono: idiota, ironico, memabile
- Mantieni un riferimento al messaggio originale
- Evita contenuti offensivi

Output JSON valido con chiavi:
{
  "title": "titolo ironico breve",
  "lyrics": "testo\\nsu piu righe\\ncon a capo"
}

Commit message originale:
${commitMessage}
`.trim();

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text?.trim();
    if (!text) {
      return fallbackLyrics(commitMessage, genre);
    }

    const parsed = JSON.parse(text) as { title?: string; lyrics?: string };

    if (!parsed.lyrics) {
      return fallbackLyrics(commitMessage, genre);
    }

    return {
      genre,
      generatedTitle: parsed.title?.trim() || `Commit ${genreLabel[genre]}`,
      generatedText: parsed.lyrics.trim(),
    };
  } catch {
    return fallbackLyrics(commitMessage, genre);
  }
};
