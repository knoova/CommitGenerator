# ---- Stage 1: install dependencies ----
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ---- Stage 2: build Next.js ----
FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Stage 3: production runtime ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app

# Chromium + EGL/GLES for Remotion video rendering (gl: "angle-egl")
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    libegl1 \
    libegl-mesa0 \
    libgles2 \
    libgbm1 \
    libgl1-mesa-dri \
    fonts-liberation \
    fonts-noto-color-emoji \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# Tell Remotion where to find Chromium
ENV CHROME_EXECUTABLE=/usr/bin/chromium

# Next.js production build
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./

# node_modules required both for Next.js runtime and Remotion bundler
COPY --from=builder /app/node_modules ./node_modules

# Source files required by Remotion bundler (runs at runtime on first webhook)
COPY --from=builder /app/src ./src
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/remotion.config.ts ./
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/postcss.config.mjs ./
COPY --from=builder /app/tailwind.config.ts ./

# Writable directories for generated videos and temp audio
RUN mkdir -p out temp

EXPOSE 3000
CMD ["npm", "start"]
