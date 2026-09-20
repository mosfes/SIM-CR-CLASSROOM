-- เฉลยของสถานีพยาบาลอยู่กับตัวโรค (หลายโรคใช้ข้อความเดียวกันได้) และเก็บคำตอบ+คะแนนของพยาบาลไว้กับการซักประวัติ
ALTER TABLE `Disease` ADD COLUMN `endocrineGland` VARCHAR(191) NULL;
ALTER TABLE `Disease` ADD COLUMN `abnormalHormone` VARCHAR(191) NULL;

ALTER TABLE `NurseInterview` ADD COLUMN `endocrineGlandChoice` VARCHAR(191) NULL;
ALTER TABLE `NurseInterview` ADD COLUMN `abnormalHormoneChoice` VARCHAR(191) NULL;
ALTER TABLE `NurseInterview` ADD COLUMN `isGlandCorrect` BOOLEAN NULL;
ALTER TABLE `NurseInterview` ADD COLUMN `isHormoneCorrect` BOOLEAN NULL;
ALTER TABLE `NurseInterview` ADD COLUMN `evaluationScore` INTEGER NULL;

-- ตัวลวงของสถานีพยาบาล: ตัวเลือกที่ไม่ใช่คำตอบของโรคใดเลย
CREATE TABLE `NurseChoiceDecoy` (
    `id` VARCHAR(191) NOT NULL,
    `kind` ENUM('GLAND', 'HORMONE') NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `NurseChoiceDecoy_kind_label_key`(`kind`, `label`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ค่าตั้งต้นตามใบงานพยาบาลฉบับที่ 2 (กรณีศึกษาที่ 1-21) ให้โรคที่มีรหัสตรงกัน
UPDATE `Disease` SET `endocrineGland` = 'ต่อมพาราไทรอยด์', `abnormalHormone` = 'Parathyroid hormone' WHERE `code` = '001';
UPDATE `Disease` SET `endocrineGland` = 'ต่อมพาราไทรอยด์', `abnormalHormone` = 'Parathyroid hormone' WHERE `code` = '002';
UPDATE `Disease` SET `endocrineGland` = 'ต่อมพาราไทรอยด์', `abnormalHormone` = 'Parathyroid hormone' WHERE `code` = '003';
UPDATE `Disease` SET `endocrineGland` = 'ต่อมไทรอยด์', `abnormalHormone` = 'T3, T4' WHERE `code` = '004';
UPDATE `Disease` SET `endocrineGland` = 'ต่อมไทรอยด์', `abnormalHormone` = 'T3, T4' WHERE `code` = '005';
UPDATE `Disease` SET `endocrineGland` = 'ต่อมพาราไทรอยด์', `abnormalHormone` = 'Parathyroid hormone' WHERE `code` = '006';
UPDATE `Disease` SET `endocrineGland` = 'ต่อมพาราไทรอยด์', `abnormalHormone` = 'Parathyroid hormone' WHERE `code` = '007';
UPDATE `Disease` SET `endocrineGland` = 'ตับอ่อน', `abnormalHormone` = 'Insulin' WHERE `code` = '008';
UPDATE `Disease` SET `endocrineGland` = 'ตับอ่อน', `abnormalHormone` = 'Insulin' WHERE `code` = '009';
UPDATE `Disease` SET `endocrineGland` = 'ต่อมใต้สมองส่วนหลัง', `abnormalHormone` = 'ADH (Vasopressin)' WHERE `code` = '010';
UPDATE `Disease` SET `endocrineGland` = 'ตับอ่อน', `abnormalHormone` = 'Insulin' WHERE `code` = '011';
UPDATE `Disease` SET `endocrineGland` = 'ต่อมใต้สมองส่วนหน้า', `abnormalHormone` = 'Growth hormone (GH)' WHERE `code` = '012';
UPDATE `Disease` SET `endocrineGland` = 'ต่อมใต้สมองส่วนหน้า', `abnormalHormone` = 'Growth hormone (GH)' WHERE `code` = '013';
UPDATE `Disease` SET `endocrineGland` = 'ต่อมใต้สมองส่วนหน้า', `abnormalHormone` = 'Growth hormone (GH)' WHERE `code` = '014';
UPDATE `Disease` SET `endocrineGland` = 'ต่อมใต้สมองส่วนหน้า', `abnormalHormone` = 'Growth hormone (GH)' WHERE `code` = '015';
UPDATE `Disease` SET `endocrineGland` = 'ต่อมไทรอยด์', `abnormalHormone` = 'T3, T4' WHERE `code` = '016';
UPDATE `Disease` SET `endocrineGland` = 'ต่อมไทรอยด์', `abnormalHormone` = 'T3, T4' WHERE `code` = '017';
UPDATE `Disease` SET `endocrineGland` = 'ต่อมหมวกไตชั้นนอก', `abnormalHormone` = 'Cortisol' WHERE `code` = '018';
UPDATE `Disease` SET `endocrineGland` = 'ต่อมหมวกไตชั้นนอก', `abnormalHormone` = 'Aldosterone' WHERE `code` = '019';
UPDATE `Disease` SET `endocrineGland` = 'ต่อมไทรอยด์', `abnormalHormone` = 'T3, T4' WHERE `code` = '020';
UPDATE `Disease` SET `endocrineGland` = 'ต่อมไทรอยด์', `abnormalHormone` = 'T3, T4' WHERE `code` = '021';

-- ตัวลวงตามใบงาน
INSERT INTO `NurseChoiceDecoy` (`id`, `kind`, `label`) VALUES ('nurse-decoy-gland-1', 'GLAND', 'ต่อมไพเนียล');
INSERT INTO `NurseChoiceDecoy` (`id`, `kind`, `label`) VALUES ('nurse-decoy-gland-2', 'GLAND', 'ต่อมไทมัส');
INSERT INTO `NurseChoiceDecoy` (`id`, `kind`, `label`) VALUES ('nurse-decoy-gland-3', 'GLAND', 'ต่อมหมวกไตชั้นใน');
INSERT INTO `NurseChoiceDecoy` (`id`, `kind`, `label`) VALUES ('nurse-decoy-gland-4', 'GLAND', 'รังไข่');
INSERT INTO `NurseChoiceDecoy` (`id`, `kind`, `label`) VALUES ('nurse-decoy-gland-5', 'GLAND', 'อัณฑะ');
INSERT INTO `NurseChoiceDecoy` (`id`, `kind`, `label`) VALUES ('nurse-decoy-hormone-1', 'HORMONE', 'Prolactin');
INSERT INTO `NurseChoiceDecoy` (`id`, `kind`, `label`) VALUES ('nurse-decoy-hormone-2', 'HORMONE', 'ACTH');
INSERT INTO `NurseChoiceDecoy` (`id`, `kind`, `label`) VALUES ('nurse-decoy-hormone-3', 'HORMONE', 'oxytocin');
INSERT INTO `NurseChoiceDecoy` (`id`, `kind`, `label`) VALUES ('nurse-decoy-hormone-4', 'HORMONE', 'Adrenalin hormone');
INSERT INTO `NurseChoiceDecoy` (`id`, `kind`, `label`) VALUES ('nurse-decoy-hormone-5', 'HORMONE', 'Noradrenalin hormone');
INSERT INTO `NurseChoiceDecoy` (`id`, `kind`, `label`) VALUES ('nurse-decoy-hormone-6', 'HORMONE', 'Calcitonin');
INSERT INTO `NurseChoiceDecoy` (`id`, `kind`, `label`) VALUES ('nurse-decoy-hormone-7', 'HORMONE', 'Testosterone');
INSERT INTO `NurseChoiceDecoy` (`id`, `kind`, `label`) VALUES ('nurse-decoy-hormone-8', 'HORMONE', 'Estrogen');
INSERT INTO `NurseChoiceDecoy` (`id`, `kind`, `label`) VALUES ('nurse-decoy-hormone-9', 'HORMONE', 'Progesterone');
INSERT INTO `NurseChoiceDecoy` (`id`, `kind`, `label`) VALUES ('nurse-decoy-hormone-10', 'HORMONE', 'Melatonin');
INSERT INTO `NurseChoiceDecoy` (`id`, `kind`, `label`) VALUES ('nurse-decoy-hormone-11', 'HORMONE', 'Thymosin');
INSERT INTO `NurseChoiceDecoy` (`id`, `kind`, `label`) VALUES ('nurse-decoy-hormone-12', 'HORMONE', 'FSH');
INSERT INTO `NurseChoiceDecoy` (`id`, `kind`, `label`) VALUES ('nurse-decoy-hormone-13', 'HORMONE', 'LH');
