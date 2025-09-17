# Étape 1: Builder - Installe les dépendances et construit l'application
FROM node:20-slim AS builder
WORKDIR /app

# Copier les fichiers de manifeste de paquets
COPY package*.json ./

# Installer TOUTES les dépendances (y compris devDependencies pour le build)
RUN npm ci

# Copier le reste du code source
COPY . .

# Lancer le build de l'application Next.js
RUN NEXT_TELEMETRY_DISABLED=1 npm run build

# --- NOUVELLE ÉTAPE CRUCIALE ---
# Supprimer les dépendances de développement pour assainir node_modules
RUN npm prune --production

# Étape 2: Runner - Exécute l'application de production
FROM node:20-slim
WORKDIR /app

# Définir l'environnement de production
ENV NODE_ENV=production
ENV PORT=8080

# Copier les artefacts de build DEPUIS L'ÉTAPE BUILDER
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

EXPOSE 8080

# La commande pour démarrer l'application
CMD ["sh", "-c", "npx next start -p ${PORT:-8080} -H 0.0.0.0"]
