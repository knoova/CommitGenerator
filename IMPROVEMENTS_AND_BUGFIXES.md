# Improvements and Bugfixes

## Critical bugfixes (implemented)

### 1. **Webhook signature verification** — FIXED
- **File:** `src/app/api/github/route.ts`
- **Issue:** `if (false && !verifyGitHubSignature(...))` permanently bypasses verification. Any client can POST to `/api/github` and trigger the pipeline.
- **Fix applied:** Verification is now controlled by `SKIP_WEBHOOK_VERIFY` (env). When unset or `false`, signature is verified. Set `SKIP_WEBHOOK_VERIFY=true` only for local/testing.

### 2. **GitHub Release not updated with YouTube/Facebook links** — FIXED
- **Files:** `src/lib/pipeline.ts`, `src/lib/release.ts`
- **Issue:** When YouTube or Facebook upload succeeds, the pipeline calls `createGitHubRelease()` again with `youtubeUrl`/`facebookUrl` to add them to the release body. But `createGitHubRelease` always runs `gh release create`, which creates a new release. The same tag already exists, so the second call fails (duplicate tag), and the release notes are never updated with social links.
- **Fix applied:** Added `updateGitHubReleaseWithSocialLinks()` in `release.ts` (uses `gh release edit`). Pipeline calls it when YouTube/Facebook uploads succeed.

### 3. **`pushHistoryOnly` fails when there’s nothing to commit** — FIXED
- **File:** `src/lib/history.ts`
- **Issue:** `git commit` fails if `HISTORY.md` wasn’t changed (e.g. write was a no-op or file was already committed). The pipeline then throws and may leave the process in a bad state.
- **Fix applied:** `git commit` is wrapped in try/catch; if the error message indicates "nothing to commit" / "no changes added", we return without throwing. Otherwise we rethrow. Push runs only after a successful commit.

---

## Important improvements

### 4. **History parser and markdown in cells**
- **File:** `src/app/page.tsx`
- **Issue:** `parseHistory` splits rows by `|` only. If a cell contains escaped `\|` (e.g. in title), splitting still breaks columns. The release cell is stored as markdown `[tag](url)` but displayed as raw text.
- **Improvement:** Parse rows so that escaped `\|` is not treated as column separator (e.g. split by `|` but merge cells that had `\|`). Optionally render the release column as a link (e.g. strip markdown and use `<a href>` or a simple markdown renderer).

### 5. **YouTube OAuth “open” is macOS-only**
- **File:** `src/lib/youtube.ts`
- **Issue:** `exec('open "${authUrl}"')` only works on macOS. On Linux/Windows the browser won’t open automatically.
- **Improvement:** Use a small helper that picks `open` (macOS), `xdg-open` (Linux), or `start` (Windows), or print the URL and instruct the user to open it manually.

### 6. **Facebook upload API and response shape**
- **File:** `src/lib/facebook.ts`
- **Issue:** The upload chunk response is cast as `{ h: string }`. Facebook’s resumable upload may return a different shape (e.g. `upload_session_id` or other fields). If the API changes, this can break.
- **Improvement:** Validate the response shape (e.g. with Zod or explicit checks) and handle missing `h` with a clear error. Align with the latest [Video API](https://developers.facebook.com/docs/video-api/guides/publishing/) / resumable upload docs.

### 7. **Ollama/LLM robustness**
- **Files:** `src/lib/llm.ts`, `src/lib/description-cta.ts`
- **Issue:** Both assume Ollama is running and that the model is `llama3`. No health check or fallback if Ollama is down or the model is missing.
- **Improvement:** Add a pre-check (e.g. `ollama.show()` or list models) and a clear error or fallback (e.g. static title/lyrics or “Commit [genre]” placeholder) when Ollama is unavailable.

### 8. **Config vs README**
- **Files:** `README.md`, `src/config.ts`
- **Issue:** README mentions `GEMINI_API_KEY` and Gemini for lyrics; the app actually uses Ollama. This is misleading for setup.
- **Improvement:** Update README to describe Ollama + Llama3 and required env (e.g. `OLLAMA_HOST`), and remove or qualify Gemini references.

### 9. **Error handling in pipeline**
- **File:** `src/lib/pipeline.ts`
- **Issue:** If `appendHistoryRow` or `pushHistoryOnly` fails after a successful release/upload, the error is thrown and the pipeline fails even though the main work (video, release, social) succeeded.
- **Improvement:** Treat history append and history push as best-effort: catch errors, log them, and still return success with `releaseUrl`, `youtubeUrl`, `facebookUrl`, and `videoPath` so callers don’t think the whole run failed.

### 10. **Voice generation and duration**
- **File:** `src/lib/voice-gen.ts`
- **Issue:** `generateSungVoice` and `generateSpokenVoice` don’t receive or use `durationSeconds`; the generated WAV length is fixed by the TTS output. If the instrumental is longer than the voice (or vice versa), the mix may be misaligned.
- **Improvement:** Pass `durationSeconds` into Echogarden or post-process (e.g. pad/trim) so voice length matches the requested duration before mixing in `audio-gen.ts`.

### 11. **Type safety in audio-gen**
- **File:** `src/lib/audio-gen.ts`
- **Issue:** Heavy use of `as` casts for tokenizer and model (e.g. `(tokenizer as (text: string, ...))`, `(model as MusicgenForConditionalGeneration)`). This can hide API drift.
- **Improvement:** Rely on proper types from `@huggingface/transformers` or define minimal interfaces for the methods you call so that type errors surface at compile time.

### 12. **Logging and observability**
- **Files:** `src/lib/logger.ts`, pipeline/lib files
- **Issue:** Errors are logged to a file and `console.error`; there’s no correlation ID (e.g. commit SHA) in every log line, and no structured logging.
- **Improvement:** Add a request/commit context (e.g. commit SHA) to all log calls in the pipeline and use a single logger that supports structured fields (e.g. `{ sha, step, error }`) for easier debugging.

---

## Minor / nice-to-have

### 13. **Home page: show YouTube and Facebook columns**
- **File:** `src/app/page.tsx`
- **Issue:** `HISTORY.md` has 6 columns (Data, Autore, Titolo, Release, YouTube, Facebook) but the table only shows 4. YouTube and Facebook links are not visible.
- **Improvement:** Extend `HistoryRow` and the table to include optional `youtube` and `facebook` (or reuse the same 6 columns) and render them as links.

### 14. **Remotion composition duration**
- **File:** `src/remotion/Composition.tsx`
- **Issue:** Intro/Main/Outro durations are hardcoded (120, 300, 120 frames). If audio is longer than the main segment, it will be cut; if shorter, silence.
- **Improvement:** Derive composition duration from actual audio length (or pass `durationInFrames` from props) so the video length matches the audio.

### 15. **Rate limiting and idempotency**
- **File:** `src/app/api/github/route.ts`
- **Issue:** Multiple rapid pushes (or retries) can trigger multiple pipelines for the same or different commits. No idempotency or rate limiting.
- **Improvement:** Optionally skip processing if a release for the same commit SHA already exists, or add simple in-memory/Redis rate limiting per repo/commit.

---

## Summary

| Priority   | Item | Type   |
|-----------|------|--------|
| Critical  | 1. Webhook verification disabled | Bugfix |
| Critical  | 2. Release not updated with social links | Bugfix |
| Critical  | 3. pushHistoryOnly fails when nothing to commit | Bugfix |
| Important | 4. History parser and escaped pipes | Improvement |
| Important | 5. YouTube OAuth open command cross-platform | Improvement |
| Important | 6. Facebook upload response validation | Improvement |
| Important | 7. Ollama availability and fallback | Improvement |
| Important | 8. README vs config (Gemini vs Ollama) | Improvement |
| Important | 9. History append/push best-effort | Improvement |
| Important | 10. Voice duration alignment | Improvement |
| Important | 11. audio-gen type safety | Improvement |
| Important | 12. Structured logging | Improvement |
| Minor     | 13–15 | Nice-to-have |
