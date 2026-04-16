# ─── Stage 1: Dependencies ───
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ─── Stage 2: Build ───
FROM oven/bun:1 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client (if schema exists)
RUN if [ -f prisma/schema.prisma ]; then bunx prisma generate; fi

# Build Next.js standalone
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

# ─── Stage 3: Production ───
FROM oven/bun:1 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma schema if exists (for runtime)
RUN mkdir -p prisma
COPY --from=builder /app/prisma ./prisma/

# Set permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

CMD ["bun", "server.js"]
