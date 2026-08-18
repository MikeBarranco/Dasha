-- Siglas de la organizacion (ej. "CAETO"), ademas del nombre completo.
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "acronym" VARCHAR(20);

-- Puesto/titulo visible del miembro del equipo (ej. Entrenador, Psicologa),
-- ademas de role_in_org (que sigue mandando en permisos). Lista cerrada validada
-- en el backend/frontend; la columna es texto libre solo a nivel BD.
ALTER TABLE "organization_employees" ADD COLUMN IF NOT EXISTS "position_title" VARCHAR(60);
