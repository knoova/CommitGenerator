import fs from "node:fs/promises";
import path from "node:path";
import { config } from "@/config";

const GRAPH_API = "https://graph.facebook.com/v22.0";

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

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`FB upload session failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { id: string };
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

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`FB file upload failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { h: string };
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

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`FB video publish failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { id: string };
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
