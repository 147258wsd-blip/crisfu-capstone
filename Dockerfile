# One container runs both halves of the Capstone: the React build is
# compiled in stage 1 and served by Express in stage 2, so the deployment
# exposes a single URL (the site at /, the API at /api) and CORS never
# enters the picture.
#
# Built from the REPOSITORY ROOT (context = "."), which is what Back4App
# Containers and most one-click container hosts default to.

# ---------- stage 1: build the frontend ----------
FROM node:20-alpine AS web
WORKDIR /web

COPY cris-react/package*.json ./
RUN npm ci --no-audit --no-fund

COPY cris-react/ ./

# relative URL => same origin as the API it ships with
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_USE_MOCK=false
RUN npm run build

# ---------- stage 2: the API + the built site ----------
FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app

COPY server/package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY server/ ./
COPY --from=web /web/dist ./public

ENV SERVE_STATIC=public
ENV PORT=3000
EXPOSE 3000

# node:20-alpine ships an unprivileged `node` user — never run as root
USER node

CMD ["node", "server.js"]
