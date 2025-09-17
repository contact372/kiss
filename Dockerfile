# Étape 1: Builder - Construit l'application
FROM node:20-slim AS builder
WORKDIR /app

# Copier les fichiers de manifeste de paquets
COPY package*.json ./

# Installer les dépendances pour le build
RUN npm ci

# Copier le reste du code source
COPY . .

# Lancer le build de l'application Next.js
# NEXT_TELEMETRY_DISABLED=1 évite une alerte pendant le build
RUN NEXT_TELEMETRY_DISABLED=1 npm run build

# Étape 2: Runner - Exécute l'application
FROM node:20-slim
WORKDIR /app

# Définir l'environnement de production
ENV NODE_ENV=production
ENV PORT=8080

# Copier uniquement les fichiers nécessaires depuis l'étape de build
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/package*.json ./

# Installer UNIQUEMENT les dépendances de production
RUN npm install --omit=dev

EXPOSE 8080

# La commande pour démarrer l'application
# IMPORTANT : Next doit écouter sur 0.0.0.0 dans un conteneur
CMD ["sh", "-c", "npx next start -p ${PORT:-8080} -H 0.0.0.0"]
