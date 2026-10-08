FROM oven/bun:1.2.23

WORKDIR /app

RUN chown bun:bun /app
USER bun

COPY --chown=bun:bun package.json bun.lock bunfig.toml tsconfig.json ./
COPY --chown=bun:bun instructions.md ./
COPY --chown=bun:bun src ./src

RUN bun install --frozen-lockfile --production

EXPOSE 8787

ENV PORT=8787
ENV HOST=0.0.0.0
ENV HONCHO_BASE_URL=http://127.0.0.1:31111/v3
ENV HONCHO_API_URL=http://127.0.0.1:31111/v3

CMD ["bun", "src/http.ts"]
