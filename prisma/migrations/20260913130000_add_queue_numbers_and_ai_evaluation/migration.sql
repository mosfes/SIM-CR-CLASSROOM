-- These columns were first added with `prisma db push`. This migration records
-- them in history so a fresh database can be built from migrations alone.

-- AlterTable
ALTER TABLE `DoctorDiagnosis` ADD COLUMN `aiEvaluatedAt` DATETIME(3) NULL,
    ADD COLUMN `aiFeedback` TEXT NULL,
    ADD COLUMN `aiModel` VARCHAR(191) NULL,
    ADD COLUMN `aiStrengths` TEXT NULL,
    ADD COLUMN `evaluationScore` INTEGER NULL,
    ADD COLUMN `isCorrect` BOOLEAN NULL,
    ADD COLUMN `queueNumber` INTEGER NULL;

-- AlterTable
ALTER TABLE `NurseInterview` ADD COLUMN `queueNumber` INTEGER NULL;

-- AlterTable
ALTER TABLE `PatientCard` ADD COLUMN `diseaseCode` VARCHAR(191) NULL,
    ADD COLUMN `queueNumber` INTEGER NULL;

-- AlterTable
ALTER TABLE `PharmacyDispense` ADD COLUMN `queueNumber` INTEGER NULL;

-- CreateIndex
CREATE INDEX `PatientCard_diseaseCode_idx` ON `PatientCard`(`diseaseCode`);
