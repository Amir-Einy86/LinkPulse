FROM node:22-alpine
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/ ./
COPY frontend/ ../frontend/
ENV NODE_ENV=production
EXPOSE 5000
USER node
CMD ["node", "src/server.js"]
