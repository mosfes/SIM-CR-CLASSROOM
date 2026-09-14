export const DEFAULT_SIMULATION_GROUP_COUNT = 5;

export function getDefaultSimulationGroups() {
  return Array.from({ length: DEFAULT_SIMULATION_GROUP_COUNT }, (_, index) => ({
    name: `กลุ่ม ${index + 1}`,
  }));
}
