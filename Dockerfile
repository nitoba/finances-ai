# Multi-stage build para otimização máxima
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# Stage 1: Dependencies installation
FROM base AS deps
# Copia apenas os arquivos necessários para instalação das dependências
COPY package.json pnpm-lock.yaml ./
# Instala dependências de produção e desenvolvimento
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Stage 2: Build da aplicação
FROM base AS builder
COPY package.json pnpm-lock.yaml ./
# Copia as dependências já instaladas do stage anterior
COPY --from=deps /app/node_modules ./node_modules
# Copia código fonte
COPY . .
# Build da aplicação TypeScript
RUN pnpm run build

# Stage 3: Production dependencies
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml ./
# Instala apenas dependências de produção
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

# Stage 4: Runtime final
FROM node:22-alpine AS runtime

# Define argumentos que podem ser passados durante o build
ARG NODE_ENV=production
ARG PORT=3333

# Define variáveis de ambiente
ENV NODE_ENV=${NODE_ENV}
ENV PORT=${PORT}

# Instala dumb-init para proper signal handling
RUN apk add --no-cache dumb-init

# Cria usuário não-root para segurança
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

WORKDIR /app

# Copia package.json para ter as informações necessárias
COPY --chown=nodejs:nodejs package.json ./

# Copia dependências de produção
COPY --from=prod-deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copia código compilado
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Cria diretórios necessários com permissões corretas
RUN mkdir -p logs && chown -R nodejs:nodejs logs

# Muda para usuário não-root
USER nodejs

# Expõe porta do servidor web
EXPOSE 3333

# Configurações de saúde
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3333/health').then(() => process.exit(0)).catch(() => process.exit(1))"

# Usa dumb-init para proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Comando padrão
CMD ["node", "dist/app.js"]