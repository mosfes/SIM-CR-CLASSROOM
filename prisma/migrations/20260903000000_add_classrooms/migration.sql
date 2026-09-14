-- These tables were first created with `prisma db push`. This migration records
-- them in history so a fresh database can be built from migrations alone.

-- CreateTable
CREATE TABLE `Classroom` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NULL,
    `gradeLevel` VARCHAR(191) NULL,
    `room` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Classroom_name_idx`(`name`),
    INDEX `Classroom_gradeLevel_room_idx`(`gradeLevel`, `room`),
    INDEX `Classroom_isActive_idx`(`isActive`),
    INDEX `Classroom_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClassroomGroup` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `classroomId` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ClassroomGroup_classroomId_idx`(`classroomId`),
    INDEX `ClassroomGroup_name_idx`(`name`),
    INDEX `ClassroomGroup_isActive_idx`(`isActive`),
    INDEX `ClassroomGroup_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClassroomGroupMember` (
    `id` VARCHAR(191) NOT NULL,
    `classroomId` VARCHAR(191) NOT NULL,
    `groupId` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ClassroomGroupMember_classroomId_idx`(`classroomId`),
    INDEX `ClassroomGroupMember_groupId_idx`(`groupId`),
    INDEX `ClassroomGroupMember_studentId_idx`(`studentId`),
    UNIQUE INDEX `ClassroomGroupMember_classroomId_studentId_key`(`classroomId`, `studentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `gradeLevel` VARCHAR(191) NULL,
    ADD COLUMN `room` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `User_gradeLevel_room_idx` ON `User`(`gradeLevel`, `room`);

-- AddForeignKey
ALTER TABLE `ClassroomGroup` ADD CONSTRAINT `ClassroomGroup_classroomId_fkey` FOREIGN KEY (`classroomId`) REFERENCES `Classroom`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClassroomGroupMember` ADD CONSTRAINT `ClassroomGroupMember_classroomId_fkey` FOREIGN KEY (`classroomId`) REFERENCES `Classroom`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClassroomGroupMember` ADD CONSTRAINT `ClassroomGroupMember_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `ClassroomGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClassroomGroupMember` ADD CONSTRAINT `ClassroomGroupMember_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
