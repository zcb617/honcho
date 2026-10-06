FROM oven/bun:1.2.23

WORKDIR /app

RUN chown bun:bun /app
USER bun

COPY --chown=bun:bun package.json bun.lock bunfig.toml tsconfig.json ./
COPY --chown=bun:bun instructions.md ./
COPY --chown=bun:bun src ./src

RUN bun install --frozen-lockfile --production

EXPOSE 3000

ENV PORT=3000
ENV HOST=0.0.0.0
ENV HONCHO_BASE_URL=http://127.0.0.1:31111/v3

CMD ["bun", "src/http.ts"]
