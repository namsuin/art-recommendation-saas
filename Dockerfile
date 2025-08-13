# Use the latest Bun image
FROM oven/bun:1-alpine

# Set working directory
WORKDIR /app

# Install system dependencies if needed
RUN apk add --no-cache curl

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

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S bun -u 1001

# Change ownership of the app directory
RUN chown -R bun:nodejs /app
USER bun

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start server
CMD ["bun", "run", "start"]