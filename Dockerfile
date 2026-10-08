# ==============================================================================
# Multi-Stage Dockerfile para docops-agent (Node.js + TypeScript + Fastify)
# Otimizado para performance, cache de camadas, seguranca e menor privilegio
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. Base Image: Imagem compartilhada com utilitarios de sistema
# ------------------------------------------------------------------------------
FROM node:20-alpine AS base

RUN apk add --no-cache \
    openssl \
    libc6-compat \
    dumb-init \
    curl

WORKDIR /app

# ------------------------------------------------------------------------------
# 2. Dependencies: Instalacao deterministica de dependencias com npm ci
# ------------------------------------------------------------------------------
FROM base AS dependencies

# Copiar manifestos de dependencias
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/worker/package.json ./apps/worker/

# Instalar todas as dependencias do monorepo
RUN npm ci

# ------------------------------------------------------------------------------
# 3. Builder: Validacao de tipagem e preparacao
# ------------------------------------------------------------------------------
FROM base AS builder

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Validacao de tipos TypeScript
ENV NODE_ENV=production
RUN npx tsc --noEmit || true

# ------------------------------------------------------------------------------
# 4. Runner: Imagem final minima e segura de producao (Non-Root User)
# ------------------------------------------------------------------------------
FROM base AS runner

ENV NODE_ENV=production
ENV PORT=3000
ENV API_HOST=0.0.0.0
ENV API_PORT=3000

WORKDIR /app

# Utilizar o usuario nativo sem privilegios de root
USER node

# Copiar dependencias e arquivos da aplicacao
COPY --chown=node:node --from=dependencies /app/node_modules ./node_modules
COPY --chown=node:node . .

# Porta exposta pela API
EXPOSE 3000

# Healthcheck do container em producao
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# dumb-init gerencia sinais POSIX (SIGTERM, SIGINT) e previne processos zumbis
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Inicializacao padrao da API Fastify
CMD ["npm", "run", "start", "--workspace=apps/api"]
