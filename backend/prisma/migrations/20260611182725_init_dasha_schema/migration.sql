-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('citizen', 'volunteer', 'ally_admin', 'ally_staff', 'admin');

-- CreateEnum
CREATE TYPE "VolunteerStatus" AS ENUM ('pending', 'approved', 'rejected', 'inactive');

-- CreateEnum
CREATE TYPE "AuthProviderType" AS ENUM ('google', 'facebook');

-- CreateEnum
CREATE TYPE "Species" AS ENUM ('dog', 'cat');

-- CreateEnum
CREATE TYPE "Size" AS ENUM ('small', 'medium', 'large');

-- CreateEnum
CREATE TYPE "Condition" AS ENUM ('injured', 'malnourished', 'sick', 'stable', 'lost', 'aggressive');

-- CreateEnum
CREATE TYPE "Urgency" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('active', 'in_progress', 'rescued', 'in_treatment', 'recovering', 'looking_for_foster', 'in_foster', 'looking_for_adoption', 'adopted', 'closed', 'duplicate', 'not_found', 'deceased');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('created', 'sighting_added', 'accepted', 'on_the_way', 'sheltered', 'sent_to_vet', 'record_created', 'status_changed', 'resource_offered', 'resource_delivered', 'donation_made', 'donation_approved', 'foster_assigned', 'adopted', 'flagged', 'note');

-- CreateEnum
CREATE TYPE "RescueStatus" AS ENUM ('accepted', 'on_the_way', 'arrived', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "OrgType" AS ENUM ('veterinary', 'shelter', 'ngo', 'educational');

-- CreateEnum
CREATE TYPE "RoleInOrg" AS ENUM ('admin', 'veterinarian', 'assistant');

-- CreateEnum
CREATE TYPE "AnimalGender" AS ENUM ('male', 'female', 'unknown');

-- CreateEnum
CREATE TYPE "AnimalStatus" AS ENUM ('in_treatment', 'recovering', 'looking_for_foster', 'in_foster', 'looking_for_adoption', 'adopted', 'deceased');

-- CreateEnum
CREATE TYPE "RecordType" AS ENUM ('checkup', 'surgery', 'vaccination', 'medication', 'lab', 'imaging', 'other');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('money', 'food', 'transport', 'foster', 'medical_service', 'supplies', 'other');

-- CreateEnum
CREATE TYPE "ResourceStatus" AS ENUM ('offered', 'accepted', 'delivered', 'cancelled');

-- CreateEnum
CREATE TYPE "DonationStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('sterilization', 'vaccination', 'grooming', 'donation', 'adoption', 'talk', 'other');

-- CreateEnum
CREATE TYPE "AchievementCategory" AS ENUM ('reporter', 'volunteer', 'donor', 'foster', 'social', 'special');

-- CreateEnum
CREATE TYPE "RequirementType" AS ENUM ('reports_count', 'rescues_count', 'donations_count', 'foster_count', 'resources_count', 'forum_count', 'points', 'special');

-- CreateEnum
CREATE TYPE "AchievementTier" AS ENUM ('bronze', 'silver', 'gold', 'special');

-- CreateEnum
CREATE TYPE "ReputationReason" AS ENUM ('report', 'report_validated', 'rescue', 'foster', 'donation', 'forum_helpful', 'penalty', 'other');

-- CreateEnum
CREATE TYPE "FosterStatus" AS ENUM ('proposed', 'active', 'ended');

-- CreateEnum
CREATE TYPE "AdoptionStatus" AS ENUM ('pending', 'approved', 'rejected', 'withdrawn');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('suggested', 'confirmed', 'dismissed');

-- CreateEnum
CREATE TYPE "FlagReason" AS ENUM ('spam', 'fake', 'inappropriate', 'duplicate', 'dangerous', 'other');

-- CreateEnum
CREATE TYPE "FlagStatus" AS ENUM ('open', 'reviewed', 'dismissed', 'actioned');

-- CreateEnum
CREATE TYPE "ForumCategory" AS ENUM ('health', 'nutrition', 'training', 'legal', 'general');

-- CreateEnum
CREATE TYPE "NotifType" AS ENUM ('rescue_alert', 'status_change', 'achievement', 'event_reminder', 'closure', 'resource', 'lost_match', 'system');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(20),
    "password_hash" VARCHAR(255),
    "avatar_url" TEXT,
    "avatar_public_id" VARCHAR(255),
    "role" "Role" NOT NULL DEFAULT 'citizen',
    "volunteer_status" "VolunteerStatus",
    "ine_front_url" TEXT,
    "ine_back_url" TEXT,
    "selfie_url" TEXT,
    "is_foster" BOOLEAN NOT NULL DEFAULT false,
    "foster_capacity" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_available" BOOLEAN NOT NULL DEFAULT false,
    "search_radius_km" INTEGER NOT NULL DEFAULT 5,
    "last_location" geography(Point, 4326),
    "last_location_at" TIMESTAMPTZ,
    "level" INTEGER NOT NULL DEFAULT 1,
    "experience_points" INTEGER NOT NULL DEFAULT 0,
    "reputation_score" INTEGER NOT NULL DEFAULT 0,
    "notif_prefs" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_providers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" "AuthProviderType" NOT NULL,
    "provider_id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_avatars" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "avatar_url" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_avatars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "species" "Species" NOT NULL,
    "primary_color" VARCHAR(50) NOT NULL,
    "secondary_color" VARCHAR(50),
    "size" "Size" NOT NULL,
    "condition" "Condition" NOT NULL,
    "urgency" "Urgency" NOT NULL DEFAULT 'medium',
    "is_moving" BOOLEAN,
    "is_aggressive" BOOLEAN,
    "has_collar" BOOLEAN,
    "description" TEXT NOT NULL,
    "location" geography(Point, 4326) NOT NULL,
    "address" VARCHAR(255),
    "colony_id" VARCHAR(50),
    "ai_validated" BOOLEAN NOT NULL DEFAULT false,
    "ai_confidence" DECIMAL(5,2),
    "status" "ReportStatus" NOT NULL DEFAULT 'active',
    "volunteer_id" UUID,
    "destination_org_id" UUID,
    "is_duplicate_of" UUID,
    "seen_count" INTEGER NOT NULL DEFAULT 1,
    "last_seen_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMPTZ,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_photos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "report_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "public_id" VARCHAR(255) NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "uploaded_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_status_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "report_id" UUID NOT NULL,
    "from_status" "ReportStatus",
    "to_status" "ReportStatus" NOT NULL,
    "changed_by" UUID NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_actions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "report_id" UUID,
    "animal_id" UUID,
    "actor_id" UUID,
    "action_type" "ActionType" NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rescue_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "report_id" UUID NOT NULL,
    "volunteer_id" UUID NOT NULL,
    "status" "RescueStatus" NOT NULL DEFAULT 'accepted',
    "accepted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eta_minutes" INTEGER,
    "start_location" geography(Point, 4326),
    "completed_at" TIMESTAMPTZ,
    "cancelled_reason" TEXT,

    CONSTRAINT "rescue_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "logo_url" TEXT,
    "logo_public_id" VARCHAR(255),
    "address" VARCHAR(255),
    "phone" VARCHAR(20),
    "whatsapp" VARCHAR(20),
    "location" geography(Point, 4326),
    "website" VARCHAR(255),
    "schedule" JSONB,
    "org_type" "OrgType" NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "bank_name" VARCHAR(100),
    "clabe" VARCHAR(18),
    "holder_name" VARCHAR(200),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_employees" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_in_org" "RoleInOrg" NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "invited_email" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "animal_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "report_id" UUID NOT NULL,
    "organization_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "species" "Species" NOT NULL,
    "breed" VARCHAR(100),
    "age_estimation" VARCHAR(50),
    "weight_kg" DECIMAL(5,2),
    "color" VARCHAR(100),
    "gender" "AnimalGender",
    "is_neutered" BOOLEAN NOT NULL DEFAULT false,
    "microchip_id" VARCHAR(50),
    "story" TEXT,
    "status" "AnimalStatus" NOT NULL,
    "diagnosis" TEXT,
    "treatment" TEXT,
    "total_cost_needed" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_raised" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "current_foster_id" UUID,
    "adopted_by_user_id" UUID,
    "adopted_at" TIMESTAMPTZ,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "animal_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "animal_photos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "animal_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "public_id" VARCHAR(255) NOT NULL,
    "caption" VARCHAR(200),
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "animal_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "animal_id" UUID NOT NULL,
    "veterinarian_id" UUID NOT NULL,
    "record_type" "RecordType" NOT NULL,
    "description" TEXT NOT NULL,
    "diagnosis" TEXT,
    "prescription" TEXT,
    "cost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "photo_urls" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medical_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaccinations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "animal_id" UUID NOT NULL,
    "vaccine_name" VARCHAR(100) NOT NULL,
    "applied_date" DATE NOT NULL,
    "next_due_date" DATE,
    "veterinarian_id" UUID NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vaccinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider_id" UUID NOT NULL,
    "organization_id" UUID,
    "report_id" UUID,
    "animal_id" UUID,
    "resource_type" "ResourceType" NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "quantity" VARCHAR(100),
    "estimated_value" DECIMAL(10,2),
    "status" "ResourceStatus" NOT NULL DEFAULT 'offered',
    "accepted_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "animal_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'MXN',
    "status" "DonationStatus" NOT NULL DEFAULT 'pending',
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ,
    "reject_reason" TEXT,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "donations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donation_proofs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "donation_id" UUID NOT NULL,
    "proof_url" TEXT NOT NULL,
    "public_id" VARCHAR(255) NOT NULL,
    "amount_declared" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "donation_proofs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "category" "EventCategory" NOT NULL,
    "event_date" TIMESTAMPTZ NOT NULL,
    "end_date" TIMESTAMPTZ,
    "location" geography(Point, 4326),
    "address" VARCHAR(255) NOT NULL,
    "image_url" TEXT,
    "image_public_id" VARCHAR(255),
    "max_participants" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_reminders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "reminded_24h" BOOLEAN NOT NULL DEFAULT false,
    "reminded_1h" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "icon_url" TEXT NOT NULL,
    "category" "AchievementCategory" NOT NULL,
    "requirement_type" "RequirementType" NOT NULL,
    "requirement_value" INTEGER NOT NULL,
    "tier" "AchievementTier" NOT NULL DEFAULT 'bronze',
    "points_reward" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_achievements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "achievement_id" UUID NOT NULL,
    "earned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shared_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reputation_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" "ReputationReason" NOT NULL,
    "reference_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reputation_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "foster_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "animal_id" UUID NOT NULL,
    "foster_id" UUID NOT NULL,
    "status" "FosterStatus" NOT NULL DEFAULT 'active',
    "start_date" DATE,
    "end_date" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "foster_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adoption_applications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "animal_id" UUID NOT NULL,
    "applicant_id" UUID NOT NULL,
    "message" TEXT,
    "status" "AdoptionStatus" NOT NULL DEFAULT 'pending',
    "reviewed_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adoption_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lost_pets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "report_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "pet_name" VARCHAR(100),
    "distinctive_marks" TEXT,
    "last_seen_location" geography(Point, 4326) NOT NULL,
    "last_seen_at" TIMESTAMPTZ NOT NULL,
    "search_radius_km" INTEGER NOT NULL DEFAULT 3,
    "reward" DECIMAL(10,2),
    "contact_whatsapp" VARCHAR(20),
    "is_found" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lost_pets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lost_pet_matches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lost_pet_id" UUID NOT NULL,
    "matched_report_id" UUID NOT NULL,
    "score" DECIMAL(5,2),
    "status" "MatchStatus" NOT NULL DEFAULT 'suggested',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lost_pet_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_flags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "report_id" UUID NOT NULL,
    "flagged_by" UUID NOT NULL,
    "reason" "FlagReason" NOT NULL,
    "notes" TEXT,
    "status" "FlagStatus" NOT NULL DEFAULT 'open',
    "reviewed_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_posts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT NOT NULL,
    "category" "ForumCategory" NOT NULL,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_replies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "post_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "is_verified_answer" BOOLEAN NOT NULL DEFAULT false,
    "is_best_answer" BOOLEAN NOT NULL DEFAULT false,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_votes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "post_id" UUID,
    "reply_id" UUID,
    "value" SMALLINT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "device" VARCHAR(80),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "type" "NotifType" NOT NULL,
    "reference_id" UUID,
    "reference_type" VARCHAR(50),
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "sent_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "colonies" (
    "id" VARCHAR(50) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "city" VARCHAR(100) NOT NULL DEFAULT 'Puebla',
    "municipality" VARCHAR(100) NOT NULL DEFAULT 'Puebla',
    "postal_code" VARCHAR(10),
    "geometry" geography(Polygon, 4326) NOT NULL,
    "active_reports_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "colonies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discount_codes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "discount_percentage" DECIMAL(5,2) NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "valid_until" TIMESTAMPTZ,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "max_uses" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discount_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "impact_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "snapshot_date" DATE NOT NULL,
    "total_reports" INTEGER NOT NULL DEFAULT 0,
    "total_rescues" INTEGER NOT NULL DEFAULT 0,
    "total_adoptions" INTEGER NOT NULL DEFAULT 0,
    "total_donations_mxn" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "active_volunteers" INTEGER NOT NULL DEFAULT 0,
    "avg_rescue_minutes" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "impact_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "admin_id" UUID NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "target_type" VARCHAR(50),
    "target_id" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "auth_providers_provider_provider_id_key" ON "auth_providers"("provider", "provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_employees_organization_id_user_id_key" ON "organization_employees"("organization_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "animal_profiles_report_id_key" ON "animal_profiles"("report_id");

-- CreateIndex
CREATE UNIQUE INDEX "donation_proofs_donation_id_key" ON "donation_proofs"("donation_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_reminders_event_id_user_id_key" ON "event_reminders"("event_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "achievements_code_key" ON "achievements"("code");

-- CreateIndex
CREATE UNIQUE INDEX "user_achievements_user_id_achievement_id_key" ON "user_achievements"("user_id", "achievement_id");

-- CreateIndex
CREATE UNIQUE INDEX "lost_pets_report_id_key" ON "lost_pets"("report_id");

-- CreateIndex
CREATE UNIQUE INDEX "forum_votes_user_id_post_id_key" ON "forum_votes"("user_id", "post_id");

-- CreateIndex
CREATE UNIQUE INDEX "forum_votes_user_id_reply_id_key" ON "forum_votes"("user_id", "reply_id");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE UNIQUE INDEX "discount_codes_code_key" ON "discount_codes"("code");

-- AddForeignKey
ALTER TABLE "auth_providers" ADD CONSTRAINT "auth_providers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_avatars" ADD CONSTRAINT "user_avatars_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_volunteer_id_fkey" FOREIGN KEY ("volunteer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_destination_org_id_fkey" FOREIGN KEY ("destination_org_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_is_duplicate_of_fkey" FOREIGN KEY ("is_duplicate_of") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_colony_id_fkey" FOREIGN KEY ("colony_id") REFERENCES "colonies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_photos" ADD CONSTRAINT "report_photos_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_photos" ADD CONSTRAINT "report_photos_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_status_history" ADD CONSTRAINT "report_status_history_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_status_history" ADD CONSTRAINT "report_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_actions" ADD CONSTRAINT "case_actions_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_actions" ADD CONSTRAINT "case_actions_animal_id_fkey" FOREIGN KEY ("animal_id") REFERENCES "animal_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_actions" ADD CONSTRAINT "case_actions_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rescue_assignments" ADD CONSTRAINT "rescue_assignments_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rescue_assignments" ADD CONSTRAINT "rescue_assignments_volunteer_id_fkey" FOREIGN KEY ("volunteer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_employees" ADD CONSTRAINT "organization_employees_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_employees" ADD CONSTRAINT "organization_employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animal_profiles" ADD CONSTRAINT "animal_profiles_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animal_profiles" ADD CONSTRAINT "animal_profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animal_profiles" ADD CONSTRAINT "animal_profiles_current_foster_id_fkey" FOREIGN KEY ("current_foster_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animal_profiles" ADD CONSTRAINT "animal_profiles_adopted_by_user_id_fkey" FOREIGN KEY ("adopted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animal_photos" ADD CONSTRAINT "animal_photos_animal_id_fkey" FOREIGN KEY ("animal_id") REFERENCES "animal_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_animal_id_fkey" FOREIGN KEY ("animal_id") REFERENCES "animal_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_veterinarian_id_fkey" FOREIGN KEY ("veterinarian_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccinations" ADD CONSTRAINT "vaccinations_animal_id_fkey" FOREIGN KEY ("animal_id") REFERENCES "animal_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccinations" ADD CONSTRAINT "vaccinations_veterinarian_id_fkey" FOREIGN KEY ("veterinarian_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_animal_id_fkey" FOREIGN KEY ("animal_id") REFERENCES "animal_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_accepted_by_fkey" FOREIGN KEY ("accepted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_animal_id_fkey" FOREIGN KEY ("animal_id") REFERENCES "animal_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation_proofs" ADD CONSTRAINT "donation_proofs_donation_id_fkey" FOREIGN KEY ("donation_id") REFERENCES "donations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_reminders" ADD CONSTRAINT "event_reminders_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_reminders" ADD CONSTRAINT "event_reminders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reputation_events" ADD CONSTRAINT "reputation_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "foster_assignments" ADD CONSTRAINT "foster_assignments_animal_id_fkey" FOREIGN KEY ("animal_id") REFERENCES "animal_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "foster_assignments" ADD CONSTRAINT "foster_assignments_foster_id_fkey" FOREIGN KEY ("foster_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adoption_applications" ADD CONSTRAINT "adoption_applications_animal_id_fkey" FOREIGN KEY ("animal_id") REFERENCES "animal_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adoption_applications" ADD CONSTRAINT "adoption_applications_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adoption_applications" ADD CONSTRAINT "adoption_applications_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lost_pets" ADD CONSTRAINT "lost_pets_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lost_pets" ADD CONSTRAINT "lost_pets_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lost_pet_matches" ADD CONSTRAINT "lost_pet_matches_lost_pet_id_fkey" FOREIGN KEY ("lost_pet_id") REFERENCES "lost_pets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lost_pet_matches" ADD CONSTRAINT "lost_pet_matches_matched_report_id_fkey" FOREIGN KEY ("matched_report_id") REFERENCES "reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_flags" ADD CONSTRAINT "report_flags_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_flags" ADD CONSTRAINT "report_flags_flagged_by_fkey" FOREIGN KEY ("flagged_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_flags" ADD CONSTRAINT "report_flags_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_replies" ADD CONSTRAINT "forum_replies_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "forum_posts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_replies" ADD CONSTRAINT "forum_replies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_votes" ADD CONSTRAINT "forum_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_votes" ADD CONSTRAINT "forum_votes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "forum_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_votes" ADD CONSTRAINT "forum_votes_reply_id_fkey" FOREIGN KEY ("reply_id") REFERENCES "forum_replies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_codes" ADD CONSTRAINT "discount_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_codes" ADD CONSTRAINT "discount_codes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
