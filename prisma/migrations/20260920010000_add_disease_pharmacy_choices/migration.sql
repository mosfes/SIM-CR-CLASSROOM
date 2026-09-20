-- เฉลยของสถานีห้องยาย้ายมาเก็บกับตัวโรค ครูแก้ไขได้จากหน้าจัดการข้อมูลโรค
-- AlterTable
ALTER TABLE `Disease` ADD COLUMN `hormoneChoiceKey` VARCHAR(8) NULL;
ALTER TABLE `Disease` ADD COLUMN `hormoneChoiceLabel` VARCHAR(191) NULL;
ALTER TABLE `Disease` ADD COLUMN `treatmentChoiceKey` VARCHAR(8) NULL;
ALTER TABLE `Disease` ADD COLUMN `treatmentChoiceLabel` TEXT NULL;

-- เติมค่าตั้งต้นตามใบงาน (กรณีศึกษาที่ 1-21) ให้โรคที่มีรหัสตรงกัน
UPDATE `Disease` SET `hormoneChoiceKey` = 'A', `hormoneChoiceLabel` = 'Ca²⁺ ↓', `treatmentChoiceKey` = 'ก', `treatmentChoiceLabel` = 'Calcium gluconate, Calcium carbonate, Vitamin D / Calcitriol' WHERE `code` = '001';
UPDATE `Disease` SET `hormoneChoiceKey` = 'B', `hormoneChoiceLabel` = 'Ca²⁺ ↑', `treatmentChoiceKey` = 'ข', `treatmentChoiceLabel` = 'Saline, Calcitonin, Bisphosphonate' WHERE `code` = '002';
UPDATE `Disease` SET `hormoneChoiceKey` = 'C', `hormoneChoiceLabel` = 'มวลกระดูก ↓', `treatmentChoiceKey` = 'ค', `treatmentChoiceLabel` = 'Bisphosphonates เช่น Alendronate, Risedronate, Zoledronic acid; Denosumab, Teriparatide และเสริม Calcium + Vitamin D ตามข้อบ่งชี้' WHERE `code` = '003';
UPDATE `Disease` SET `hormoneChoiceKey` = 'D', `hormoneChoiceLabel` = 'T₃/T₄ ↑', `treatmentChoiceKey` = 'ง', `treatmentChoiceLabel` = 'Methimazole หรือ Propylthiouracil (PTU); อาจใช้ Beta-blocker เช่น Propranolol เพื่อควบคุมอาการ' WHERE `code` = '004';
UPDATE `Disease` SET `hormoneChoiceKey` = 'E', `hormoneChoiceLabel` = 'T₃/T₄ ↓', `treatmentChoiceKey` = 'จ', `treatmentChoiceLabel` = 'Levothyroxine' WHERE `code` = '005';
UPDATE `Disease` SET `hormoneChoiceKey` = 'F', `hormoneChoiceLabel` = 'PTH ↑', `treatmentChoiceKey` = 'ฉ', `treatmentChoiceLabel` = 'Cinacalcet; ใน secondary hyperparathyroidism อาจใช้ Calcitriol/Paricalcitol' WHERE `code` = '006';
UPDATE `Disease` SET `hormoneChoiceKey` = 'G', `hormoneChoiceLabel` = 'PTH ↓', `treatmentChoiceKey` = 'ช', `treatmentChoiceLabel` = 'Calcium + Calcitriol' WHERE `code` = '007';
UPDATE `Disease` SET `hormoneChoiceKey` = 'H', `hormoneChoiceLabel` = 'Glucose ↓', `treatmentChoiceKey` = 'ซ', `treatmentChoiceLabel` = 'Glucose/Dextrose; Glucagon' WHERE `code` = '008';
UPDATE `Disease` SET `hormoneChoiceKey` = 'I', `hormoneChoiceLabel` = 'Glucose ↑', `treatmentChoiceKey` = 'ฌ', `treatmentChoiceLabel` = 'Insulin/ยาลดน้ำตาลตามสาเหตุ' WHERE `code` = '009';
UPDATE `Disease` SET `hormoneChoiceKey` = 'J', `hormoneChoiceLabel` = 'ADH/AVP ↓', `treatmentChoiceKey` = 'ญ', `treatmentChoiceLabel` = 'Desmopressin' WHERE `code` = '010';
UPDATE `Disease` SET `hormoneChoiceKey` = 'K', `hormoneChoiceLabel` = 'Insulin ↓ / ดื้อต่อ insulin', `treatmentChoiceKey` = 'ฎ', `treatmentChoiceLabel` = 'Insulin/ยาลดน้ำตาล' WHERE `code` = '011';
UPDATE `Disease` SET `hormoneChoiceKey` = 'L', `hormoneChoiceLabel` = 'Pituitary hormones ↓', `treatmentChoiceKey` = 'ฏ', `treatmentChoiceLabel` = 'Hormone replacement' WHERE `code` = '012';
UPDATE `Disease` SET `hormoneChoiceKey` = 'M', `hormoneChoiceLabel` = 'GH ↑ หลังโตเต็มวัย', `treatmentChoiceKey` = 'ฐ', `treatmentChoiceLabel` = 'Octreotide/Lanreotide, Pegvisomant' WHERE `code` = '013';
UPDATE `Disease` SET `hormoneChoiceKey` = 'N', `hormoneChoiceLabel` = 'GH ↓', `treatmentChoiceKey` = 'ฑ', `treatmentChoiceLabel` = 'Somatropin' WHERE `code` = '014';
UPDATE `Disease` SET `hormoneChoiceKey` = 'O', `hormoneChoiceLabel` = 'GH ↑ ก่อน epiphyseal closure', `treatmentChoiceKey` = 'ฒ', `treatmentChoiceLabel` = 'Octreotide / Lanreotide, Pegvisomant, บางราย Cabergoline; การผ่าตัดเนื้องอกต่อมใต้สมองมักเป็นการรักษาหลัก' WHERE `code` = '015';
UPDATE `Disease` SET `hormoneChoiceKey` = 'P', `hormoneChoiceLabel` = 'Thyroid hormone ↓ ในเด็ก', `treatmentChoiceKey` = 'ณ', `treatmentChoiceLabel` = 'Levothyroxine (T4) และควรเริ่มรักษาเร็วหลังวินิจฉัย Cretinism' WHERE `code` = '016';
UPDATE `Disease` SET `hormoneChoiceKey` = 'Q', `hormoneChoiceLabel` = 'Thyroid hormone ↓ รุนแรง', `treatmentChoiceKey` = 'ด', `treatmentChoiceLabel` = 'Levothyroxine; ถ้าเป็น myxedema coma เป็นภาวะฉุกเฉิน ต้องรักษาในโรงพยาบาล' WHERE `code` = '017';
UPDATE `Disease` SET `hormoneChoiceKey` = 'R', `hormoneChoiceLabel` = 'Cortisol ↑', `treatmentChoiceKey` = 'ต', `treatmentChoiceLabel` = 'ยาลด cortisol + รักษาสาเหตุ' WHERE `code` = '018';
UPDATE `Disease` SET `hormoneChoiceKey` = 'S', `hormoneChoiceLabel` = 'Cortisol/Aldosterone ↓', `treatmentChoiceKey` = 'ถ', `treatmentChoiceLabel` = 'Hydrocortisone + Fludrocortisone' WHERE `code` = '019';
UPDATE `Disease` SET `hormoneChoiceKey` = 'T', `hormoneChoiceLabel` = 'มักสัมพันธ์กับ iodine deficiency', `treatmentChoiceKey` = 'ท', `treatmentChoiceLabel` = 'ถ้าเกิดจากขาดไอโอดีน → Iodine supplementation; บางกรณีใช้ Levothyroxine ตามข้อบ่งชี้' WHERE `code` = '020';
UPDATE `Disease` SET `hormoneChoiceKey` = 'U', `hormoneChoiceLabel` = 'T₃/T₄ ↑', `treatmentChoiceKey` = 'ธ', `treatmentChoiceLabel` = 'Methimazole หรือ PTU; Propranolol ช่วยลดใจสั่น/ชีพจรเร็ว และอาจรักษาด้วย radioactive iodine หรือผ่าตัดตามสาเหตุ' WHERE `code` = '021';
