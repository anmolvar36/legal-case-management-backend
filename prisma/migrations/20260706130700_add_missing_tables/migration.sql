-- AlterTable
ALTER TABLE `clients` ADD COLUMN `business_address` VARCHAR(191) NULL,
    ADD COLUMN `contact_first_name` VARCHAR(191) NULL,
    ADD COLUMN `contact_last_name` VARCHAR(191) NULL,
    ADD COLUMN `home_address` VARCHAR(191) NULL,
    ADD COLUMN `organization_name` VARCHAR(191) NULL,
    ADD COLUMN `party_role` VARCHAR(191) NOT NULL DEFAULT 'Client',
    ADD COLUMN `party_type` VARCHAR(191) NOT NULL DEFAULT 'Individual';

-- AlterTable
ALTER TABLE `communications` ADD COLUMN `parent_id` INTEGER NULL,
    ADD COLUMN `subject` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `documents` ADD COLUMN `folder_id` INTEGER NULL,
    ADD COLUMN `folder_path` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `drafts` ADD COLUMN `signed_document_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `invoices` ADD COLUMN `email_error` VARCHAR(191) NULL,
    ADD COLUMN `email_status` VARCHAR(191) NULL,
    ADD COLUMN `payment_link` VARCHAR(191) NULL,
    ADD COLUMN `pdf_document_id` INTEGER NULL,
    ADD COLUMN `sent_at` DATETIME(3) NULL,
    MODIFY `status` ENUM('draft', 'unpaid', 'due', 'paid', 'overdue', 'void') NOT NULL DEFAULT 'draft';

-- AlterTable
ALTER TABLE `matters` ADD COLUMN `case_number` VARCHAR(191) NULL,
    ADD COLUMN `court_address` VARCHAR(191) NULL,
    ADD COLUMN `court_name` VARCHAR(191) NULL,
    ADD COLUMN `date_of_loss` DATETIME(3) NULL,
    ADD COLUMN `initial_filing_date` DATETIME(3) NULL,
    ADD COLUMN `judge_name` VARCHAR(191) NULL,
    ADD COLUMN `next_hearing` DATETIME(3) NULL,
    ADD COLUMN `priority` VARCHAR(191) NOT NULL DEFAULT 'medium',
    ADD COLUMN `trial_date` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `last_login_at` DATETIME(3) NULL,
    ADD COLUMN `must_reset_password` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `user_roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `role` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `user_roles_user_id_role_key`(`user_id`, `role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoice_id` INTEGER NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `signature_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `draft_id` INTEGER NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `recipient_email` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `expires_at` DATETIME(3) NOT NULL,
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `signature_requests_token_key`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `templates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `content` LONGTEXT NULL,
    `category` VARCHAR(191) NULL DEFAULT 'court_form',
    `practice_area` VARCHAR(191) NULL,
    `matter_type` VARCHAR(191) NULL,
    `created_by_user_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conflict_checks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `prospective_client_name` VARCHAR(191) NOT NULL,
    `opposing_party_name` VARCHAR(191) NOT NULL,
    `result` VARCHAR(191) NOT NULL,
    `matches` JSON NULL,
    `created_by_user_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `time_entries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `matter_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `start_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `end_time` DATETIME(3) NULL,
    `duration_minutes` INTEGER NULL,
    `is_running` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `settings_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reports` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NULL,
    `start_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NOT NULL,
    `data` JSON NOT NULL,
    `created_by` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calendar_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `event_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NULL,
    `matter_id` INTEGER NULL,
    `type` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `reminder_date` DATETIME(3) NULL,
    `reminder_sent` BOOLEAN NOT NULL DEFAULT false,
    `court_related` BOOLEAN NOT NULL DEFAULT false,
    `event_status` VARCHAR(191) NULL DEFAULT 'scheduled',
    `titan_event_id` VARCHAR(191) NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `appearance_type` VARCHAR(191) NULL,
    `court_name` VARCHAR(191) NULL,
    `court_room` VARCHAR(191) NULL,
    `judge_name` VARCHAR(191) NULL,
    `is_court_event` BOOLEAN NOT NULL DEFAULT false,
    `reminder_sent_7d` BOOLEAN NOT NULL DEFAULT false,
    `reminder_sent_3d` BOOLEAN NOT NULL DEFAULT false,
    `reminder_sent_1d` BOOLEAN NOT NULL DEFAULT false,
    `reminder_sent_same_day` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `folders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `matter_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `reference_id` INTEGER NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trust_accounts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `client_id` INTEGER NOT NULL,
    `balance` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `trust_accounts_client_id_key`(`client_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trust_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `trust_account_id` INTEGER NOT NULL,
    `matter_id` INTEGER NULL,
    `client_id` INTEGER NOT NULL,
    `transaction_type` ENUM('deposit', 'applied_to_invoice', 'refund', 'adjustment') NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `reference` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `created_by_user_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `social_links` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `platform` ENUM('LinkedIn', 'Instagram', 'Facebook', 'YouTube') NOT NULL,
    `url` VARCHAR(191) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `social_links_platform_key`(`platform`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `practice_areas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `practice_areas_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `custom_field_definitions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `options` JSON NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `matter_custom_field_values` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `matter_id` INTEGER NOT NULL,
    `field_definition_id` INTEGER NOT NULL,
    `value` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `matter_custom_field_values_matter_id_field_definition_id_key`(`matter_id`, `field_definition_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `document_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `document_categories_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_profile` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `company_name` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `logo_url` VARCHAR(191) NULL,
    `letterhead_url` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tasks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `priority` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `status` VARCHAR(191) NOT NULL DEFAULT 'open',
    `task_type` VARCHAR(191) NULL DEFAULT 'general',
    `assigned_user_id` INTEGER NULL,
    `matter_id` INTEGER NULL,
    `due_date` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `reminder_date` DATETIME(3) NULL,
    `reminder_sent` BOOLEAN NOT NULL DEFAULT false,
    `created_by_user_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_MatterParties` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_MatterParties_AB_unique`(`A`, `B`),
    INDEX `_MatterParties_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_folder_id_fkey` FOREIGN KEY (`folder_id`) REFERENCES `folders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `communications` ADD CONSTRAINT `communications_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `communications`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `signature_requests` ADD CONSTRAINT `signature_requests_draft_id_fkey` FOREIGN KEY (`draft_id`) REFERENCES `drafts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `templates` ADD CONSTRAINT `templates_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conflict_checks` ADD CONSTRAINT `conflict_checks_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `time_entries` ADD CONSTRAINT `time_entries_matter_id_fkey` FOREIGN KEY (`matter_id`) REFERENCES `matters`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `time_entries` ADD CONSTRAINT `time_entries_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_events` ADD CONSTRAINT `calendar_events_matter_id_fkey` FOREIGN KEY (`matter_id`) REFERENCES `matters`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `folders` ADD CONSTRAINT `folders_matter_id_fkey` FOREIGN KEY (`matter_id`) REFERENCES `matters`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trust_accounts` ADD CONSTRAINT `trust_accounts_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trust_transactions` ADD CONSTRAINT `trust_transactions_trust_account_id_fkey` FOREIGN KEY (`trust_account_id`) REFERENCES `trust_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trust_transactions` ADD CONSTRAINT `trust_transactions_matter_id_fkey` FOREIGN KEY (`matter_id`) REFERENCES `matters`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trust_transactions` ADD CONSTRAINT `trust_transactions_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trust_transactions` ADD CONSTRAINT `trust_transactions_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `matter_custom_field_values` ADD CONSTRAINT `matter_custom_field_values_field_definition_id_fkey` FOREIGN KEY (`field_definition_id`) REFERENCES `custom_field_definitions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_assigned_user_id_fkey` FOREIGN KEY (`assigned_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_matter_id_fkey` FOREIGN KEY (`matter_id`) REFERENCES `matters`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_MatterParties` ADD CONSTRAINT `_MatterParties_A_fkey` FOREIGN KEY (`A`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_MatterParties` ADD CONSTRAINT `_MatterParties_B_fkey` FOREIGN KEY (`B`) REFERENCES `matters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

