-- Enlaces de redes sociales del aliado (Facebook e Instagram). Ambos opcionales;
-- no afectan registros existentes (arrancan en NULL).
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "facebookUrl" VARCHAR(255);
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "instagramUrl" VARCHAR(255);
