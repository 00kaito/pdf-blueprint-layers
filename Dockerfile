# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDeps for build)
RUN npm ci

# Copy source code
COPY . .

# Build the project
RUN npm run build

# Stage 2: Runner
FROM node:20-alpine AS runner

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy build artifacts and necessary runtime files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/drizzle.config.ts ./

# Expose port
EXPOSE 5000

# Environment defaults
ENV NODE_ENV=production
ENV PORT=5000

# Run migrations and start the server
# We use npx drizzle-kit push to sync schema on start (convenient for this setup)
CMD npx drizzle-kit push && npm start
