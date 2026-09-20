-- คะแนนสถานีพยาบาลเปลี่ยนเป็นเต็ม 1: ต้องตอบถูกทั้งต่อมไร้ท่อและฮอร์โมนจึงได้ 1 คะแนน นอกนั้นได้ 0
-- ปรับคะแนนเดิมที่ให้ไว้ข้อละ 1 (0-2) ให้เป็นกติกาใหม่ ข้อที่โรคไม่มีเฉลย (NULL) ไม่นำมาตัดสิน
UPDATE `NurseInterview`
SET `evaluationScore` = IF(`isGlandCorrect` IS NOT FALSE AND `isHormoneCorrect` IS NOT FALSE, 1, 0)
WHERE `evaluationScore` IS NOT NULL;
