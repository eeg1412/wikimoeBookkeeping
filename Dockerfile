FROM cgr.dev/chainguard/node:24
ENV NODE_ENV=production
WORKDIR /app
COPY package.json ./
COPY server/ ./server/
COPY web/dist ./web/dist
COPY shared/ ./shared/

RUN mkdir -p /app/data /app/keys

EXPOSE 3000

CMD ["--experimental-sqlite", "server/src/app.js"]
