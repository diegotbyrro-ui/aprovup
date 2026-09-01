-- CreateEnum
CREATE TYPE "SaasPlanStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SaasBillingCycle" AS ENUM ('MONTHLY', 'YEARLY', 'LIFETIME');

-- CreateEnum
CREATE TYPE "SaasSubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'PAUSED', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SaasPaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "SaasCouponStatus" AS ENUM ('ACTIVE', 'PAUSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SaasDiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'SOCIAL_MEDIA',
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "approvedAt" TIMESTAMP(3),
    "approvedByName" TEXT,
    "permissions" JSONB,
    "inviteToken" TEXT,
    "inviteExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "segment" TEXT,
    "internalResponsible" TEXT,
    "postingFrequency" TEXT,
    "monthlyContentGoal" INTEGER NOT NULL DEFAULT 0,
    "toneOfVoice" TEXT,
    "contractedServices" TEXT,
    "usefulLinks" TEXT,
    "databaseLink" TEXT,
    "driveLink" TEXT,
    "logoLink" TEXT,
    "strategicNotes" TEXT,
    "logoUrl" TEXT,
    "brandColor" TEXT,
    "clientBriefing" TEXT,
    "personaNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cnpj" TEXT,
    "legalName" TEXT,
    "mainContact" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "companyAddress" TEXT,
    "businessDescription" TEXT,
    "targetAudience" TEXT,
    "brandDifferentials" TEXT,
    "marketingGoals" TEXT,
    "competitors" TEXT,
    "benchmarkNotes" TEXT,
    "contentPillars" TEXT,
    "contentRestrictions" TEXT,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientPersona" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ageRange" TEXT,
    "location" TEXT,
    "profession" TEXT,
    "painPoints" TEXT,
    "desires" TEXT,
    "objections" TEXT,
    "realPhrases" TEXT,
    "contentPreferences" TEXT,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientPersona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientProfileDiagnosis" (
    "id" TEXT NOT NULL,
    "instagramUrl" TEXT,
    "teamNotes" TEXT,
    "profilePrintUrl" TEXT,
    "insightsPrintUrl" TEXT,
    "highlightsPrintUrl" TEXT,
    "bioAnalysis" TEXT,
    "profilePhotoAnalysis" TEXT,
    "visualIdentityAnalysis" TEXT,
    "highlightsAnalysis" TEXT,
    "postingFrequencyAnalysis" TEXT,
    "offerClarityAnalysis" TEXT,
    "strengths" TEXT,
    "improvementPoints" TEXT,
    "actionPlan" TEXT,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientProfileDiagnosis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Content" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "objective" TEXT,
    "format" TEXT,
    "platform" TEXT,
    "plannedDate" TIMESTAMP(3),
    "responsible" TEXT,
    "area" TEXT NOT NULL DEFAULT 'GERAL',
    "priority" TEXT NOT NULL DEFAULT 'MEDIA',
    "caption" TEXT,
    "artText" TEXT,
    "script" TEXT,
    "briefing" TEXT,
    "fileLinks" TEXT,
    "coverImageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IDEIA',
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "finalMediaUrl" TEXT,
    "finalCoverUrl" TEXT,
    "finalMediaType" TEXT,
    "finalUploadedAt" TIMESTAMP(3),

    CONSTRAINT "Content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'A_FAZER',
    "priority" TEXT NOT NULL DEFAULT 'MEDIA',
    "dueDate" TIMESTAMP(3),
    "responsible" TEXT,
    "contentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "authorName" TEXT,
    "authorRole" TEXT,
    "message" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "clientComment" TEXT,
    "contentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyApproval" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstagramMediaAsset" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstagramMediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstagramPublication" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "instagramUserId" TEXT,
    "instagramUsername" TEXT,
    "caption" TEXT,
    "mediaUrl" TEXT,
    "coverUrl" TEXT,
    "mediaType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PRONTO',
    "scheduledFor" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "metaContainerId" TEXT,
    "metaMediaId" TEXT,
    "permalink" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstagramPublication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstagramConnection" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "instagramUserId" TEXT NOT NULL,
    "username" TEXT,
    "displayName" TEXT,
    "facebookPageId" TEXT NOT NULL,
    "facebookPageName" TEXT,
    "pageAccessTokenEncrypted" TEXT NOT NULL,
    "userAccessTokenEncrypted" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "scopes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "connectedByUserId" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstagramConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstagramMetricSnapshot" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "instagramUserId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "followersCount" INTEGER,
    "reach" INTEGER,
    "views" INTEGER,
    "interactions" INTEGER,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstagramMetricSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaOAuthSession" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "encryptedPayload" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetaOAuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "segment" TEXT,
    "prompt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromptTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoryLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoryLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignKanbanColumn" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "statusKey" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DesignKanbanColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilmmakerKanbanColumn" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "statusKey" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FilmmakerKanbanColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaptureSchedule" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "contentId" TEXT,
    "clientName" TEXT NOT NULL,
    "contentName" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "dateKey" TEXT NOT NULL,
    "location" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AGENDADO',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaptureSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaptureDateSuggestion" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "approvalToken" TEXT,
    "dateKey" TEXT NOT NULL,
    "time" TEXT NOT NULL DEFAULT '09:00',
    "label" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaptureDateSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AprovUpLead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "agency" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "clientCount" TEXT,
    "biggestPain" TEXT,
    "source" TEXT NOT NULL DEFAULT 'site',
    "status" TEXT NOT NULL DEFAULT 'NOVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AprovUpLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaasPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "SaasPlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "billingCycle" "SaasBillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "setupFeeCents" INTEGER NOT NULL DEFAULT 0,
    "maxClients" INTEGER NOT NULL DEFAULT 10,
    "maxUsers" INTEGER NOT NULL DEFAULT 3,
    "canUseAi" BOOLEAN NOT NULL DEFAULT false,
    "canUseCrm" BOOLEAN NOT NULL DEFAULT false,
    "canUseSocialPosting" BOOLEAN NOT NULL DEFAULT false,
    "canUseReports" BOOLEAN NOT NULL DEFAULT false,
    "monthlyAiLimitCents" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaasPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaasSubscription" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "ownerEmail" TEXT,
    "agencyName" TEXT,
    "planId" TEXT NOT NULL,
    "status" "SaasSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "monthlyAiLimitCents" INTEGER NOT NULL DEFAULT 0,
    "canUseAi" BOOLEAN NOT NULL DEFAULT false,
    "canUseCrm" BOOLEAN NOT NULL DEFAULT false,
    "canUseSocialPosting" BOOLEAN NOT NULL DEFAULT false,
    "canUseReports" BOOLEAN NOT NULL DEFAULT false,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaasSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaasPayment" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "ownerUserId" TEXT,
    "ownerEmail" TEXT,
    "agencyName" TEXT,
    "amountCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "status" "SaasPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "method" TEXT,
    "externalReference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaasPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaasCoupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "status" "SaasCouponStatus" NOT NULL DEFAULT 'ACTIVE',
    "discountType" "SaasDiscountType" NOT NULL DEFAULT 'PERCENTAGE',
    "discountPercent" INTEGER,
    "discountCents" INTEGER,
    "appliesToPlanSlug" TEXT,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaasCoupon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_inviteToken_key" ON "User"("inviteToken");

-- CreateIndex
CREATE UNIQUE INDEX "Approval_token_key" ON "Approval"("token");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyApproval_token_key" ON "MonthlyApproval"("token");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyApproval_clientId_month_year_key" ON "MonthlyApproval"("clientId", "month", "year");

-- CreateIndex
CREATE INDEX "InstagramMediaAsset_contentId_idx" ON "InstagramMediaAsset"("contentId");

-- CreateIndex
CREATE UNIQUE INDEX "InstagramMediaAsset_contentId_position_key" ON "InstagramMediaAsset"("contentId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "InstagramPublication_contentId_key" ON "InstagramPublication"("contentId");

-- CreateIndex
CREATE INDEX "InstagramPublication_status_idx" ON "InstagramPublication"("status");

-- CreateIndex
CREATE INDEX "InstagramPublication_scheduledFor_idx" ON "InstagramPublication"("scheduledFor");

-- CreateIndex
CREATE INDEX "InstagramPublication_instagramUserId_idx" ON "InstagramPublication"("instagramUserId");

-- CreateIndex
CREATE UNIQUE INDEX "InstagramConnection_clientId_key" ON "InstagramConnection"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "InstagramConnection_instagramUserId_key" ON "InstagramConnection"("instagramUserId");

-- CreateIndex
CREATE INDEX "InstagramConnection_instagramUserId_idx" ON "InstagramConnection"("instagramUserId");

-- CreateIndex
CREATE INDEX "InstagramConnection_facebookPageId_idx" ON "InstagramConnection"("facebookPageId");

-- CreateIndex
CREATE INDEX "InstagramMetricSnapshot_instagramUserId_dateKey_idx" ON "InstagramMetricSnapshot"("instagramUserId", "dateKey");

-- CreateIndex
CREATE INDEX "InstagramMetricSnapshot_dateKey_idx" ON "InstagramMetricSnapshot"("dateKey");

-- CreateIndex
CREATE UNIQUE INDEX "InstagramMetricSnapshot_clientId_dateKey_key" ON "InstagramMetricSnapshot"("clientId", "dateKey");

-- CreateIndex
CREATE INDEX "MetaOAuthSession_clientId_idx" ON "MetaOAuthSession"("clientId");

-- CreateIndex
CREATE INDEX "MetaOAuthSession_userId_idx" ON "MetaOAuthSession"("userId");

-- CreateIndex
CREATE INDEX "MetaOAuthSession_expiresAt_idx" ON "MetaOAuthSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "DesignKanbanColumn_statusKey_key" ON "DesignKanbanColumn"("statusKey");

-- CreateIndex
CREATE UNIQUE INDEX "FilmmakerKanbanColumn_statusKey_key" ON "FilmmakerKanbanColumn"("statusKey");

-- CreateIndex
CREATE UNIQUE INDEX "SaasPlan_slug_key" ON "SaasPlan"("slug");

-- CreateIndex
CREATE INDEX "SaasSubscription_ownerUserId_idx" ON "SaasSubscription"("ownerUserId");

-- CreateIndex
CREATE INDEX "SaasSubscription_planId_idx" ON "SaasSubscription"("planId");

-- CreateIndex
CREATE INDEX "SaasSubscription_status_idx" ON "SaasSubscription"("status");

-- CreateIndex
CREATE INDEX "SaasPayment_subscriptionId_idx" ON "SaasPayment"("subscriptionId");

-- CreateIndex
CREATE INDEX "SaasPayment_ownerUserId_idx" ON "SaasPayment"("ownerUserId");

-- CreateIndex
CREATE INDEX "SaasPayment_status_idx" ON "SaasPayment"("status");

-- CreateIndex
CREATE INDEX "SaasPayment_dueDate_idx" ON "SaasPayment"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "SaasCoupon_code_key" ON "SaasCoupon"("code");

-- CreateIndex
CREATE INDEX "SaasCoupon_status_idx" ON "SaasCoupon"("status");

-- CreateIndex
CREATE INDEX "SaasCoupon_appliesToPlanSlug_idx" ON "SaasCoupon"("appliesToPlanSlug");

-- AddForeignKey
ALTER TABLE "ClientPersona" ADD CONSTRAINT "ClientPersona_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientProfileDiagnosis" ADD CONSTRAINT "ClientProfileDiagnosis_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyApproval" ADD CONSTRAINT "MonthlyApproval_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramMediaAsset" ADD CONSTRAINT "InstagramMediaAsset_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramPublication" ADD CONSTRAINT "InstagramPublication_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramConnection" ADD CONSTRAINT "InstagramConnection_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramMetricSnapshot" ADD CONSTRAINT "InstagramMetricSnapshot_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaasSubscription" ADD CONSTRAINT "SaasSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SaasPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaasPayment" ADD CONSTRAINT "SaasPayment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "SaasSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
