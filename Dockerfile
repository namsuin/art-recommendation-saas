# Use Ubuntu-based Bun image for better compatibility
FROM oven/bun:1

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy package files first for better caching
COPY package.json ./
COPY bun.lock ./

# Install all dependencies (including dev dependencies for build)
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build frontend assets if the command exists
RUN bun run build || echo "No build script found, skipping..."

# Remove dev dependencies to reduce image size
RUN bun install --frozen-lockfile --production

# Keep as root for development (simpler deployment)

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start server
CMD ["bun", "run", "start"]