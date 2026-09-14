export const DEFAULT_SIMULATION_GROUP_COUNT = 5;
export const MAX_CLASSROOM_GROUP_COUNT = 100;

export function parseClassroomGroupCount(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < 1 || value > MAX_CLASSROOM_GROUP_COUNT) return null;
  return value;
}

export function getSimulationGroups(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    name: `ห้องตรวจ ${index + 1}`,
  }));
}

export function getDefaultSimulationGroups() {
  return getSimulationGroups(DEFAULT_SIMULATION_GROUP_COUNT);
}
