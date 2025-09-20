# Étape 1: Builder - Construit l'application avec des dépendances propres
FROM node:20-slim AS builder
WORKDIR /app

# Mettre à jour npm pour la stabilité
RUN npm install -g npm@latest

# Copier le manifeste des paquets ET le fichier de verrouillage
COPY package.json package-lock.json ./

# --- Installation Fiable ---
# Utiliser "npm ci" qui est plus rapide, plus strict et plus fiable pour les builds
# en se basant sur package-lock.json.
RUN npm ci

# Copier le reste du code source
COPY . .

# Construire l'application Next.js
RUN NEXT_TELEMETRY_DISABLED=1 npm run build

# Supprimer les dépendances de développement pour l'image finale
RUN npm prune --production

# Étape 2: Runner - Exécute l'application de production
FROM node:20-slim
WORKDIR /app

# Définir l'environnement de production
ENV NODE_ENV=production
ENV PORT=8080

# Copier uniquement les artefacts de build nécessaires depuis le builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 8080

# Démarrer le serveur Next.js
CMD ["sh", "-c", "npx next start -p ${PORT:-8080} -H 0.0.0.0"]
