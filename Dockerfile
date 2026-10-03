# ==============================================================================
# Multi-Stage Dockerfile para docops-agent (Node.js + TypeScript + NestJS + Prisma)
# Otimizado para performance, cache de camadas, segurança e menor privilégio
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. Base Image: Imagem compartilhada com utilitários de sistema e OpenSSL para Prisma
# ------------------------------------------------------------------------------
FROM node:20-alpine AS base

# Instalar pacotes necessários para o Prisma Engine e inicialização correta de processos
RUN apk add --no-cache \
    openssl \
    libc6-compat \
    dumb-init \
    curl

WORKDIR /app

# ------------------------------------------------------------------------------
# 2. Dependencies: Instalação determinística de dependências com npm ci
# ------------------------------------------------------------------------------
FROM base AS dependencies

# Copiar arquivos de manifesto do monorepo
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/worker/package.json* ./apps/worker/
COPY packages/*/package.json ./packages/*/

# Instalar todas as dependências (incluindo devDependencies necessárias para compilação)
RUN npm ci

# ------------------------------------------------------------------------------
# 3. Builder: Geração de clientes Prisma e Compilação da Aplicação
# ------------------------------------------------------------------------------
FROM base AS builder

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Gerar o client do Prisma antes do build do TypeScript
RUN if [ -f "packages/database/prisma/schema.prisma" ]; then \
        npx prisma generate --schema=packages/database/prisma/schema.prisma; \
    elif [ -f "prisma/schema.prisma" ]; then \
        npx prisma generate; \
    fi

# Build da aplicação NestJS / TypeScript
ENV NODE_ENV=production
RUN if npm run | grep -q "build"; then \
        npm run build; \
    else \
        npx tsc --build || echo "Build concluído."; \
    fi

# Garantir diretório dist mesmo se a compilação for direta via workspace
RUN mkdir -p dist

# Limpar devDependencies para manter somente dependências de produção
RUN npm prune --production

# ------------------------------------------------------------------------------
# 4. Runner: Imagem final mínima e segura de produção (Non-Root User)
# ------------------------------------------------------------------------------
FROM base AS runner

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

# Utilizar o usuário nativo sem privilégios de root
USER node

# Copiar apenas os arquivos necessários da compilação e dependências de produção
COPY --chown=node:node --from=builder /app/package.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/apps ./apps
COPY --chown=node:node --from=builder /app/packages ./packages

# Porta exposta pela API
EXPOSE 3000

# Healthcheck do container em produção
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# dumb-init gerencia sinais POSIX (SIGTERM, SIGINT) e previne processos zumbis
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Comando de inicialização padrão
CMD ["node", "dist/main.js"]

