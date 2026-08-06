-- AlterTable
ALTER TABLE "animal_profiles" ADD COLUMN IF NOT EXISTS "is_vaccinated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "animal_profiles" ADD COLUMN IF NOT EXISTS "is_dewormed" BOOLEAN NOT NULL DEFAULT false;
