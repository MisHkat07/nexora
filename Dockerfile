# ---- Build frontend ----
FROM node:20-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Runtime: backend serving API + built frontend ----
FROM node:20-slim
# PDFs are rendered with Puppeteer using the distro's Chromium (smaller than Puppeteer's download).
# Noto fonts cover non-Latin scripts (e.g. Bengali) in client names and addresses.
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium fonts-liberation fonts-noto-core \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/ ./
COPY --from=frontend /app/frontend/dist /app/frontend/dist
# Don't run Chromium (or anything else) as root
RUN chown -R node:node /app/backend/src/public
USER node
EXPOSE 8888
CMD ["node", "src/server.js"]
