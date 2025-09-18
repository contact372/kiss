# Étape 1: Builder - Construit l'application avec des dépendances propres
FROM node:20-slim AS builder
WORKDIR /app

# Mettre à jour npm pour la stabilité
RUN npm install -g npm@latest

# Copier le manifeste des paquets ET le lockfile pour des builds reproductibles
COPY package*.json ./

# --- LA PURGE NUCLÉAIRE ---
# En ne copiant PAS package-lock.json et en utilisant "npm install", 
# nous forçons npm à résoudre l'arbre des dépendances à partir de zéro,
# ce qui élimine les conflits et les corruptions.
RUN npm install

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

# Créer un utilisateur non-root pour la sécurité
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copier les fichiers de l'application depuis l'étape de build
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Changer le propriétaire des fichiers pour l'utilisateur non-root
USER nextjs

# Exposer le port
EXPOSE 8080

# Démarrer l'application
CMD ["npm", "start"]
