-- Unidad de la necesidad (kg, bolsas, litros, pesos, etc.). Opcional; los
-- registros existentes arrancan en NULL. La cantidad se guarda en target_amount.
ALTER TABLE "needs" ADD COLUMN IF NOT EXISTS "unit" VARCHAR(20);
