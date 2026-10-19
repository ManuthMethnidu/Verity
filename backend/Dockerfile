FROM node:22-alpine

WORKDIR /app

# Copy root package files for monorepo workspace resolution
COPY package.json ./
COPY backend/package.json ./backend/
COPY backend/prisma ./backend/prisma/

# Install dependencies
RUN npm install --workspace=backend

# Copy backend source
COPY backend/ ./backend/

WORKDIR /app/backend

# Generate Prisma client
RUN npx prisma generate

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

CMD ["npm", "start"]
