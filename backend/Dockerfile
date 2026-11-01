FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY mobile/package.json mobile/package.json
COPY backend/package.json backend/package.json

RUN npm ci --workspace @fluora/backend --include-workspace-root=false

COPY backend backend

RUN npm run prisma:generate --workspace @fluora/backend

EXPOSE 4000

CMD ["sh", "-c", "npm run db:deploy --workspace @fluora/backend && npm run dev --workspace @fluora/backend"]
