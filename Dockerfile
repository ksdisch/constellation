# Relay-only image. The clients are static (built with `vite build`, hosted on
# itch.io / any static host); this container runs just the `ws` relay.
FROM node:22-slim

WORKDIR /app

# Install deps against the committed lockfile. tsx (a locked-stack dev tool) is
# used to run the TypeScript relay directly — no separate compile step.
COPY package.json package-lock.json ./
RUN npm ci

# The relay's runtime surface: server/ plus the type-only shared protocol.
COPY server ./server
COPY src/shared ./src/shared
COPY tsconfig.json ./

# Fly (and most platforms) inject PORT; default to 8080 for the http_service.
ENV PORT=8080
EXPOSE 8080

CMD ["npm", "run", "start:relay"]
