# Idiotsyncratic Commits Generator

Applicazione full-stack `Next.js + Remotion + Node.js` che trasforma i commit GitHub in mini video karaoke umoristici con musica generata da AI, e li pubblica automaticamente su **GitHub Releases**, **YouTube** e **Facebook**.

## Filosofia del repository

Questo repository e' il **motore** della pipeline (webhook, LLM, audio generation, render, deploy multi-canale).
I video prodotti **non** vengono pushati nel ramo Git: sono consultabili nella sezione **Releases** del repository per evitare di appesantire il clone.

## Stack

- Next.js (App Router, TypeScript)
- Remotion (`@remotion/renderer`, `@remotion/cli`, `@remotion/player`, `@remotion/bundler`)
- Google GenAI SDK (`@google/genai`) per generazione testi umoristici
- Transformers.js + Xenova/musicgen-small per generazione musica locale (TypeScript/Node.js)
- GitHub CLI (`gh`) per creare release e caricare MP4
- Google APIs (`googleapis`) per upload YouTube
- Facebook Graph API v22.0 per upload video

## Prerequisiti

- Node.js >= 18.18
- `ffmpeg` installato (necessario al rendering e conversione audio)
- `gh` installato e autenticato (`gh auth login`)
- Repo GitHub con webhook `push`

## Setup

```bash
npm install
cp .env.example .env
```

Compila `.env`:

```env
GITHUB_WEBHOOK_SECRET=your_webhook_secret
GEMINI_API_KEY=your_gemini_api_key
GITHUB_REPO=owner/repo-name
MY_FACE_URL=/my_face.png
COMPANY_LOGO_URL=/company_logo.png

YOUTUBE_ENABLED=false
YOUTUBE_PRIVACY=unlisted

FACEBOOK_ENABLED=false
FACEBOOK_PAGE_ACCESS_TOKEN=
FACEBOOK_PAGE_ID=
FACEBOOK_APP_ID=
```

## Generazione musica (Transformers.js)

La musica per ogni video viene generata localmente con **Transformers.js** e il modello **Xenova/musicgen-small** (MusicGen in formato ONNX). Nessun Python, nessuna API esterna.

- **Setup**: `npm install` e `npm run dev` sono sufficienti. Nessun setup manuale.
- **Primo avvio**: il modello viene scaricato automaticamente da Hugging Face Hub (~500 MB) nella cache locale (`~/.cache/huggingface/`).
- **Fallback**: se la generazione fallisce (errore, timeout), la pipeline usa silenzio per non bloccare il flusso.

## YouTube Setup

1. Vai su [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuovo progetto (o usa uno esistente)
3. Abilita la **YouTube Data API v3**
4. Vai in `APIs & Services -> Credentials -> Create Credentials -> OAuth 2.0 Client ID`
5. Seleziona tipo **Desktop App**
6. Scarica il file JSON e salvalo come `client_secret.json` nella root del progetto
7. Imposta `YOUTUBE_ENABLED=true` nel `.env`
8. Al primo avvio, il sistema apre il browser per l'autenticazione OAuth
9. Autorizza l'app; il token viene salvato in `token.json` (riusato automaticamente)

**Nota:** `client_secret.json` e `token.json` sono in `.gitignore` e non vengono mai committati.

## Facebook Setup

1. Crea una [Facebook App](https://developers.facebook.com/apps/)
2. Aggiungi il prodotto **Video API**
3. Genera un **Page Access Token** long-lived con permessi:
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_posts`
4. Imposta nel `.env`:
   - `FACEBOOK_ENABLED=true`
   - `FACEBOOK_APP_ID=<id della tua app>`
   - `FACEBOOK_PAGE_ID=<id della tua pagina>`
   - `FACEBOOK_PAGE_ACCESS_TOKEN=<token long-lived>`

## Avvio locale

```bash
npm run dev
```

Webhook endpoint:

```txt
POST http://localhost:3001/api/github
```

## Esposizione webhook da locale

### Opzione A: ngrok

```bash
ngrok http 3001
```

Prendi l'URL HTTPS generato (`https://xxxxx.ngrok-free.app`) e usalo in GitHub Webhooks:

```txt
https://xxxxx.ngrok-free.app/api/github
```

### Opzione B: Cloudflare Tunnel

```bash
cloudflared tunnel --url http://localhost:3001
```

Usa l'URL pubblico fornito dal tunnel come payload URL con suffisso `/api/github`.

## Configurazione GitHub Webhook

Nel repository GitHub:

1. `Settings -> Webhooks -> Add webhook`
2. **Payload URL**: `https://<your-domain>/api/github`
3. **Content type**: `application/json`
4. **Secret**: uguale a `GITHUB_WEBHOOK_SECRET`
5. **Eventi**: seleziona `Just the push event`

## Pipeline automatica

Su ogni `push`:

1. Verifica `X-Hub-Signature-256`
2. Estrae commit message + autore + avatar + SHA
3. Genera testo canzone ironico con Gemini e genere casuale
4. Genera musica unica con MusicGen (basata sul genere scelto)
5. Renderizza MP4 con Remotion (hardware acceleration su Apple Silicon)
6. In parallelo (best-effort):
   - Crea GitHub Release con tag `v-{SHA}`, asset MP4, body con testo e crediti
   - Upload su YouTube (se abilitato)
   - Upload su Facebook (se abilitato)
7. Aggiorna `HISTORY.md` con formato:
   - `Data | Autore | Titolo | Release | YouTube | Facebook`
8. Pusha solo `HISTORY.md` (`[skip ci]` per evitare loop webhook)

## File chiave

- `src/app/api/github/route.ts`: webhook listener sicuro
- `src/lib/pipeline.ts`: orchestrazione end-to-end
- `src/lib/llm.ts`: Gemini prompt + fallback
- `src/lib/audio-gen.ts`: generazione musica con Transformers.js (MusicGen locale)
- `src/lib/render-video.ts`: bundle/selectComposition/renderMedia con HW accel
- `src/lib/release.ts`: creazione GitHub Release via `gh`
- `src/lib/youtube.ts`: upload YouTube via OAuth
- `src/lib/facebook.ts`: upload Facebook via Graph API
- `src/lib/history.ts`: update/push di `HISTORY.md`
- `src/remotion/*`: composizione video karaoke

## Asset template predefiniti

Mantieni in `public/`:

- `my_face.png`
- `company_logo.png`

Puoi sostituire i file immagine con i tuoi asset senza modificare codice.

## Script utili

```bash
npm run dev                     # Avvia Next.js in dev
npm run build                   # Build produzione
npm run start                   # Avvia server produzione
npm run typecheck               # Verifica tipi TypeScript
npm run lint                    # ESLint
npm run remotion:studio         # Apri Remotion Studio
npm run remotion:render-sample  # Render video di esempio
```

## Note operative

- Se `GEMINI_API_KEY` manca, il sistema usa fallback testuale locale.
- Se la generazione musica (Transformers.js) fallisce, il sistema genera un file audio di silenzio come fallback.
- Se `gh` non e' autenticato o il repo non e' corretto, la fase release fallisce.
- Se YouTube o Facebook falliscono, la pipeline prosegue (best-effort).
- I commit con `[skip ci]` vengono ignorati dal webhook per prevenire ricorsione.
- Il rendering sfrutta VideoToolbox (hardware acceleration) su macOS Apple Silicon quando disponibile.
