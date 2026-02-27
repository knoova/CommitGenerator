import { z } from "zod";

const boolString = z
  .enum(["true", "false", "1", "0", ""])
  .optional()
  .transform((v) => v === "true" || v === "1");

const envSchema = z.object({
  GITHUB_WEBHOOK_SECRET: z.string().min(1).default("dev-secret"),
  OLLAMA_HOST: z.string().optional(),
  GITHUB_REPO: z.string().default("owner/repo-name"),
  MY_FACE_URL: z.string().default("/my_face.png"),
  COMPANY_LOGO_URL: z.string().default("/company_logo.png"),
  SOCIAL_POST_BASE_URL: z.string().optional(),

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