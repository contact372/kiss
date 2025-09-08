# Étape 1: Utiliser une image Node.js officielle comme base.
# On choisit la version 20, qui est une version stable et récente.
FROM node:20-slim

# Définir le répertoire de travail à l'intérieur du conteneur.
# C'est ici que notre application va "vivre".
WORKDIR /app

# Copier les fichiers de dépendances en premier.
# Cela permet à Docker de mettre en cache cette étape et d'accélérer les builds futurs
# si les dépendances n'ont pas changé.
COPY package*.json ./

# Installer les dépendances du projet.
RUN npm install

# Copier tout le reste du code de l'application.
COPY . .

# Exposer le port que Next.js utilise par défaut.
# Cloud Run saura qu'il doit écouter sur ce port.
EXPOSE 3000

# Construire l'application Next.js pour la production.
RUN npm run build

# La commande pour démarrer l'application quand le conteneur se lance.
CMD ["npm", "start"]
