import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { bundle } from '@remotion/bundler';

let cachedBundle: Promise<string> | null = null;

export async function GET() {
  if (!cachedBundle) {
    cachedBundle = bundle({
      entryPoint: path.join(process.cwd(), "src", "remotion", "index.ts"),
      onProgress: () => undefined,
      webpackOverride: (currentConfig) => {
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
  
  const bundleDir = await cachedBundle;
  return NextResponse.json({ bundleDir });
}