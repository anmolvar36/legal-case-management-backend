-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `full_name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `role` ENUM('admin', 'lawyer', 'client') NOT NULL DEFAULT 'client',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lawyers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `display_name` VARCHAR(191) NOT NULL,
    `practice_focus` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `lawyers_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leads` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `full_name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `matter_type` VARCHAR(191) NULL,
    `practice_area` VARCHAR(191) NULL,
    `source` VARCHAR(191) NULL,
    `message` TEXT NULL,
    `status` ENUM('new', 'screening', 'consultation_set', 'retained', 'declined', 'archived') NOT NULL DEFAULT 'new',
    `notes` TEXT NULL,
    `created_by_user_id` INTEGER NULL,
    `converted_client_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clients` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NULL,
    `full_name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `address_line_1` VARCHAR(191) NULL,
    `address_line_2` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `postal_code` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `is_portal_enabled` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `clients_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `matters` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `matter_number` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `client_id` INTEGER NOT NULL,
    `assigned_lawyer_id` INTEGER NULL,
    `practice_area` VARCHAR(191) NOT NULL,
    `matter_type` VARCHAR(191) NOT NULL,
    `opposing_party_name` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `status` ENUM('pending', 'active', 'completed') NOT NULL DEFAULT 'pending',
    `opened_at` DATETIME(3) NULL,
    `closed_at` DATETIME(3) NULL,
    `created_by_user_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `matters_matter_number_key`(`matter_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `matter_status_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `matter_id` INTEGER NOT NULL,
    `old_status` ENUM('pending', 'active', 'completed') NOT NULL,
    `new_status` ENUM('pending', 'active', 'completed') NOT NULL,
    `changed_by_user_id` INTEGER NOT NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `documents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `matter_id` INTEGER NOT NULL,
    `uploaded_by_user_id` INTEGER NOT NULL,
    `file_name` VARCHAR(191) NOT NULL,
    `original_name` VARCHAR(191) NOT NULL,
    `mime_type` VARCHAR(191) NOT NULL,
    `file_path` VARCHAR(191) NOT NULL,
    `file_size` INTEGER NOT NULL,
    `visibility` ENUM('internal', 'client_shared', 'client_visible') NOT NULL DEFAULT 'internal',
    `category` VARCHAR(191) NULL,
    `is_signature_required` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `communications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `matter_id` INTEGER NOT NULL,
    `sender_user_id` INTEGER NOT NULL,
    `sender_role` ENUM('admin', 'lawyer', 'client') NOT NULL,
    `message_body` TEXT NOT NULL,
    `visibility` ENUM('internal', 'client_shared', 'client_visible') NOT NULL DEFAULT 'internal',
    `communication_type` ENUM('portal_message', 'note', 'email_log', 'call_log', 'meeting_log') NOT NULL DEFAULT 'portal_message',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoices` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `matter_id` INTEGER NOT NULL,
    `invoice_number` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `due_date` DATETIME(3) NULL,
    `status` ENUM('draft', 'pending', 'paid', 'overdue', 'void') NOT NULL DEFAULT 'draft',
    `issued_at` DATETIME(3) NULL,
    `paid_at` DATETIME(3) NULL,
    `created_by_user_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `invoices_invoice_number_key`(`invoice_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoice_id` INTEGER NOT NULL,
    `matter_id` INTEGER NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `payment_method` VARCHAR(191) NULL,
    `payment_reference` VARCHAR(191) NULL,
    `paid_on` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by_user_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `drafts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `matter_id` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NULL,
    `content` LONGTEXT NULL,
    `status` ENUM('draft', 'ready', 'sent_for_signature', 'signed') NOT NULL DEFAULT 'draft',
    `created_by_user_id` INTEGER NOT NULL,
    `last_updated_by_user_id` INTEGER NULL,
    `sent_for_signature_at` DATETIME(3) NULL,
    `signed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `signatures` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `draft_id` INTEGER NOT NULL,
    `signed_by_user_id` INTEGER NOT NULL,
    `signature_data` LONGTEXT NULL,
    `signed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ip_address` VARCHAR(191) NULL,
    `device_info` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `activities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `matter_id` INTEGER NULL,
    `actor_user_id` INTEGER NULL,
    `entity_type` VARCHAR(191) NOT NULL,
    `entity_id` INTEGER NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `lawyers` ADD CONSTRAINT `lawyers_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leads` ADD CONSTRAINT `leads_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leads` ADD CONSTRAINT `leads_converted_client_id_fkey` FOREIGN KEY (`converted_client_id`) REFERENCES `clients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clients` ADD CONSTRAINT `clients_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `matters` ADD CONSTRAINT `matters_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `matters` ADD CONSTRAINT `matters_assigned_lawyer_id_fkey` FOREIGN KEY (`assigned_lawyer_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `matters` ADD CONSTRAINT `matters_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `matter_status_history` ADD CONSTRAINT `matter_status_history_matter_id_fkey` FOREIGN KEY (`matter_id`) REFERENCES `matters`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_matter_id_fkey` FOREIGN KEY (`matter_id`) REFERENCES `matters`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_uploaded_by_user_id_fkey` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `communications` ADD CONSTRAINT `communications_matter_id_fkey` FOREIGN KEY (`matter_id`) REFERENCES `matters`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `communications` ADD CONSTRAINT `communications_sender_user_id_fkey` FOREIGN KEY (`sender_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_matter_id_fkey` FOREIGN KEY (`matter_id`) REFERENCES `matters`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_matter_id_fkey` FOREIGN KEY (`matter_id`) REFERENCES `matters`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `drafts` ADD CONSTRAINT `drafts_matter_id_fkey` FOREIGN KEY (`matter_id`) REFERENCES `matters`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `drafts` ADD CONSTRAINT `drafts_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `drafts` ADD CONSTRAINT `drafts_last_updated_by_user_id_fkey` FOREIGN KEY (`last_updated_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `signatures` ADD CONSTRAINT `signatures_draft_id_fkey` FOREIGN KEY (`draft_id`) REFERENCES `drafts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activities` ADD CONSTRAINT `activities_matter_id_fkey` FOREIGN KEY (`matter_id`) REFERENCES `matters`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activities` ADD CONSTRAINT `activities_actor_user_id_fkey` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
