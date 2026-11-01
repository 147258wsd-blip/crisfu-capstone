# Cris Fu — Capstone API
# Works unchanged on Railway, Zeabur, Koyeb, Northflank, Back4App or any
# container host. The platform injects PORT; 5000 is only the local default.

FROM node:20-alpine

ENV NODE_ENV=production
WORKDIR /app

# dependencies first so a code-only change reuses this layer
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .

ENV PORT=5000
EXPOSE 5000

# node:20-alpine ships an unprivileged `node` user — never run as root
USER node

CMD ["node", "server.js"]
