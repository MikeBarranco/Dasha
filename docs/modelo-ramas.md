# Modelo de ramas (Git)

Estrategia de ramas que sigue el equipo de Dasha para trabajar ordenado y sin
romper producción.

- **`main`**: producción. Solo recibe merges desde `staging`. Nadie trabaja aquí directo.
- **`staging`**: integración. Todo se prueba aquí antes de liberar.
- **`feat/` · `fix/` · `chore/`**: una rama por tarea. Sale de `staging` y regresa por Pull Request.

Cada commit sigue Conventional Commits y lleva su código de JIRA para
trazabilidad (por ejemplo `feat(notificaciones): web push (DSH-28)`).

```mermaid
gitGraph
   commit id: "Evaluacion 1"
   branch staging
   checkout staging
   commit id: "integracion continua"
   branch feat/ruta-uber
   checkout feat/ruta-uber
   commit id: "DSH-25"
   checkout staging
   merge feat/ruta-uber
   branch feat/modo-activo-voluntario
   checkout feat/modo-activo-voluntario
   commit id: "DSH-23"
   checkout staging
   merge feat/modo-activo-voluntario
   branch fix/estado-reportes-mapa
   checkout fix/estado-reportes-mapa
   commit id: "DSH-85"
   checkout staging
   merge fix/estado-reportes-mapa
   checkout main
   merge staging tag: "Evaluacion 2"
```

## El modelo en números

Entre la primera y la segunda evaluación (22 de junio al 20 de julio):

- **130 pull requests** integrados a `staging`.
- **111 ramas** distintas, una por objetivo.
- Ninguna escritura directa sobre `main`: producción solo recibe lo que ya pasó
  por integración.

Cada rama es pequeña a propósito: entre más chico el cambio, más fácil de
revisar y más rápido de corregir si algo sale mal.

## Flujo de trabajo

1. Se crea una rama desde `staging` con el prefijo según el tipo de cambio
   (`feat/`, `fix/`, `chore/`, `docs/`).
2. Se trabaja y se prueba (`lint`, `typecheck`, `build` y revisión en el navegador).
3. Se abre un Pull Request hacia `staging`. Al abrirlo, **GitHub Actions (CI)**
   corre automáticamente `lint` y `build` de frontend y backend; si algo falla,
   no se integra.
4. Se revisa el Pull Request y se integra a `staging`.
5. Cuando `staging` está estable, se libera a `main` (producción).

## Despliegue (CD)

- **Frontend:** desplegado en **Vercel**, que publica automáticamente en cada
  integración. La rama `staging` publica en `staging.dashamx.me` (pruebas); la
  rama `main` publicará en `dashamx.me` (producción), pendiente hasta pulir para
  la entrega final.
- **Backend:** desplegado en un **Droplet de DigitalOcean** (por SSH), a cargo
  del área de backend.
