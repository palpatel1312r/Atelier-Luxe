FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
EXPOSE 8000
CMD ["sh", "-c", "node src/migrate.js && node src/seed.js && node src/index.js"]
