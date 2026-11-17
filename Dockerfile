# syntax=docker/dockerfile:1
FROM node:18-alpine

# Build from the repository root so the backend/ paths below are available.
WORKDIR /app

RUN apk add --no-cache openssl

COPY backend/package*.json ./
RUN npm install

COPY backend/prisma ./prisma
COPY backend/tsconfig.json ./tsconfig.json
COPY backend/src ./src

RUN npm run build \
    && npm prune --omit=dev

ENV NODE_ENV=production \
    PORT=8080

EXPOSE 8080

USER node

CMD ["npm", "start"]
