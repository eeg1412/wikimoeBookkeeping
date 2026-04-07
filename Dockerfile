# Build frontend
FROM node:24-alpine AS frontend
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# Production
FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json ./
COPY server/ ./server/
COPY --from=frontend /app/web/dist ./web/dist

RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "--experimental-sqlite", "server/src/app.js"]
