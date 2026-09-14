-- Keep patient queue allocation atomic for each simulation group.
CREATE TABLE `SimulationQueueCounter` (
    `simulationId` VARCHAR(191) NOT NULL,
    `groupId` VARCHAR(191) NOT NULL,
    `lastQueueNumber` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SimulationQueueCounter_groupId_idx`(`groupId`),
    PRIMARY KEY (`simulationId`, `groupId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Preserve the next number for sessions that already have patient cards.
INSERT INTO `SimulationQueueCounter` (
    `simulationId`,
    `groupId`,
    `lastQueueNumber`,
    `createdAt`,
    `updatedAt`
)
SELECT
    `simulationId`,
    `groupId`,
    COALESCE(MAX(`queueNumber`), 0),
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
FROM `PatientCard`
WHERE `simulationId` IS NOT NULL AND `groupId` IS NOT NULL
GROUP BY `simulationId`, `groupId`;

ALTER TABLE `SimulationQueueCounter`
    ADD CONSTRAINT `SimulationQueueCounter_simulationId_fkey`
    FOREIGN KEY (`simulationId`) REFERENCES `SimulationSession`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `SimulationQueueCounter`
    ADD CONSTRAINT `SimulationQueueCounter_groupId_fkey`
    FOREIGN KEY (`groupId`) REFERENCES `ClassroomGroup`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
