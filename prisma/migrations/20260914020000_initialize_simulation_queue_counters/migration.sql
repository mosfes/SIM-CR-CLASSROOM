-- Ensure every existing simulation/group has a committed queue counter before
-- simultaneous patient-card requests can update it.
INSERT INTO `SimulationQueueCounter` (
    `simulationId`,
    `groupId`,
    `lastQueueNumber`,
    `createdAt`,
    `updatedAt`
)
SELECT
    `session`.`id`,
    `group`.`id`,
    COALESCE(MAX(`card`.`queueNumber`), 0),
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
FROM `SimulationSession` AS `session`
INNER JOIN `ClassroomGroup` AS `group`
    ON `group`.`classroomId` = `session`.`classroomId`
LEFT JOIN `PatientCard` AS `card`
    ON `card`.`simulationId` = `session`.`id`
    AND `card`.`groupId` = `group`.`id`
WHERE `group`.`isActive` = true
    AND NOT EXISTS (
        SELECT 1
        FROM `SimulationQueueCounter` AS `counter`
        WHERE `counter`.`simulationId` = `session`.`id`
            AND `counter`.`groupId` = `group`.`id`
    )
GROUP BY `session`.`id`, `group`.`id`;

-- Reconcile counters with cards that may have been written while the prior
-- application version was still serving traffic during deployment.
UPDATE `SimulationQueueCounter` AS `counter`
LEFT JOIN (
    SELECT
        `simulationId`,
        `groupId`,
        COALESCE(MAX(`queueNumber`), 0) AS `lastQueueNumber`
    FROM `PatientCard`
    WHERE `simulationId` IS NOT NULL AND `groupId` IS NOT NULL
    GROUP BY `simulationId`, `groupId`
) AS `cards`
    ON `cards`.`simulationId` = `counter`.`simulationId`
    AND `cards`.`groupId` = `counter`.`groupId`
SET
    `counter`.`lastQueueNumber` = GREATEST(
        `counter`.`lastQueueNumber`,
        COALESCE(`cards`.`lastQueueNumber`, 0)
    ),
    `counter`.`updatedAt` = CURRENT_TIMESTAMP(3);
