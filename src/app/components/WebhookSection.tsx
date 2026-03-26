"use client";

import { useCallback, useState } from "react";
import { SectionCard } from "@/app/components/SectionCard";

/** Path segment GitHub webhook should POST to (same host as this app). */
export const WEBHOOK_PATH = "/api/github";

export function WebhookSection() {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const copyPath = useCallback(async () => {
    setCopyError(false);
    try {
      await navigator.clipboard.writeText(WEBHOOK_PATH);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
      window.setTimeout(() => setCopyError(false), 3000);
    }
  }, []);

  return (
    <SectionCard
      title="Webhook"
      description="Configura il push event su GitHub con lo stesso secret di GITHUB_WEBHOOK_SECRET."
    >
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <span className="text-sm font-medium text-zinc-500">POST</span>
        <code
          className="font-mono rounded-lg border border-cyan-500/25 bg-cyan-950/40 px-3 py-2 text-sm text-cyan-100"
          translate="no"
        >
          {WEBHOOK_PATH}
        </code>
        <button
          type="button"
          onClick={copyPath}
          aria-label={
            copied
              ? "Percorso copiato negli appunti"
              : `Copia negli appunti il percorso ${WEBHOOK_PATH}`
          }
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-cyan-500/40 hover:bg-cyan-950/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
        >
          {copied ? (
            <>
              <span aria-hidden>✓</span> Copiato
            </>
          ) : copyError ? (
            <>
              <span aria-hidden>!</span> Errore copia
            </>
          ) : (
            <>
              <span aria-hidden className="text-zinc-400">
                ⧉
              </span>
              Copia percorso
            </>
          )}
        </button>
      </div>

      <details className="mt-5 rounded-xl border border-white/10 bg-black/20 open:border-cyan-500/20 open:bg-cyan-950/10">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-zinc-300 transition-colors marker:hidden hover:text-white [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2">
            <span className="text-cyan-400/80" aria-hidden>
              ▸
            </span>
            Come testare in locale (ngrok)
          </span>
        </summary>
        <div className="border-t border-white/10 px-4 pb-4 pt-2 text-sm leading-relaxed text-zinc-400">
          <ol className="list-decimal space-y-3 pl-5">
            <li>
              Avvia l&apos;app in sviluppo (porta predefinita <code className="font-mono text-zinc-300">3001</code>
              ):{" "}
              <code className="rounded bg-zinc-800/80 px-1.5 py-0.5 font-mono text-xs text-cyan-200/90">
                npm run dev
              </code>
            </li>
            <li>
              Installa{" "}
              <a
                href="https://ngrok.com/download"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300"
              >
                ngrok
              </a>{" "}
              e autenticati (<code className="font-mono text-zinc-300">ngrok config add-authtoken …</code>
              ).
            </li>
            <li>
              Espandi la porta del server Next:
              <pre className="mt-2 overflow-x-auto rounded-lg border border-white/10 bg-zinc-950/80 p-3 font-mono text-xs text-zinc-300">
                ngrok http 3001
              </pre>
            </li>
            <li>
              Copia l&apos;URL HTTPS mostrato da ngrok (es.{" "}
              <code className="font-mono text-zinc-300">https://abc123.ngrok-free.app</code>) e in
              GitHub → <strong className="text-zinc-300">Settings → Webhooks → Add webhook</strong> imposta:
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>
                  <strong className="text-zinc-300">Payload URL</strong>:{" "}
                  <code className="break-all font-mono text-xs text-cyan-200/80">
                    https://&lt;tuo-subdominio&gt;.ngrok-free.app{WEBHOOK_PATH}
                  </code>
                </li>
                <li>
                  <strong className="text-zinc-300">Content type</strong>:{" "}
                  <code className="font-mono text-xs">application/json</code>
                </li>
                <li>
                  <strong className="text-zinc-300">Secret</strong>: uguale a{" "}
                  <code className="font-mono text-xs">GITHUB_WEBHOOK_SECRET</code> nel tuo{" "}
                  <code className="font-mono text-xs">.env</code>
                </li>
                <li>
                  Eventi: solo <strong className="text-zinc-300">push</strong>
                </li>
              </ul>
            </li>
            <li>
              In locale, per test senza verifica firma, puoi impostare temporaneamente{" "}
              <code className="font-mono text-xs text-zinc-300">SKIP_WEBHOOK_VERIFY=true</code> (solo
              sviluppo).
            </li>
          </ol>
        </div>
      </details>
    </SectionCard>
  );
}
