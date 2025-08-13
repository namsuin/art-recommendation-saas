# Bun runtime
FROM oven/bun:1-alpine

WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Copy source code
COPY . .

# Build frontend assets
RUN bun run build

# Expose port
EXPOSE 3000

# Start server
CMD ["bun", "run", "start"]