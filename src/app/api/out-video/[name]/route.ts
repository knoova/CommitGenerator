import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import path from "node:path";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

const SAFE_MP4 = /^[a-zA-Z0-9._-]+\.mp4$/i;

function resolvedOutPath(name: string): string | null {
  if (!SAFE_MP4.test(name)) return null;
  const outRoot = path.resolve(process.cwd(), "out");
  const filePath = path.resolve(outRoot, name);
  const prefix = outRoot.endsWith(path.sep) ? outRoot : `${outRoot}${path.sep}`;
  if (!filePath.startsWith(prefix) && filePath !== outRoot) return null;
  return filePath;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ name: string }> },
) {
  const { name: paramName } = await context.params;
  const name = decodeURIComponent(paramName);
  const filePath = resolvedOutPath(name);
  if (!filePath) {
    return new Response(JSON.stringify({ error: "Invalid file name" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let size: number;
  try {
    const s = await stat(filePath);
    if (!s.isFile()) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    size = s.size;
  } catch {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const download = request.nextUrl.searchParams.get("download") === "1";
  const range = request.headers.get("range");

  const baseHeaders: Record<string, string> = {
    "Content-Type": "video/mp4",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
  };

  if (download) {
    baseHeaders["Content-Disposition"] = `attachment; filename="${name.replace(/"/g, "")}"`;
  }

  if (range) {
    // Support simple single-range headers like:
    // - `bytes=500-999` (explicit start/end)
    // - `bytes=500-` (from start to end)
    // - `bytes=-500` (suffix: last 500 bytes)
    // For simplicity we only honor the first range if multiple are provided.
    const firstRange = range.split(",")[0]?.trim() ?? "";
    const match = /^bytes=(\d*)-(\d*)$/i.exec(firstRange);
    if (!match) {
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${size}` },
      });
    }

    const startStr = match[1];
    const endStr = match[2];
    const suffixLength =
      startStr === "" && endStr !== "" ? Number.parseInt(endStr, 10) : NaN;

    let start: number;
    let end: number;

    // Suffix-byte range: `bytes=-N` => last N bytes
    if (startStr === "" && endStr !== "") {
      if (Number.isNaN(suffixLength) || suffixLength <= 0) {
        return new Response(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${size}` },
        });
      }
      start = Math.max(size - suffixLength, 0);
      end = size - 1;
    } else {
      // Prefix or explicit ranges
      start = startStr === "" ? 0 : Number.parseInt(startStr, 10);
      end = endStr === "" ? size - 1 : Number.parseInt(endStr, 10);

      if (
        Number.isNaN(start) ||
        Number.isNaN(end) ||
        start < 0 ||
        end < 0
      ) {
        return new Response(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${size}` },
        });
      }
      if (start >= size) {
        return new Response(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${size}` },
        });
      }
      end = Math.min(end, size - 1);
      if (start > end) {
        return new Response(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${size}` },
        });
      }
    }

    const chunkSize = end - start + 1;
    const nodeStream = createReadStream(filePath, { start, end });
    // `Readable.toWeb()` returns Node's web stream type; cast so it matches the
    // `Response` body type expected by Next/undici.
    const webStream = Readable.toWeb(nodeStream) as unknown as globalThis.ReadableStream<Uint8Array>;

    return new Response(webStream, {
      status: 206,
      headers: {
        ...baseHeaders,
        "Content-Length": String(chunkSize),
        "Content-Range": `bytes ${start}-${end}/${size}`,
      },
    });
  }

  const nodeStream = createReadStream(filePath);
  const webStream = Readable.toWeb(nodeStream) as unknown as globalThis.ReadableStream<Uint8Array>;

  return new Response(webStream, {
    status: 200,
    headers: {
      ...baseHeaders,
      "Content-Length": String(size),
    },
  });
}
