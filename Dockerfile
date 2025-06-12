# Stage 1: Build
FROM node:20.3.0-alpine3.18 AS build

WORKDIR /app
COPY . .

RUN npm install -g pnpm

RUN pnpm install
RUN pnpm build

# Stage 2: Runtime
FROM node:20.3.0-alpine3.18

WORKDIR /app

RUN npm install -g pnpm
COPY --from=build /app /app

CMD ["pnpm", "start"]
