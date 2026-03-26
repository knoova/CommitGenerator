"use server";
import fs from "fs/promises";
import path from "path";
import { z } from "zod";
import { config } from "@/config";

const GRAPH_API = "https://graph.facebook.com/v22.0";

/** Graph API error envelope (common across endpoints). */
const facebookGraphErrorSchema = z.object({
  error: z.object({
    message: z.string(),
    type: z.string().optional(),
    code: z.number().optional(),
    error_subcode: z.number().optional(),
    fbtrace_id: z.string().optional(),
    error_user_title: z.string().optional(),
    error_user_msg: z.string().optional(),
  }),
});

/** Step 1: POST /{app-id}/uploads — https://developers.facebook.com/docs/graph-api/guides/upload */
const uploadSessionResponseSchema = z.object({
  id: z.string().min(1),
});

/** Step 2: POST /upload:{session-id} — success returns file handle `h` */
const uploadFileHandleResponseSchema = z.object({
  h: z.string().min(1),
});

/** Publish video — success returns Graph node id for the video */
const publishVideoResponseSchema = z.object({
  id: z.string().min(1),
});

const truncateForLog = (s: string, max = 800) => (s.length <= max ? s : `${s.slice(0, max)}…`);

const readJsonBody = async (res: Response): Promise<unknown> => {
  const text = await res.text();
  if (!text.trim()) {
    throw new Error("Facebook API returned an empty response body");
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`Facebook API returned non-JSON body (${truncateForLog(text)})`);
  }
};

const throwIfGraphApiError = (json: unknown): void => {
  const errParsed = facebookGraphErrorSchema.safeParse(json);
  if (!errParsed.success) return;
  const e = errParsed.data.error;
  const parts = [
    `Facebook API: ${e.message}`,
    e.code !== undefined ? `code=${e.code}` : null,
    e.error_subcode !== undefined ? `subcode=${e.error_subcode}` : null,
    e.fbtrace_id ? `fbtrace_id=${e.fbtrace_id}` : null,
  ].filter(Boolean);
  throw new Error(parts.join(" | "));
};

/**
 * Read JSON, surface Graph `error` objects, then validate success shape.
 * @see https://developers.facebook.com/docs/graph-api/guides/upload
 */
const parseFacebookResponse = async <T>(
  res: Response,
  successSchema: z.ZodType<T>,
  context: string,
): Promise<T> => {
  const json = await readJsonBody(res);
  throwIfGraphApiError(json);

  if (!res.ok) {
    throw new Error(
      `${context} failed (HTTP ${res.status}): ${truncateForLog(JSON.stringify(json))}`,
    );
  }

  const parsed = successSchema.safeParse(json);
  if (!parsed.success) {
    const detail = JSON.stringify(z.treeifyError(parsed.error));
    const raw = truncateForLog(JSON.stringify(json));
    throw new Error(
      `${context}: unexpected response shape (${detail}). ` +
        `Expected fields per Meta Resumable Upload / Video API docs. Raw: ${raw}`,
    );
  }
  return parsed.data;
};

const startUploadSession = async (params: {
  appId: string;
  accessToken: string;
  fileName: string;
  fileLength: number;
}): Promise<string> => {
  const url = `${GRAPH_API}/${params.appId}/uploads`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      file_name: params.fileName,
      file_length: params.fileLength,
      file_type: "video/mp4",
    }),
  });

  const data = await parseFacebookResponse(res, uploadSessionResponseSchema, "Facebook upload session");
  return data.id;
};

const uploadFileChunk = async (params: {
  sessionId: string;
  accessToken: string;
  fileBuffer: Blob;
}): Promise<string> => {
  const url = `${GRAPH_API}/${params.sessionId}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `OAuth ${params.accessToken}`,
      "Content-Type": "application/octet-stream",
      file_offset: "0",
    },
    body: params.fileBuffer,
  });

  const data = await parseFacebookResponse(res, uploadFileHandleResponseSchema, "Facebook file upload");
  return data.h;
};

const publishVideo = async (params: {
  pageId: string;
  accessToken: string;
  fileHandle: string;
  title: string;
  description: string;
}): Promise<string> => {
  const url = `${GRAPH_API}/${params.pageId}/videos`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      file_url: params.fileHandle,
      title: params.title,
      description: params.description,
    }),
  });

  const data = await parseFacebookResponse(res, publishVideoResponseSchema, "Facebook publish video");
  return data.id;
};

export const uploadToFacebook = async (params: {
  videoPath: string;
  title: string;
  description: string;
}): Promise<{ facebookUrl: string }> => {
  const accessToken = config.FACEBOOK_PAGE_ACCESS_TOKEN;
  const pageId = config.FACEBOOK_PAGE_ID;
  const appId = config.FACEBOOK_APP_ID;

  if (!accessToken || !pageId || !appId) {
    throw new Error("Facebook credentials not configured (FACEBOOK_PAGE_ACCESS_TOKEN, FACEBOOK_PAGE_ID, FACEBOOK_APP_ID)");
  }

  const absolutePath = path.resolve(params.videoPath);
  const stat = await fs.stat(absolutePath);
  const fileName = path.basename(absolutePath);
  const fileBuffer = new Blob([await fs.readFile(absolutePath)], { type: "video/mp4" });

  const sessionId = await startUploadSession({
    appId,
    accessToken,
    fileName,
    fileLength: stat.size,
  });

  const fileHandle = await uploadFileChunk({
    sessionId,
    accessToken,
    fileBuffer,
  });

  const videoId = await publishVideo({
    pageId,
    accessToken,
    fileHandle,
    title: params.title.slice(0, 255),
    description: params.description.slice(0, 5000),
  });

  return { facebookUrl: `https://facebook.com/${pageId}/videos/${videoId}` };
};
