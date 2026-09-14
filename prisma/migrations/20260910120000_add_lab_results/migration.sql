-- CreateTable
CREATE TABLE `LabResult` (
    `id` VARCHAR(191) NOT NULL,
    `patientCardId` VARCHAR(191) NULL,
    `nurseInterviewId` VARCHAR(191) NULL,
    `medTechId` VARCHAR(191) NULL,
    `classroomId` VARCHAR(191) NULL,
    `groupId` VARCHAR(191) NULL,
    `queueNumber` INTEGER NULL,
    `medTechName` VARCHAR(191) NOT NULL,
    `classroomName` VARCHAR(191) NOT NULL,
    `groupName` VARCHAR(191) NOT NULL,
    `patientPrefix` VARCHAR(191) NOT NULL,
    `patientFirstName` VARCHAR(191) NOT NULL,
    `patientLastName` VARCHAR(191) NOT NULL,
    `age` INTEGER NOT NULL,
    `gender` VARCHAR(191) NOT NULL,
    `maritalStatus` VARCHAR(191) NOT NULL,
    `panelDiseaseId` VARCHAR(191) NULL,
    `panelDiseaseCode` VARCHAR(191) NULL,
    `panelDiseaseName` VARCHAR(191) NOT NULL,
    `labItems` JSON NOT NULL,
    `isCorrect` BOOLEAN NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `LabResult_patientCardId_key`(`patientCardId`),
    UNIQUE INDEX `LabResult_nurseInterviewId_key`(`nurseInterviewId`),
    INDEX `LabResult_medTechId_idx`(`medTechId`),
    INDEX `LabResult_classroomId_idx`(`classroomId`),
    INDEX `LabResult_groupId_idx`(`groupId`),
    INDEX `LabResult_panelDiseaseId_idx`(`panelDiseaseId`),
    INDEX `LabResult_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `DoctorDiagnosis` ADD COLUMN `labResultId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `DoctorDiagnosis_labResultId_key` ON `DoctorDiagnosis`(`labResultId`);

-- AddForeignKey
ALTER TABLE `LabResult` ADD CONSTRAINT `LabResult_patientCardId_fkey` FOREIGN KEY (`patientCardId`) REFERENCES `PatientCard`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LabResult` ADD CONSTRAINT `LabResult_nurseInterviewId_fkey` FOREIGN KEY (`nurseInterviewId`) REFERENCES `NurseInterview`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LabResult` ADD CONSTRAINT `LabResult_medTechId_fkey` FOREIGN KEY (`medTechId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LabResult` ADD CONSTRAINT `LabResult_classroomId_fkey` FOREIGN KEY (`classroomId`) REFERENCES `Classroom`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LabResult` ADD CONSTRAINT `LabResult_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `ClassroomGroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LabResult` ADD CONSTRAINT `LabResult_panelDiseaseId_fkey` FOREIGN KEY (`panelDiseaseId`) REFERENCES `Disease`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DoctorDiagnosis` ADD CONSTRAINT `DoctorDiagnosis_labResultId_fkey` FOREIGN KEY (`labResultId`) REFERENCES `LabResult`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
