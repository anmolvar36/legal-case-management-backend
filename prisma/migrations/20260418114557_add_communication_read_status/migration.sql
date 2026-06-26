-- AlterTable
ALTER TABLE `communications` ADD COLUMN `is_read` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `read_at` DATETIME(3) NULL;
