-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" SERIAL NOT NULL,
    "campaign_id" INTEGER NOT NULL,
    "creator_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "goal_kes" INTEGER NOT NULL,
    "goal_avax" TEXT NOT NULL,
    "total_donations_avax" TEXT NOT NULL DEFAULT '0',
    "total_donations_kes" INTEGER NOT NULL DEFAULT 0,
    "conversion_rate" INTEGER NOT NULL,
    "conversion_timestamp" INTEGER NOT NULL,
    "deadline" INTEGER NOT NULL,
    "goal_reached" BOOLEAN NOT NULL DEFAULT false,
    "finalized" BOOLEAN NOT NULL DEFAULT false,
    "donor_count" INTEGER NOT NULL DEFAULT 0,
    "milestones_count" INTEGER NOT NULL DEFAULT 0,
    "transaction_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donations" (
    "id" SERIAL NOT NULL,
    "campaign_id" INTEGER NOT NULL,
    "donor" TEXT NOT NULL,
    "amount_avax" TEXT NOT NULL,
    "amount_kes" INTEGER NOT NULL,
    "timestamp" INTEGER NOT NULL,
    "transaction_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "donations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestones" (
    "id" SERIAL NOT NULL,
    "campaign_id" INTEGER NOT NULL,
    "index" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "amount_kes" INTEGER NOT NULL,
    "amount_avax" TEXT NOT NULL,
    "released" BOOLEAN NOT NULL DEFAULT false,
    "votes_for" INTEGER NOT NULL DEFAULT 0,
    "votes_against" INTEGER NOT NULL DEFAULT 0,
    "evidence_uri" TEXT,
    "proposed_at" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_campaign_id_key" ON "campaigns"("campaign_id");

-- CreateIndex
CREATE UNIQUE INDEX "milestones_campaign_id_index_key" ON "milestones"("campaign_id", "index");

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
