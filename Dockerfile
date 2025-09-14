FROM node:20-slim AS builder
WORKDIR /app

# Installe les deps en cache-friendly
COPY package*.json ./
RUN npm ci

# Crée un dossier public vide pour éviter les erreurs de copie s'il n'existe pas.
RUN mkdir public

# Copie le reste et build
COPY . .
RUN npm run build

# --- Runtime stage ---
FROM node:20-slim
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Copie le minimum nécessaire depuis l'étape de construction
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

EXPOSE 8080
# IMPORTANT : Next doit écouter $PORT et 0.0.0.0
CMD ["sh","-c","npx next start -p ${PORT:-8080} -H 0.0.0.0"]

CMD ["sh","-c","npx next start -p ${PORT:-8080} -H 0.0.0.0"]
# IMPORTANT : Next doit écouter $PORT et 0.0.0.0
CMD ["sh","-c","npx next start -p ${PORT:-8080} -H 0.0.0.0"]
