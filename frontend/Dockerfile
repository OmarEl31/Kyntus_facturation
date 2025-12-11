# Étape 1 — Build de l’application
FROM node:20-alpine AS build

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le reste du code
COPY . .

# Build de Next.js (optionnel si tu veux du mode prod)
RUN npm run build

# Étape 2 — Lancer en mode développement
FROM node:20-alpine
WORKDIR /app

COPY --from=build /app ./

EXPOSE 3000

CMD ["npm", "run", "dev"]
