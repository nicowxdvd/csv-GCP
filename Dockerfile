FROM node:24-alpine AS base
WORKDIR /app

FROM base AS deps
# prisma.config.ts exige DATABASE_URL incluso para `prisma generate`; este valor solo vive en las etapas de build.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

FROM deps AS build
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev --ignore-scripts

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json prisma.config.ts ./
COPY prisma ./prisma
USER node
EXPOSE 3000
# prisma y dotenv son dependencies (no dev) para poder correr migrate deploy en la imagen final.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
