-- AlterTable
ALTER TABLE `PatientCard` ADD COLUMN `maritalStatus` VARCHAR(191) NULL;

-- Backfill cards created before marital status moved to the card-room station
UPDATE `PatientCard` SET `maritalStatus` = 'ไม่ระบุ' WHERE `maritalStatus` IS NULL;

-- AlterTable
ALTER TABLE `PatientCard` MODIFY `maritalStatus` VARCHAR(191) NOT NULL;
