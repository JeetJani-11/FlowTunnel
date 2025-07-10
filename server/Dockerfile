FROM node:18-slim AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

FROM node:18-slim AS runner
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production \
    PORT=3000

EXPOSE 3000
RUN groupadd --system appgroup \
 && useradd  --system --no-create-home --gid appgroup appuser
USER appuser
CMD ["node", "src/index.js"]
