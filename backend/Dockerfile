FROM node:20-alpine AS builder

WORKDIR /app

# Copy root configs and packages
COPY package*.json ./
COPY packages/ ./packages/
COPY backend/ ./backend/

# Install and build
RUN npm install
RUN npm run build --workspace=packages/types
RUN npm run prisma:generate --workspace=backend
RUN npm run build --workspace=backend

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY --from=builder /app/backend/package.json ./backend/package.json

EXPOSE 5000

CMD ["node", "backend/dist/server.js"]
