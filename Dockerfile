FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl

COPY backend/package*.json ./backend/
RUN cd backend && npm ci
COPY backend/src ./backend/src/
COPY backend/tsconfig.json ./backend/
RUN cd backend && npm run build
RUN cd backend && npm prune --omit=dev

COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci
COPY frontend ./frontend/
RUN cd frontend && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000
RUN apk add --no-cache openssl

COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/node_modules ./backend/node_modules
COPY --from=build /app/backend/package.json ./backend/
COPY --from=build /app/frontend/dist ./frontend/dist
COPY --from=build /app/frontend/public ./frontend/public
RUN mkdir -p /app/backend/uploads && chown -R node:node /app/backend/uploads

USER node

EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1
CMD ["node", "backend/dist/index.js"]
