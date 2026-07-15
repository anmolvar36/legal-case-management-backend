-- AlterTable
ALTER TABLE `users` ADD COLUMN `signature` TEXT NULL;

-- AlterTable
ALTER TABLE `communications` ADD COLUMN `request_read_receipt` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `track_opens` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `opened` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `opened_time` DATETIME(3) NULL,
    ADD COLUMN `open_count` INTEGER NOT NULL DEFAULT 0;
