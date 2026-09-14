-- CreateTable
CREATE TABLE `DoctorDiagnosis` (
    `id` VARCHAR(191) NOT NULL,
    `patientCardId` VARCHAR(191) NULL,
    `nurseInterviewId` VARCHAR(191) NULL,
    `doctorId` VARCHAR(191) NULL,
    `classroomId` VARCHAR(191) NULL,
    `groupId` VARCHAR(191) NULL,
    `doctorName` VARCHAR(191) NOT NULL,
    `classroomName` VARCHAR(191) NOT NULL,
    `groupName` VARCHAR(191) NOT NULL,
    `patientPrefix` VARCHAR(191) NOT NULL,
    `patientFirstName` VARCHAR(191) NOT NULL,
    `patientLastName` VARCHAR(191) NOT NULL,
    `age` INTEGER NOT NULL,
    `gender` VARCHAR(191) NOT NULL,
    `maritalStatus` VARCHAR(191) NOT NULL,
    `diseaseId` VARCHAR(191) NULL,
    `diseaseCode` VARCHAR(191) NULL,
    `diseaseName` VARCHAR(191) NOT NULL,
    `doctorDiagnosis` TEXT NOT NULL,
    `treatmentPlan` TEXT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DoctorDiagnosis_patientCardId_key`(`patientCardId`),
    UNIQUE INDEX `DoctorDiagnosis_nurseInterviewId_key`(`nurseInterviewId`),
    INDEX `DoctorDiagnosis_doctorId_idx`(`doctorId`),
    INDEX `DoctorDiagnosis_classroomId_idx`(`classroomId`),
    INDEX `DoctorDiagnosis_groupId_idx`(`groupId`),
    INDEX `DoctorDiagnosis_diseaseId_idx`(`diseaseId`),
    INDEX `DoctorDiagnosis_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `DoctorDiagnosis` ADD CONSTRAINT `DoctorDiagnosis_patientCardId_fkey` FOREIGN KEY (`patientCardId`) REFERENCES `PatientCard`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DoctorDiagnosis` ADD CONSTRAINT `DoctorDiagnosis_nurseInterviewId_fkey` FOREIGN KEY (`nurseInterviewId`) REFERENCES `NurseInterview`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DoctorDiagnosis` ADD CONSTRAINT `DoctorDiagnosis_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DoctorDiagnosis` ADD CONSTRAINT `DoctorDiagnosis_classroomId_fkey` FOREIGN KEY (`classroomId`) REFERENCES `Classroom`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DoctorDiagnosis` ADD CONSTRAINT `DoctorDiagnosis_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `ClassroomGroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DoctorDiagnosis` ADD CONSTRAINT `DoctorDiagnosis_diseaseId_fkey` FOREIGN KEY (`diseaseId`) REFERENCES `Disease`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
