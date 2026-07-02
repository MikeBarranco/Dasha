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
   commit id: "inicio"
   branch staging
   checkout staging
   commit id: "base"
   branch feat/mapa
   checkout feat/mapa
   commit id: "DSH-41"
   checkout staging
   merge feat/mapa
   branch feat/notificaciones-push
   checkout feat/notificaciones-push
   commit id: "DSH-28"
   checkout staging
   merge feat/notificaciones-push
   checkout main
   merge staging tag: "v0.6"
```

## Flujo de trabajo

1. Se crea una rama desde `staging` con el prefijo según el tipo de cambio
   (`feat/`, `fix/`, `chore/`, `docs/`).
2. Se trabaja y se prueba (`lint`, `typecheck`, `build` y revisión en el navegador).
3. Se abre un Pull Request hacia `staging`; se revisa y se integra.
4. Cuando `staging` está estable, se libera a `main` (producción).
