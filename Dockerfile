FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
RUN corepack enable && CI=true pnpm install --frozen-lockfile

FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && CI=true pnpm build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
RUN corepack enable && CI=true pnpm install --prod --frozen-lockfile
COPY --from=build /app/dist ./dist
EXPOSE 8080
CMD ["node", "dist/server.js"]
