import { z } from "zod";

export const genreSchema = z.enum(["rock", "pop", "opera", "reggaeton", "death-metal"]);

export const videoPropsSchema = z.object({
  commitMessage: z.string().min(1),
  authorName: z.string().min(1),
  authorAvatarUrl: z.string().min(1),
  generatedText: z.string().min(1),
  genre: genreSchema,
  myFaceUrl: z.string().min(1),
  companyLogoUrl: z.string().min(1),
  audioUrl: z.string().min(1),
});
