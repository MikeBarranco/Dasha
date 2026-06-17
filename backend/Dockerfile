# Etapa 1: Instalar TODAS las dependencias (producción y desarrollo)
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Etapa 2: Construir (Compilar TypeScript y generar Prisma)
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generar el cliente de Prisma
RUN npx prisma generate
# Compilar TypeScript
RUN npm run build

# Etapa 3: Runner (Imagen de producción final, ligera)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copiamos solo lo estrictamente necesario
COPY package.json package-lock.json ./
# Instalamos SOLO dependencias de producción para mantener la imagen pequeña
RUN npm ci --omit=dev

# Copiamos el cliente Prisma generado
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copiamos la carpeta Prisma (Necesaria para ejecutar migraciones en producción)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Copiamos la carpeta compilada
COPY --from=builder /app/dist ./dist

# Copiamos la carpeta de datos estáticos (GeoJSON)
COPY --from=builder /app/data ./data

# Comando para iniciar la aplicación
CMD ["node", "dist/index.js"]
