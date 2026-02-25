export const genres = ["rock", "pop", "opera", "reggaeton", "death-metal"] as const;

export type Genre = (typeof genres)[number];

export type VideoProps = {
  commitMessage: string;
  authorName: string;
  authorAvatarUrl: string;
  generatedText: string;
  genre: Genre;
  myFaceUrl: string;
  companyLogoUrl: string;
  audioUrl: string;
};
