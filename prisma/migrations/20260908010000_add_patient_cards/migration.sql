-- CreateTable
CREATE TABLE `PatientCard` (
    `id` VARCHAR(191) NOT NULL,
    `clerkId` VARCHAR(191) NULL,
    `classroomId` VARCHAR(191) NULL,
    `groupId` VARCHAR(191) NULL,
    `clerkName` VARCHAR(191) NOT NULL,
    `classroomName` VARCHAR(191) NOT NULL,
    `groupName` VARCHAR(191) NOT NULL,
    `patientPrefix` VARCHAR(191) NOT NULL,
    `patientFirstName` VARCHAR(191) NOT NULL,
    `patientLastName` VARCHAR(191) NOT NULL,
    `age` INTEGER NOT NULL,
    `gender` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PatientCard_clerkId_idx`(`clerkId`),
    INDEX `PatientCard_classroomId_idx`(`classroomId`),
    INDEX `PatientCard_groupId_idx`(`groupId`),
    INDEX `PatientCard_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `NurseInterview` ADD COLUMN `patientCardId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `NurseInterview_patientCardId_key` ON `NurseInterview`(`patientCardId`);

-- AddForeignKey
ALTER TABLE `PatientCard` ADD CONSTRAINT `PatientCard_clerkId_fkey` FOREIGN KEY (`clerkId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PatientCard` ADD CONSTRAINT `PatientCard_classroomId_fkey` FOREIGN KEY (`classroomId`) REFERENCES `Classroom`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PatientCard` ADD CONSTRAINT `PatientCard_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `ClassroomGroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NurseInterview` ADD CONSTRAINT `NurseInterview_patientCardId_fkey` FOREIGN KEY (`patientCardId`) REFERENCES `PatientCard`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
