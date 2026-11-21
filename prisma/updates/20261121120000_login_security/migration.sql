-- Login security: "sign out everywhere" + failed-login lockout.
-- Only needed for a database created BEFORE this version (a fresh `prisma migrate dev --name init` already includes it).

-- AlterTable
ALTER TABLE `User` ADD COLUMN `sessionVersion` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `LoginAttempt` (
    `key` VARCHAR(191) NOT NULL,
    `failures` INTEGER NOT NULL DEFAULT 0,
    `lockedUntil` DATETIME(3) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
