import { z } from "zod";

const boolString = z
  .enum(["true", "false", "1", "0", ""])
  .optional()
  .transform((v) => v === "true" || v === "1");

const envSchema = z.object({
  GITHUB_WEBHOOK_SECRET: z.string().min(1).default("dev-secret"),
  SKIP_WEBHOOK_VERIFY: boolString,
  OLLAMA_HOST: z.string().optional(),
  /** Model name for `ollama generate` (e.g. llama3, llama3.2, mistral). Must be pulled locally. */
  OLLAMA_MODEL: z.string().min(1).default("llama3"),
  ALLOWED_OWNERS: z
    .string()
    .default("")
    .transform((s) =>
      s.split(",").map((o) => o.trim().toLowerCase()).filter(Boolean)
    ),
  MY_FACE_URL: z.string().default("/francesco.jpg"),
  COMPANY_LOGO_URL: z.string().default("/thinkpink-badge-512.png"),
  COMPANY_BANNER: z.string().default("/og-image.png"),
  SOCIAL_POST_BASE_URL: z.string().optional(),

  // MiniMax Music — opzionale per build/CI; obbligatorio a runtime per generare audio
  MINIMAX_API_KEY: z
    .string()
    .optional()
    .transform((s) => {
      const t = s?.trim();
      return t && t.length > 0 ? t : undefined;
    }),

  // Google AI / Vertex AI (opzionale, non più usato per audio)
  GEMINI_API_KEY: z.string().optional(),
  GOOGLE_CLOUD_PROJECT: z.string().optional(),
  GOOGLE_CLOUD_LOCATION: z.string().default("us-central1"),

  YOUTUBE_ENABLED: boolString,
  YOUTUBE_PRIVACY: z.string().default("unlisted"),

  FACEBOOK_ENABLED: boolString,
  FACEBOOK_PAGE_ACCESS_TOKEN: z.string().optional(),
  FACEBOOK_PAGE_ID: z.string().optional(),
  FACEBOOK_APP_ID: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
}

export const config = {
  ...parsed.data,
  outputDir: "out",
  tempDir: "temp",
  remotionCompositionId: "CommitKaraoke",
  video: {
    width: 1080,
    height: 1920,
    fps: 30,
    durationInFrames: 540,
    introDurationInFrames: 120,
    outroDurationInFrames: 120,
  },
} as const;