-- Grouped snapshot counters filter by simulation and aggregate by group.
CREATE INDEX `PatientCard_simulationId_groupId_idx` ON `PatientCard`(`simulationId`, `groupId`);
CREATE INDEX `NurseInterview_simulationId_groupId_idx` ON `NurseInterview`(`simulationId`, `groupId`);
CREATE INDEX `LabResult_simulationId_groupId_idx` ON `LabResult`(`simulationId`, `groupId`);
CREATE INDEX `DoctorDiagnosis_simulationId_groupId_idx` ON `DoctorDiagnosis`(`simulationId`, `groupId`);
CREATE INDEX `PharmacyDispense_simulationId_groupId_idx` ON `PharmacyDispense`(`simulationId`, `groupId`);
