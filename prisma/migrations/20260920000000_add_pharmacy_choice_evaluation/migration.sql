-- รายการยาแบบกรอกเองถูกแทนที่ด้วยตัวเลือก A-U / ก-ธ จึงไม่บังคับกรอกอีกต่อไป
ALTER TABLE `PharmacyDispense` MODIFY `medicines` JSON NULL;
ALTER TABLE `PharmacyDispense` MODIFY `totalTablets` INTEGER NULL;

-- ตัวเลือกและผลการให้คะแนนของสถานีห้องยา (เต็ม 3 คะแนน)
ALTER TABLE `PharmacyDispense` ADD COLUMN `hormoneChoiceKey` VARCHAR(8) NULL;
ALTER TABLE `PharmacyDispense` ADD COLUMN `hormoneChoiceLabel` VARCHAR(191) NULL;
ALTER TABLE `PharmacyDispense` ADD COLUMN `treatmentChoiceKey` VARCHAR(8) NULL;
ALTER TABLE `PharmacyDispense` ADD COLUMN `treatmentChoiceLabel` TEXT NULL;
ALTER TABLE `PharmacyDispense` ADD COLUMN `isHormoneCorrect` BOOLEAN NULL;
ALTER TABLE `PharmacyDispense` ADD COLUMN `isTreatmentCorrect` BOOLEAN NULL;
ALTER TABLE `PharmacyDispense` ADD COLUMN `isCorrect` BOOLEAN NULL;
ALTER TABLE `PharmacyDispense` ADD COLUMN `evaluationScore` INTEGER NULL;
