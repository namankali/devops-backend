# Builder Stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build


# Production Stage
FROM node:20-alpine

WORKDIR /app

# copy only needed files
COPY package*.json ./
RUN npm ci --omit=dev

# copy built code
COPY --from=builder /app/dist ./dist

EXPOSE 3001

CMD ["node", "dist/liver/bin.js"]