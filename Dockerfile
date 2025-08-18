# Use the official Bun image
FROM oven/bun:1 as base

WORKDIR /app

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy application files
COPY . .

# Expose port
EXPOSE 3000

# Start the application
CMD ["bun", "run", "start"]
