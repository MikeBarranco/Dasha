# Dasha

Plataforma de coordinacion de rescate animal en Puebla. Conecta a quien
reporta un animal en situacion de calle con voluntarios que rescatan,
veterinarias y refugios aliados que atienden, y patrocinadores que aportan
recursos. Proyecto desarrollado para el reto RescueNet de PolyWorks Mexico
en la competencia FEPRO 2026 (Categoria A).

## Stack

- Frontend: React + Vite + TypeScript + TailwindCSS (PWA instalable)
- Backend: Node.js + Express + TypeScript
- Base de datos: PostgreSQL + PostGIS
- ORM: Prisma
- Mapas: Mapbox GL JS
- Almacenamiento de imagenes: Cloudinary
- Tiempo real: Socket.io
- Contenedores: Docker y Docker Compose
- Pruebas: Vitest, Supertest, Playwright

## Estructura del repositorio

Monorepo con dos paquetes independientes:

```
dasha/
  backend/    API REST y tiempo real (Express + TypeScript)
  frontend/   Aplicacion web PWA (React + Vite)
  docs/       Documentacion tecnica y decisiones de arquitectura
```

## Requisitos

- Node.js 24 (ver `.nvmrc`)
- npm 11 o superior
- Docker Desktop (para la base de datos local en desarrollo)

## Puesta en marcha

El proyecto se construye de forma incremental. Cada paquete se instala y se
ejecuta por separado:

```
cd backend
npm install
npm run dev

cd frontend
npm install
npm run dev
```

Las variables de entorno se documentan en el archivo `.env.example` de cada
paquete. Nunca se deben subir archivos `.env` reales al repositorio.

### Base de datos local con Docker

Para levantar PostgreSQL con PostGIS en local (recomendado para desarrollo):

```
copia .env.example a .env
docker compose up -d db
```

La base queda disponible en `localhost:5432` (usuario `dasha_admin`, base
`dasha`).

Para construir y ejecutar todo el stack en contenedores, como en produccion:

```
docker compose up --build
```

- Frontend: http://localhost:8080
- Backend: http://localhost:3000
- Base de datos: localhost:5432

## Entornos y ramas

- `main`: produccion. Solo versiones validadas.
- `staging`: integracion y pruebas.
- `feature/*`, `fix/*`, `chore/*`: ramas de trabajo que parten de `staging`
  y se integran mediante Pull Request.

## Equipo

- Miguel Angel Barranco Ortega: desarrollo full stack
- Maria Isabel Ruiz Machorro: base de datos e infraestructura
- Sumayra Montserrat Rivera Rojas: diseno de interfaz (UI/UX)
- Monica Jazmin Tapia Zarate: documentacion y gestion del proyecto
