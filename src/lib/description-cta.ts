import { Ollama } from "ollama";
import { config } from "@/config";
import type { Genre } from "@/remotion/types";

export { THINKPINK_LINKS } from "@/lib/links";

const ollama = new Ollama({ host: config.OLLAMA_HOST || 'http://localhost:11434' });

const genreLabel: Record<Genre, string> = {
  rock: "Rock",
  pop: "Pop",
  opera: "Opera lirica",
  reggaeton: "Reggaeton",
  "death-metal": "Death Metal",
};

const FALLBACK_CTA = "Visto il disastro? Venite a vedere cosa facciamo: https://www.thinkpinkstudio.it";

export async function generateDescriptionCta(params: {
  genre: Genre;
  lyricsSnippet: string;
  targetUrl: string;
}): Promise<string> {
  const responseSchema = {
    type: "object",
    properties: {
      cta: {
        type: "string",
        description:
          "1-2 righe comiche per invitarci a visitare il link, max 80 caratteri, tono ironico",
      },
    },
    required: ["cta"],
    additionalProperties: false,
  };

  const prompt = `
Sei un copywriter comico. La canzone è in stile ${genreLabel[params.genre]}.

Testo della canzone (snippet): "${params.lyricsSnippet}"

Scrivi una CTA ironica di 1-2 righe (massimo 80 caratteri) per invitarci a visitare questo link: ${params.targetUrl}

Vincoli:
- Tono: idiotico, meme, coerente con il karaoke
- Non usare emoji
- Termina con lo URL: ${params.targetUrl}
- Massimo 80 caratteri (incluso il link)
`.trim();

  try {
    const response = await ollama.generate({
      model: "llama3",
      prompt: prompt,
      format: "json",
      options: {
        temperature: 1.1,
      },
    });

    const rawText = response.response?.trim();
    if (typeof rawText !== "string" || !rawText) return FALLBACK_CTA;

    const parsed = JSON.parse(rawText) as { cta?: string };
    const cta = parsed.cta?.trim();
    if (!cta) return FALLBACK_CTA;

    return cta.slice(0, 150);
  } catch {
    return FALLBACK_CTA;
  }
}
