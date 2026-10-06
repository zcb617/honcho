FROM oven/bun:1.2.23 AS bun

FROM node:24-slim

COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY tsconfig.json wrangler.toml ./
COPY src/ ./src/

EXPOSE 8787

CMD ["node", "node_modules/wrangler/wrangler-dist/cli.js", "dev", "--ip", "127.0.0.1", "--port", "8787", "--local-protocol", "http", "--show-interactive-dev-session=false", "--var", "HONCHO_BASE_URL:http://127.0.0.1:31111/v3"]
