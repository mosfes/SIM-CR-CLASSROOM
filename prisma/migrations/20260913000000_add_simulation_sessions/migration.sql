-- CreateTable
CREATE TABLE `SimulationSession` (
    `id` VARCHAR(191) NOT NULL,
    `roomCode` CHAR(6) NOT NULL,
    `classroomId` VARCHAR(191) NOT NULL,
    `createdById` VARCHAR(191) NULL,
    `status` ENUM('LOBBY', 'RUNNING', 'ENDED') NOT NULL DEFAULT 'LOBBY',
    `startedAt` DATETIME(3) NULL,
    `endedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SimulationSession_roomCode_key`(`roomCode`),
    INDEX `SimulationSession_classroomId_status_idx`(`classroomId`, `status`),
    INDEX `SimulationSession_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SimulationParticipant` (
    `id` VARCHAR(191) NOT NULL,
    `simulationId` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `groupId` VARCHAR(191) NOT NULL,
    `role` VARCHAR(32) NOT NULL,
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SimulationParticipant_simulationId_studentId_key`(`simulationId`, `studentId`),
    INDEX `SimulationParticipant_simulationId_groupId_idx`(`simulationId`, `groupId`),
    INDEX `SimulationParticipant_studentId_idx`(`studentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `PatientCard` ADD COLUMN `simulationId` VARCHAR(191) NULL;
ALTER TABLE `NurseInterview` ADD COLUMN `simulationId` VARCHAR(191) NULL;
ALTER TABLE `LabResult` ADD COLUMN `simulationId` VARCHAR(191) NULL;
ALTER TABLE `DoctorDiagnosis` ADD COLUMN `simulationId` VARCHAR(191) NULL;
ALTER TABLE `PharmacyDispense` ADD COLUMN `simulationId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `PatientCard_simulationId_idx` ON `PatientCard`(`simulationId`);
CREATE INDEX `NurseInterview_simulationId_idx` ON `NurseInterview`(`simulationId`);
CREATE INDEX `LabResult_simulationId_idx` ON `LabResult`(`simulationId`);
CREATE INDEX `DoctorDiagnosis_simulationId_idx` ON `DoctorDiagnosis`(`simulationId`);
CREATE INDEX `PharmacyDispense_simulationId_idx` ON `PharmacyDispense`(`simulationId`);

-- AddForeignKey
ALTER TABLE `SimulationSession` ADD CONSTRAINT `SimulationSession_classroomId_fkey` FOREIGN KEY (`classroomId`) REFERENCES `Classroom`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `SimulationSession` ADD CONSTRAINT `SimulationSession_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `SimulationParticipant` ADD CONSTRAINT `SimulationParticipant_simulationId_fkey` FOREIGN KEY (`simulationId`) REFERENCES `SimulationSession`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `SimulationParticipant` ADD CONSTRAINT `SimulationParticipant_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `SimulationParticipant` ADD CONSTRAINT `SimulationParticipant_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `ClassroomGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `PatientCard` ADD CONSTRAINT `PatientCard_simulationId_fkey` FOREIGN KEY (`simulationId`) REFERENCES `SimulationSession`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `NurseInterview` ADD CONSTRAINT `NurseInterview_simulationId_fkey` FOREIGN KEY (`simulationId`) REFERENCES `SimulationSession`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `LabResult` ADD CONSTRAINT `LabResult_simulationId_fkey` FOREIGN KEY (`simulationId`) REFERENCES `SimulationSession`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `DoctorDiagnosis` ADD CONSTRAINT `DoctorDiagnosis_simulationId_fkey` FOREIGN KEY (`simulationId`) REFERENCES `SimulationSession`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `PharmacyDispense` ADD CONSTRAINT `PharmacyDispense_simulationId_fkey` FOREIGN KEY (`simulationId`) REFERENCES `SimulationSession`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
