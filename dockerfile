# Étape 1: Utiliser une image Node.js officielle et légère.
# La version 18 est stable et recommandée.
FROM node:18-slim

# Définir le répertoire de travail à l'intérieur du conteneur.
WORKDIR /usr/src/app

# Copier les fichiers package.json et package-lock.json (s'il existe).
# Le "COPY" est optimisé pour utiliser le cache de Docker.
COPY package*.json ./

# Installer les dépendances de l'application.
RUN npm install

# Copier le reste du code de l'application dans le répertoire de travail.
COPY . .

# La commande qui sera exécutée lorsque le conteneur démarrera.
CMD [ "node", "poll.js" ]
