-- Estado del aporte a una necesidad: pending | confirmed | rejected.
-- Los NUEVOS aportes arrancan en 'pending' (esperan la confirmación del aliado).
ALTER TABLE "need_contributions" ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) NOT NULL DEFAULT 'pending';

-- Los aportes que YA existían se hicieron con el flujo viejo (ya sumados a lo
-- reunido de la necesidad), así que se marcan como 'confirmed' para no descontarlos.
-- Esto solo afecta a las filas presentes al momento de la migración; los aportes
-- creados después usan el DEFAULT 'pending'.
UPDATE "need_contributions" SET "status" = 'confirmed' WHERE "status" = 'pending';
