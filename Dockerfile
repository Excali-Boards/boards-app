# Stage 1: Build
FROM node:22-alpine AS build

WORKDIR /app
COPY . .

RUN corepack enable && corepack prepare pnpm@10 --activate
RUN pnpm install

ENV NODE_OPTIONS="--max-old-space-size=16384"
RUN pnpm build

# Stage 2: Runtime
FROM node:22-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10 --activate
COPY --from=build /app /app

CMD ["pnpm", "start"]
