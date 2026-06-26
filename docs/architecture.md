# Arquitectura de Dasha

Vision general de la arquitectura del sistema. Es un documento vivo que se
actualiza conforme avanza el desarrollo.

## Componentes

- Frontend (PWA): aplicacion React servida como sitio estatico. Instalable en
  el celular, con notificaciones push y soporte offline basico.
- Backend (API): servicio Node.js con Express que expone una API REST y maneja
  conexiones en tiempo real con Socket.io.
- Base de datos: PostgreSQL con la extension PostGIS para consultas
  geograficas (busqueda por radio, contencion en colonias, mapas de calor).
- Almacenamiento de imagenes: Cloudinary. La base de datos guarda la URL y el
  identificador publico de cada imagen, no el archivo binario.

## Diagrama de alto nivel

```
Usuario (PWA)
  |
  |  HTTPS (REST) y WebSocket
  v
API (Express + Socket.io)
  |
  +--> PostgreSQL + PostGIS   (datos y consultas geograficas)
  +--> Cloudinary             (imagenes)
  +--> Web Push (VAPID)       (notificaciones)
```

## Flujo de un reporte

1. El usuario toma una foto desde la camara; la imagen se comprime en el
   cliente.
2. Un modelo de vision en el navegador valida que la foto contenga un perro o
   un gato.
3. La imagen se sube a Cloudinary mediante una peticion firmada por el backend.
4. El cliente envia al API la ubicacion GPS, la descripcion y la URL de la foto.
5. El backend consulta con PostGIS si existen reportes activos cercanos para
   evitar duplicados.
6. Se crea el reporte y se registra la accion en el historial del caso.
7. Se notifica a los voluntarios activos cercanos.

## Entornos

- Produccion: rama `main`. Entorno estable para demostraciones.
- Staging: rama `staging`. Entorno de pruebas e integracion.

Cada entorno usa su propia base de datos y su propio conjunto de variables de
entorno.

## Principios

- Separacion clara entre frontend, API, datos y almacenamiento de medios.
- API sin estado, autenticacion con tokens.
- Migraciones de base de datos versionadas con Prisma.
- Entornos reproducibles con Docker.
- Secretos siempre en variables de entorno, nunca en el repositorio.
