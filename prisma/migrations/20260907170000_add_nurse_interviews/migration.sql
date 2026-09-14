-- CreateTable
CREATE TABLE `NurseInterview` (
    `id` VARCHAR(191) NOT NULL,
    `nurseId` VARCHAR(191) NULL,
    `classroomId` VARCHAR(191) NULL,
    `groupId` VARCHAR(191) NULL,
    `nurseName` VARCHAR(191) NOT NULL,
    `classroomName` VARCHAR(191) NOT NULL,
    `groupName` VARCHAR(191) NOT NULL,
    `patientPrefix` VARCHAR(191) NOT NULL,
    `patientFirstName` VARCHAR(191) NOT NULL,
    `patientLastName` VARCHAR(191) NOT NULL,
    `age` INTEGER NOT NULL,
    `gender` VARCHAR(191) NOT NULL,
    `maritalStatus` VARCHAR(191) NOT NULL,
    `weightKg` DECIMAL(5, 2) NOT NULL,
    `heightCm` DECIMAL(5, 2) NOT NULL,
    `systolicBp` INTEGER NOT NULL,
    `diastolicBp` INTEGER NOT NULL,
    `pulseBpm` INTEGER NOT NULL,
    `chronicDiseaseStatus` VARCHAR(191) NOT NULL,
    `chronicDiseaseDetails` TEXT NULL,
    `chiefComplaint` TEXT NOT NULL,
    `symptomDescription` TEXT NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `NurseInterview_nurseId_idx`(`nurseId`),
    INDEX `NurseInterview_classroomId_idx`(`classroomId`),
    INDEX `NurseInterview_groupId_idx`(`groupId`),
    INDEX `NurseInterview_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `NurseInterview` ADD CONSTRAINT `NurseInterview_nurseId_fkey` FOREIGN KEY (`nurseId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NurseInterview` ADD CONSTRAINT `NurseInterview_classroomId_fkey` FOREIGN KEY (`classroomId`) REFERENCES `Classroom`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NurseInterview` ADD CONSTRAINT `NurseInterview_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `ClassroomGroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
