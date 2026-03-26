import { Ollama } from "ollama";
import { config } from "@/config";

const LIST_TIMEOUT_MS = 8_000;
/** Evita due `list()` nella stessa pipeline (lyrics + CTA). */
const HEALTH_CACHE_MS = 15_000;

type HealthResult = { ok: true } | { ok: false; reason: string };
let healthCache: { expires: number; result: HealthResult } | null = null;

/** Match requested name (e.g. `llama3`) to Ollama list entries (`llama3:latest`, etc.). */
export function modelIsListed(
  models: ReadonlyArray<{ name: string; model: string }>,
  requested: string,
): boolean {
  const r = requested.trim();
  if (!r) return false;
  return models.some((m) => {
    const name = m.name;
    const model = m.model;
    if (name === r || model === r) return true;
    if (name.startsWith(`${r}:`)) return true;
    const base = name.includes(":") ? name.slice(0, name.indexOf(":")) : name;
    return base === r;
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

export function getOllamaHost(): string {
  return config.OLLAMA_HOST?.trim() || "http://localhost:11434";
}

export function getOllamaModel(): string {
  return config.OLLAMA_MODEL.trim();
}

export function getOllamaClient(): Ollama {
  return new Ollama({ host: getOllamaHost() });
}

/**
 * Verifies Ollama is reachable and the configured model is installed (via `list()`).
 * @see https://github.com/ollama/ollama/blob/main/docs/api.md
 */
async function runOllamaHealthCheck(): Promise<HealthResult> {
  const host = getOllamaHost();
  const model = getOllamaModel();
  const client = getOllamaClient();

  try {
    const list = await withTimeout(client.list(), LIST_TIMEOUT_MS, "Ollama list()");
    if (!modelIsListed(list.models, model)) {
      const installed =
        list.models.map((m) => m.name).join(", ") || "(nessun modello installato)";
      return {
        ok: false,
        reason: `Modello "${model}" assente. Installati: ${installed}. Suggerimento: ollama pull ${model}`,
      };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      reason: `Ollama non raggiungibile su ${host}: ${msg}`,
    };
  }
}

export async function checkOllamaModelReady(): Promise<HealthResult> {
  const now = Date.now();
  if (healthCache && healthCache.expires > now) {
    return healthCache.result;
  }
  const result = await runOllamaHealthCheck();
  healthCache = { expires: now + HEALTH_CACHE_MS, result };
  return result;
}
