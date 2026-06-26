# 0001 - Stack tecnologico y almacenamiento de imagenes

Estado: aceptada
Fecha: 2026-06

## Contexto

Dasha es una plataforma de coordinacion de rescate animal que debe cumplir los
requerimientos del reto RescueNet (reportes con foto y ubicacion, mapa
interactivo, roles, coordinacion de voluntarios y recursos, seguimiento de
casos). Restricciones del proyecto:

- Costo cero sostenible: el sistema no debe dejar de funcionar por agotar un
  credito o una prueba gratuita.
- Tecnologia web moderna, alineada a las recomendaciones del reto.
- Un equipo pequeno; conviene un stack productivo y con buen soporte.

## Decision

Stack principal:

- Frontend: React con Vite y TypeScript, como PWA instalable.
- Backend: Node.js con Express y TypeScript.
- Base de datos: PostgreSQL con la extension PostGIS para geolocalizacion.
- ORM: Prisma, con migraciones versionadas.
- Mapas: Mapbox GL JS.

Almacenamiento de imagenes: Cloudinary, en lugar de un bucket de objetos de
pago (por ejemplo DigitalOcean Spaces).

En la base de datos solo se guarda la URL y el identificador publico de cada
imagen, nunca el archivo binario. Las subidas se firman desde el backend para
no exponer credenciales en el cliente.

## Justificacion del almacenamiento

- La capa gratuita de Cloudinary es permanente dentro de su limite y no depende
  de un credito que expira, lo que respeta la restriccion de costo cero
  sostenible.
- Optimiza las imagenes de forma automatica (formato y calidad) y entrega por
  CDN, lo que mejora el rendimiento en redes moviles.
- Genera recortes y miniaturas a peticion, incluido el recorte circular para
  los marcadores del mapa, lo que evita codigo adicional de procesamiento.

## Consecuencias

- Se agrega una dependencia externa (Cloudinary) y la gestion de sus
  credenciales en variables de entorno por entorno.
- El backend debe firmar las subidas, lo que anade un endpoint dedicado.
- La base de datos se mantiene ligera al no almacenar binarios.

## Alternativas consideradas

- DigitalOcean Spaces: descartado como almacenamiento principal por su costo y
  porque dependeria de un credito con vencimiento.
- Almacenar imagenes en la base de datos: descartado por tamano y rendimiento.
