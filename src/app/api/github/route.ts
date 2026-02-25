import { NextResponse } from "next/server";
import { config } from "@/config";
import { processCommitPipeline } from "@/lib/pipeline";
import {
  getLatestCommit,
  verifyGitHubSignature,
  type GitHubPushPayload,
} from "@/lib/webhook";

export const runtime = "nodejs";

const hasSkipCi = (message: string) => /\[skip ci\]/i.test(message);

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  const event = request.headers.get("x-github-event");

  if (
    !verifyGitHubSignature({
      body,
      signature,
      secret: config.GITHUB_WEBHOOK_SECRET,
    })
  ) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  if (event !== "push") {
    return NextResponse.json({ ok: true, ignored: `event ${event}` }, { status: 202 });
  }

  let payload: GitHubPushPayload;
  try {
    payload = JSON.parse(body) as GitHubPushPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON payload" }, { status: 400 });
  }

  const commit = getLatestCommit(payload);
  if (!commit) {
    console.log("No commit found");
    return NextResponse.json({ ok: true, ignored: "No commit found" }, { status: 202 });
  }

  if (hasSkipCi(commit.message)) {
    console.log("Skipping [skip ci] commit");
    return NextResponse.json({ ok: true, ignored: "[skip ci] commit" }, { status: 202 });
  }

  void processCommitPipeline({ payload, commit }).catch((error: unknown) => {
    console.error("Pipeline error", error);
  });

  return NextResponse.json(
    { ok: true, accepted: true, commit: commit.id.slice(0, 7) },
    { status: 202 },
  );
}
