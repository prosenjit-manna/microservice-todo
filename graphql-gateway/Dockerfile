# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

RUN mkdir -p /app/logs && chown nestjs:nodejs /app/logs

USER nestjs

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["node", "dist/main"]
