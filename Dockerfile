FROM node:20-alpine AS frontend-build

WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:20-alpine AS app

ENV NODE_ENV=production
WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/src ./src
RUN mkdir -p uploads/equipment uploads/transactions uploads/profiles

COPY --from=frontend-build /build/frontend/dist /app/frontend/dist

EXPOSE 5000
CMD ["npm", "start"]
