export function formatPatientCode(queueNumber: number | null | undefined): string {
  if (queueNumber === null || queueNumber === undefined) return "-";
  return String(queueNumber).padStart(2, "0");
}
