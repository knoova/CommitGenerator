"use server";

import fs from "fs/promises";
import os from "os";
import path from "path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { config } from "@/config";
import { videoPropsSchema } from "@/remotion/schemas";
import type { VideoProps } from "@/remotion/types";

let cachedBundle: Promise<string> | null = null;

const getBundle = async (): Promise<string> => {
  if (!cachedBundle) {
    cachedBundle = bundle({
      entryPoint: path.join(process.cwd(), "src", "remotion", "index.ts"),
      onProgress: () => undefined,
      webpackOverride: (currentConfig) => {
        // Handle node: protocol imports
        currentConfig.module = {
          ...currentConfig.module,
          parser: {
            ...currentConfig.module?.parser,
            javascript: {
              ...currentConfig.module?.parser?.javascript,
              importExportsPresence: 'error',
            },
          },
        };
        
        return {
          ...currentConfig,
          resolve: {
            ...currentConfig.resolve,
            alias: {
              ...(currentConfig.resolve?.alias ?? {}),
              "@": path.join(process.cwd(), "src"),
            },
          },
        };
      },
    });
  }
  return cachedBundle;
};

const getOptimalConcurrency = (): number => {
  const cores = os.cpus().length;
  return Math.max(2, cores - 2);
};

const stageLocalFile = async (
  bundleDir: string,
  localPath: string,
  label: string,
): Promise<{ servedName: string; cleanup: () => Promise<void> }> => {
  const ext = path.extname(localPath) || "";
  const filename = `_tmp_${label}_${Date.now()}${ext}`;
  const dest = path.join(bundleDir, "public", filename);

  await fs.copyFile(localPath, dest);

  return {
    servedName: filename,
    cleanup: async () => {
      try { await fs.unlink(dest); } catch { /* already removed */ }
    },
  };
};

const isLocalFile = async (value: string): Promise<boolean> => {
  if (!path.isAbsolute(value)) return false;
  try {
    await fs.access(value);
    return true;
  } catch {
    return false;
  }
};

export const renderCommitVideo = async (params: {
  commitSha: string;
  inputProps: VideoProps;
}): Promise<{ outputPath: string }> => {
  videoPropsSchema.parse(params.inputProps);

  await fs.mkdir(path.join(process.cwd(), config.outputDir), { recursive: true });
  await fs.mkdir(path.join(process.cwd(), config.tempDir), { recursive: true });

  const shortSha = params.commitSha.slice(0, 7);
  const bundleDir = await getBundle();

  const cleanups: Array<() => Promise<void>> = [];
  const inputProps = { ...params.inputProps };

  if (await isLocalFile(inputProps.audioUrl)) {
    const staged = await stageLocalFile(bundleDir, inputProps.audioUrl, `audio_${shortSha}`);
    inputProps.audioUrl = `/${staged.servedName}`;
    cleanups.push(staged.cleanup);
  }

  const composition = await selectComposition({
    serveUrl: bundleDir,
    id: config.remotionCompositionId,
    inputProps,
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputPath = path.join(process.cwd(), config.outputDir, `video_${shortSha}_${timestamp}.mp4`);

  try {
    await renderMedia({
      composition,
      serveUrl: bundleDir,
      codec: "h264",
      outputLocation: outputPath,
      inputProps,
      hardwareAcceleration: "if-possible",
      concurrency: getOptimalConcurrency(),
      chromiumOptions: {
        gl: "angle-egl",
      },
    });
  } finally {
    await Promise.all(cleanups.map((fn) => fn()));
  }

  return { outputPath };
};
