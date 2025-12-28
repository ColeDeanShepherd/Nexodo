# Use Bun's official image
FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# Copy source code and build
FROM base AS build
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# Build the client
RUN bun run build:client

# Production image
FROM base AS production
COPY --from=build /app/public /app/public
COPY --from=build /app/src /app/src
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/package.json /app/package.json

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose the port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["bun", "run", "src/server/index.ts"]
