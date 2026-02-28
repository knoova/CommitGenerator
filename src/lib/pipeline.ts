"use server";
import path from "path";
import { config } from "@/config";
import { generateAudio } from "@/lib/audio-gen";
import { uploadToFacebook } from "@/lib/facebook";
import { appendHistoryRow, pushHistoryOnly } from "@/lib/history";
import { generateDescriptionCta } from "@/lib/description-cta";
import { THINKPINK_LINKS } from "@/lib/links";
import { generateFunnyLyrics } from "@/lib/llm";
import { createGitHubRelease } from "@/lib/release";
import { renderCommitVideo } from "@/lib/render-video";
import { uploadToYouTube } from "@/lib/youtube";
import type { GitHubCommit, GitHubPushPayload } from "@/lib/webhook";

const commitAuthor = (commit: GitHubCommit, payload: GitHubPushPayload) =>
  commit.author.username || payload.sender.login || commit.author.name;

const avatarUrl = (payload: GitHubPushPayload, author: string) =>
  payload.sender.avatar_url || `https://github.com/${author}.png`;

type SettledValue<T> = { ok: true; value: T } | { ok: false; error: unknown };

const settle = async <T>(label: string, fn: () => Promise<T>): Promise<SettledValue<T>> => {
  try {
    return { ok: true, value: await fn() };
  } catch (error) {
    console.error(`[pipeline] ${label} failed:`, error);
    return { ok: false, error };
  }
};

// Funzione per calcolare la complessità di un commit
const calculateCommitComplexity = (commit: GitHubCommit): number => {
  const messageLength = commit.message.length;
  const additions = commit.additions || 0;
  const deletions = commit.deletions || 0;
  const totalChanges = additions + deletions;
  
  // Peso diverso per diversi aspetti del commit
  return (messageLength * 0.1) + (totalChanges * 0.01);
};

// Funzione per decidere se combinare commit
const shouldCombineCommits = (commits: GitHubCommit[]): boolean => {
  if (commits.length <= 1) return false;
  
  const avgComplexity = commits.reduce((sum, commit) => sum + calculateCommitComplexity(commit), 0) / commits.length;
  const totalChanges = commits.reduce((sum, commit) => sum + (commit.additions || 0) + (commit.deletions || 0), 0);
  
  // Combina se:
  // 1. Molti commit piccoli (< 50 righe totali)
  // 2. Commit molto semplici (complessità media < 10)
  // 3. Più di 3 commit nello stesso push
  return (totalChanges < 50 && commits.length > 2) || 
         (avgComplexity < 10 && commits.length > 3) || 
         commits.length > 5;
};

// Funzione per combinare più commit in un unico testo
const combineCommits = (commits: GitHubCommit[]): string => {
  const combinedMessage = commits
    .map((commit, index) => {
      const additions = commit.additions || 0;
      const deletions = commit.deletions || 0;
      const totalChanges = additions + deletions;
      
      return `${index + 1}. ${commit.message} (${totalChanges} righe modificate)`;
    })
    .join(" | ");
  
  return `Oggi abbiamo lavorato su: ${combinedMessage}`;
};

// Funzione per elaborare un singolo commit o una combinazione
const processCommitOrCombination = async (params: {
  payload: GitHubPushPayload;
  commit: GitHubCommit;
  combinedMessage?: string;
}) => {
  const authorName = commitAuthor(params.commit, params.payload);
  const authorAvatarUrl = avatarUrl(params.payload, authorName);
  const commitMessage = (params.combinedMessage || params.commit.message).trim();

  const llm = await generateFunnyLyrics(commitMessage, params.commit.id);

  const music = await generateAudio({
    genre: llm.genre,
    commitMessage,
    commitSha: params.commit.id,
    lyrics: llm.generatedText,
    durationSeconds: llm.genre === "opera" ? 45 : undefined, // Opera più lunga
  });

  const rendered = await renderCommitVideo({
    commitSha: params.commit.id,
    inputProps: {
      commitMessage,
      authorName,
      authorAvatarUrl,
      generatedText: llm.generatedText,
      genre: llm.genre,
      myFaceUrl: config.MY_FACE_URL,
      companyLogoUrl: config.COMPANY_LOGO_URL,
      audioUrl: music.audioAbsolutePath,
    },
  });

  const videoAbsPath = path.resolve(rendered.outputPath);

  const linkIndex =
    [...params.commit.id.slice(0, 8)].reduce((a, c) => a + c.charCodeAt(0), 0) %
    THINKPINK_LINKS.length;
  const target = THINKPINK_LINKS[linkIndex];

  const cta = await generateDescriptionCta({
    genre: llm.genre,
    lyricsSnippet: llm.generatedText.slice(0, 60),
    targetUrl: target.url,
  });

  const base = `${llm.generatedText}\n\nCommit: ${commitMessage}\nAutore: @${authorName}`;
  const videoDescription = cta ? `${base}\n\n---\n${cta}` : base;

  const [releaseResult, ytResult, fbResult] = await Promise.all([
    settle("GitHub Release", () =>
      createGitHubRelease({
        commitSha: params.commit.id,
        commitMessage,
        generatedTitle: llm.generatedTitle,
        generatedText: llm.generatedText,
        authorName,
        authorAvatarUrl,
        repoFullName: params.payload.repository.full_name || config.GITHUB_REPO,
        videoPath: videoAbsPath,
      }),
    ),

    config.YOUTUBE_ENABLED
      ? settle("YouTube", () =>
          uploadToYouTube({
            videoPath: videoAbsPath,
            title: llm.generatedTitle || commitMessage,
            description: videoDescription,
          }),
        )
      : Promise.resolve({ ok: false as const, error: "disabled" }),

    config.FACEBOOK_ENABLED
      ? settle("Facebook", () =>
          uploadToFacebook({
            videoPath: videoAbsPath,
            title: llm.generatedTitle || commitMessage,
            description: videoDescription,
          }),
        )
      : Promise.resolve({ ok: false as const, error: "disabled" }),
  ]);

  const releaseUrl = releaseResult.ok ? releaseResult.value.releaseUrl : "";
  const tagName = releaseResult.ok ? releaseResult.value.tagName : `v-${params.commit.id.slice(0, 7)}`;
  const youtubeUrl = ytResult.ok ? ytResult.value.youtubeUrl : undefined;
  const facebookUrl = fbResult.ok ? fbResult.value.facebookUrl : undefined;

  if (releaseResult.ok && (youtubeUrl || facebookUrl)) {
    await settle("Release update with social links", () =>
      createGitHubRelease({
        commitSha: params.commit.id,
        commitMessage,
        generatedTitle: llm.generatedTitle,
        generatedText: llm.generatedText,
        authorName,
        authorAvatarUrl,
        repoFullName: params.payload.repository.full_name || config.GITHUB_REPO,
        videoPath: videoAbsPath,
        youtubeUrl,
        facebookUrl,
      }),
    );
  }

  const timestamp = new Date().toISOString().replace("T", " ").slice(0, 16);
  await appendHistoryRow({
    date: timestamp,
    author: `@${authorName}`,
    title: llm.generatedTitle || commitMessage,
    releaseUrl,
    tagName,
    youtubeUrl,
    facebookUrl,
  });

  await pushHistoryOnly();

  return {
    releaseUrl,
    youtubeUrl,
    facebookUrl,
    videoPath: rendered.outputPath,
  };
};

export const processCommitPipeline = async ({
  payload,
  commit,
}: {
  payload: GitHubPushPayload;
  commit: GitHubCommit;
}) => {
  // Verifica se ci sono più commit da combinare
  const allCommits = payload.commits || [commit];
  
  if (shouldCombineCommits(allCommits)) {
    console.log(`[pipeline] Combining ${allCommits.length} commits into one video`);
    const combinedMessage = combineCommits(allCommits);
    
    return await processCommitOrCombination({
      payload,
      commit: allCommits[0], // Usa il primo commit come riferimento
      combinedMessage,
    });
  } else {
    // Processa commit singolo
    return await processCommitOrCombination({
      payload,
      commit,
    });
  }
};
