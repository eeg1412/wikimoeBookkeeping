# Build frontend
FROM cgr.dev/chainguard/node:latest-dev AS frontend
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# Production
FROM cgr.dev/chainguard/node:latest-dev
ENV NODE_ENV=production
WORKDIR /app
COPY package.json ./
COPY server/ ./server/
COPY --from=frontend /app/web/dist ./web/dist
COPY shared/ ./shared/

RUN mkdir -p /app/data /app/keys

EXPOSE 3000

CMD ["node", "--experimental-sqlite", "server/src/app.js"]
