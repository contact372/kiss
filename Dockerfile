
# 1. Étape de dépendances
FROM node:20-slim AS deps
WORKDIR /app

# Installez les paquets dont Next.js a besoin pour le build
# https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md#non-root-user
RUN apt-get update && apt-get install -y --no-install-recommends openssl

# Copiez package.json et le lockfile
COPY package.json package-lock.json* ./

# Installez les dépendances
RUN npm ci

# 2. Étape de build
FROM node:20-slim AS builder
WORKDIR /app

# Copiez les dépendances de l'étape précédente
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Générez le build de production optimisé avec standalone output
RUN npm run build

# 3. Étape de production finale
FROM node:20-slim AS runner
WORKDIR /app

# Créez un utilisateur non-root pour la sécurité
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiez les fichiers du build standalone
# Automatiquement copiés dans les bons dossiers grâce à "output: 'standalone'"
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# Le port par défaut est 3000, mais Cloud Run l'injectera via la variable $PORT
ENV PORT 3000

# Exposez le port
EXPOSE 3000

# La commande pour démarrer le serveur de production
CMD ["node", "server.js"]
