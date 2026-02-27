import crypto from "crypto";

export type GitHubCommit = {
  id: string;
  message: string;
  timestamp?: string;
  url?: string;
  author: {
    name: string;
    username?: string;
  };
};

export type GitHubPushPayload = {
  ref: string;
  repository: {
    full_name: string;
    html_url: string;
  };
  sender: {
    login: string;
    avatar_url?: string;
  };
  head_commit: GitHubCommit | null;
  commits: GitHubCommit[];
};

export const verifyGitHubSignature = ({
  body,
  signature,
  secret,
}: {
  body: string;
  signature: string | null;
  secret: string;
}): boolean => {
  if (!signature?.startsWith("sha256=")) {
    return false;
  }

  const hmac = crypto.createHmac("sha256", secret);
  const digest = `sha256=${hmac.update(body).digest("hex")}`;

  const signatureBuffer = Buffer.from(signature);
  const digestBuffer = Buffer.from(digest);

  if (signatureBuffer.length !== digestBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(signatureBuffer, digestBuffer);
};

export const getLatestCommit = (payload: GitHubPushPayload): GitHubCommit | null => {
  if (payload.head_commit) {
    return payload.head_commit;
  }
  if (payload.commits.length === 0) {
    return null;
  }
  return payload.commits[payload.commits.length - 1] ?? null;
};
