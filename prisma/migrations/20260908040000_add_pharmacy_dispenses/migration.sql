-- CreateTable
CREATE TABLE `PharmacyDispense` (
    `id` VARCHAR(191) NOT NULL,
    `patientCardId` VARCHAR(191) NULL,
    `nurseInterviewId` VARCHAR(191) NULL,
    `doctorDiagnosisId` VARCHAR(191) NULL,
    `pharmacistId` VARCHAR(191) NULL,
    `classroomId` VARCHAR(191) NULL,
    `groupId` VARCHAR(191) NULL,
    `pharmacistName` VARCHAR(191) NOT NULL,
    `classroomName` VARCHAR(191) NOT NULL,
    `groupName` VARCHAR(191) NOT NULL,
    `patientPrefix` VARCHAR(191) NOT NULL,
    `patientFirstName` VARCHAR(191) NOT NULL,
    `patientLastName` VARCHAR(191) NOT NULL,
    `age` INTEGER NOT NULL,
    `gender` VARCHAR(191) NOT NULL,
    `maritalStatus` VARCHAR(191) NOT NULL,
    `diseaseName` VARCHAR(191) NOT NULL,
    `doctorDiagnosisText` TEXT NOT NULL,
    `medicines` JSON NOT NULL,
    `totalTablets` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PharmacyDispense_patientCardId_key`(`patientCardId`),
    UNIQUE INDEX `PharmacyDispense_nurseInterviewId_key`(`nurseInterviewId`),
    UNIQUE INDEX `PharmacyDispense_doctorDiagnosisId_key`(`doctorDiagnosisId`),
    INDEX `PharmacyDispense_pharmacistId_idx`(`pharmacistId`),
    INDEX `PharmacyDispense_classroomId_idx`(`classroomId`),
    INDEX `PharmacyDispense_groupId_idx`(`groupId`),
    INDEX `PharmacyDispense_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PharmacyDispense` ADD CONSTRAINT `PharmacyDispense_patientCardId_fkey` FOREIGN KEY (`patientCardId`) REFERENCES `PatientCard`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PharmacyDispense` ADD CONSTRAINT `PharmacyDispense_nurseInterviewId_fkey` FOREIGN KEY (`nurseInterviewId`) REFERENCES `NurseInterview`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PharmacyDispense` ADD CONSTRAINT `PharmacyDispense_doctorDiagnosisId_fkey` FOREIGN KEY (`doctorDiagnosisId`) REFERENCES `DoctorDiagnosis`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PharmacyDispense` ADD CONSTRAINT `PharmacyDispense_pharmacistId_fkey` FOREIGN KEY (`pharmacistId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PharmacyDispense` ADD CONSTRAINT `PharmacyDispense_classroomId_fkey` FOREIGN KEY (`classroomId`) REFERENCES `Classroom`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PharmacyDispense` ADD CONSTRAINT `PharmacyDispense_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `ClassroomGroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
