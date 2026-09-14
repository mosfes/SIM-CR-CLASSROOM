-- DropIndex
DROP INDEX `Classroom_gradeLevel_room_idx` ON `Classroom`;

-- DropIndex
DROP INDEX `User_gradeLevel_room_idx` ON `User`;

-- AlterTable
ALTER TABLE `Classroom` DROP COLUMN `gradeLevel`;

-- AlterTable
ALTER TABLE `Classroom` DROP COLUMN `room`;

-- AlterTable
ALTER TABLE `User` DROP COLUMN `gradeLevel`;

-- AlterTable
ALTER TABLE `User` DROP COLUMN `room`;

-- AlterTable
ALTER TABLE `SimulationParticipant` DROP COLUMN `avatarId`;
