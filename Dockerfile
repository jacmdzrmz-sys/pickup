FROM node:18-alpine AS build

WORKDIR /app

COPY backend/package*.json ./
RUN npm install

COPY backend/prisma ./prisma
RUN npx prisma generate

COPY backend/tsconfig.json ./tsconfig.json
COPY backend/src ./src
RUN npm run build
RUN npm prune --omit=dev

FROM node:18-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package*.json ./
COPY --from=build --chown=node:node /app/dist ./dist

EXPOSE 8080

USER node

CMD ["npm", "start"]
