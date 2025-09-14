# --- Build stage ---
FROM node:20-slim AS builder
WORKDIR /app

# Installe les deps en cache-friendly
COPY package*.json ./

# Ajout de la logique de nettoyage pour forcer une réinstallation propre
RUN rm -rf node_modules package-lock.json
RUN npm ci

# Copie le reste et build
COPY . .
# (Facultatif mais conseillé) sortie standalone pour prod
# Assure-toi d'avoir:  experimental: { outputStandalone: true } ou output: 'standalone'
RUN npm run build

# --- Runtime stage ---
FROM node:20-slim
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Si tu utilises l'output "standalone"
# COPY --from=builder /app/.next/standalone ./
# COPY --from=builder /app/.next/static ./.next/static

# Sinon (classique) : copie le minimum nécessaire
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
# Ajout de la copie des node_modules depuis le builder pour plus de fiabilité
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json


EXPOSE 8080
# IMPORTANT : Next doit écouter $PORT et 0.0.0.0
CMD ["sh","-c","npx next start -p ${PORT:-8080} -H 0.0.0.0"]
