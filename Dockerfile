# ---- Build frontend ----
FROM node:20-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Runtime: backend serving API + built frontend ----
FROM node:20-slim
# html-pdf (PhantomJS) needs these at runtime
RUN apt-get update && apt-get install -y --no-install-recommends bzip2 fontconfig \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/ ./
COPY --from=frontend /app/frontend/dist /app/frontend/dist
EXPOSE 8888
CMD ["node", "src/server.js"]
