import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import http from "node:http";
import { URL } from "node:url";
import { google } from "googleapis";
import { config } from "@/config";

const SCOPES = ["https://www.googleapis.com/auth/youtube.upload"];
const CLIENT_SECRET_PATH = path.join(process.cwd(), "client_secret.json");
const TOKEN_PATH = path.join(process.cwd(), "token.json");
const REDIRECT_PORT = 9473;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/oauth2callback`;

const loadClientCredentials = async () => {
  const raw = await fsPromises.readFile(CLIENT_SECRET_PATH, "utf8");
  const json = JSON.parse(raw) as {
    installed?: { client_id: string; client_secret: string };
    web?: { client_id: string; client_secret: string };
  };
  const creds = json.installed ?? json.web;
  if (!creds) throw new Error("client_secret.json must contain 'installed' or 'web' credentials");
  return creds;
};

const loadSavedToken = async () => {
  try {
    const raw = await fsPromises.readFile(TOKEN_PATH, "utf8");
    return JSON.parse(raw) as { access_token: string; refresh_token: string };
  } catch {
    return null;
  }
};

const saveToken = async (token: object) => {
  await fsPromises.writeFile(TOKEN_PATH, JSON.stringify(token, null, 2), "utf8");
};

const getAuthCodeViaLocalServer = (authUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? "/", `http://localhost:${REDIRECT_PORT}`);
      const code = url.searchParams.get("code");
      if (code) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("<h1>Autorizzazione completata. Puoi chiudere questa finestra.</h1>");
        server.close();
        resolve(code);
      } else {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Missing code parameter");
      }
    });
    server.listen(REDIRECT_PORT, () => {
      console.log(`YouTube OAuth: apri nel browser -> ${authUrl}`);
      import("node:child_process").then(({ exec }) => {
        exec(`open "${authUrl}"`);
      }).catch(() => { /* manual open */ });
    });
    server.on("error", reject);
    setTimeout(() => { server.close(); reject(new Error("OAuth timeout (120s)")); }, 120_000);
  });
};

const getAuthorizedClient = async () => {
  const creds = await loadClientCredentials();

  const oauth2 = new google.auth.OAuth2(creds.client_id, creds.client_secret, REDIRECT_URI);

  const saved = await loadSavedToken();
  if (saved) {
    oauth2.setCredentials(saved);
    oauth2.on("tokens", (tokens) => {
      void saveToken({ ...saved, ...tokens });
    });
    return oauth2;
  }

  const authUrl = oauth2.generateAuthUrl({ access_type: "offline", scope: SCOPES, prompt: "consent" });
  const code = await getAuthCodeViaLocalServer(authUrl);
  const { tokens } = await oauth2.getToken(code);
  oauth2.setCredentials(tokens);
  await saveToken(tokens);

  oauth2.on("tokens", (newTokens) => {
    void saveToken({ ...tokens, ...newTokens });
  });

  return oauth2;
};

export const uploadToYouTube = async (params: {
  videoPath: string;
  title: string;
  description: string;
}): Promise<{ youtubeUrl: string }> => {
  const auth = await getAuthorizedClient();
  const youtube = google.youtube({ version: "v3", auth });

  const privacy = config.YOUTUBE_PRIVACY || "unlisted";

  const res = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: params.title.slice(0, 100),
        description: params.description.slice(0, 5000),
        categoryId: "22",
      },
      status: {
        privacyStatus: privacy,
      },
    },
    media: {
      body: fs.createReadStream(params.videoPath),
    },
  });

  const videoId = res.data.id;
  if (!videoId) throw new Error("YouTube upload succeeded but returned no video ID");

  return { youtubeUrl: `https://youtu.be/${videoId}` };
};
