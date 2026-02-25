import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type ReleaseParams = {
  commitSha: string;
  commitMessage: string;
  generatedTitle: string;
  generatedText: string;
  authorName: string;
  authorAvatarUrl: string;
  repoFullName: string;
  videoPath: string;
  youtubeUrl?: string;
  facebookUrl?: string;
};

const socialLine = (label: string, url: string | undefined) =>
  url ? `- ${label}: [${url}](${url})` : `- ${label}: coming soon`;

const buildReleaseBody = (params: ReleaseParams) => {
  return [
    "## Idiotsyncratic Song",
    "",
    params.generatedText,
    "",
    "## Commit originale",
    "",
    `- SHA: \`${params.commitSha}\``,
    `- Messaggio: ${params.commitMessage}`,
    "",
    "## Social",
    "",
    socialLine("YouTube", params.youtubeUrl),
    socialLine("Facebook", params.facebookUrl),
    "",
    "## Crediti",
    "",
    `- Autore: @${params.authorName}`,
    `- Avatar: ${params.authorAvatarUrl}`,
  ].join("\n");
};

const createRelease = async (args: {
  tagName: string;
  title: string;
  notes: string;
  videoPath: string;
  repoFullName: string;
}) => {
  const result = await execFileAsync("gh", [
    "release",
    "create",
    args.tagName,
    args.videoPath,
    "--title",
    args.title,
    "--notes",
    args.notes,
    "--repo",
    args.repoFullName,
  ]);

  const output = `${result.stdout}\n${result.stderr}`;
  const urlMatch = output.match(/https:\/\/github\.com\/[^\s]+\/releases\/tag\/[^\s]+/);

  return {
    url: urlMatch?.[0],
  };
};

export const createGitHubRelease = async (params: ReleaseParams): Promise<{
  tagName: string;
  releaseUrl: string;
}> => {
  const shortSha = params.commitSha.slice(0, 7);
  const title = params.generatedTitle.trim() || params.commitMessage.trim();
  const notes = buildReleaseBody(params);

  const primaryTag = `v-${shortSha}`;
  try {
    const res = await createRelease({
      tagName: primaryTag,
      title,
      notes,
      videoPath: params.videoPath,
      repoFullName: params.repoFullName,
    });
    return { tagName: primaryTag, releaseUrl: res.url ?? "" };
  } catch {
    const fallbackTag = `v-${shortSha}-${Date.now()}`;
    const res = await createRelease({
      tagName: fallbackTag,
      title,
      notes,
      videoPath: params.videoPath,
      repoFullName: params.repoFullName,
    });
    return { tagName: fallbackTag, releaseUrl: res.url ?? "" };
  }
};
