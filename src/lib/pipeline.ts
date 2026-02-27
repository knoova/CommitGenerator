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

export const processCommitPipeline = async ({
  payload,
  commit,
}: {
  payload: GitHubPushPayload;
  commit: GitHubCommit;
}) => {
  const authorName = commitAuthor(commit, payload);
  const authorAvatarUrl = avatarUrl(payload, authorName);
  const commitMessage = commit.message.trim();

  const llm = await generateFunnyLyrics(commitMessage, commit.id);

  const music = await generateAudio({
    genre: llm.genre,
    commitMessage,
    commitSha: commit.id,
    lyrics: llm.generatedText,
  });

  const rendered = await renderCommitVideo({
    commitSha: commit.id,
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
    [...commit.id.slice(0, 8)].reduce((a, c) => a + c.charCodeAt(0), 0) %
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
        commitSha: commit.id,
        commitMessage,
        generatedTitle: llm.generatedTitle,
        generatedText: llm.generatedText,
        authorName,
        authorAvatarUrl,
        repoFullName: payload.repository.full_name || config.GITHUB_REPO,
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
  const tagName = releaseResult.ok ? releaseResult.value.tagName : `v-${commit.id.slice(0, 7)}`;
  const youtubeUrl = ytResult.ok ? ytResult.value.youtubeUrl : undefined;
  const facebookUrl = fbResult.ok ? fbResult.value.facebookUrl : undefined;

  if (releaseResult.ok && (youtubeUrl || facebookUrl)) {
    await settle("Release update with social links", () =>
      createGitHubRelease({
        commitSha: commit.id,
        commitMessage,
        generatedTitle: llm.generatedTitle,
        generatedText: llm.generatedText,
        authorName,
        authorAvatarUrl,
        repoFullName: payload.repository.full_name || config.GITHUB_REPO,
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
