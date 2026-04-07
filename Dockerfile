FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json ./
COPY server/ ./server/
COPY web/dist ./web/dist
COPY shared/ ./shared/

EXPOSE 3000

CMD ["node", "--experimental-sqlite", "server/src/app.js"]
