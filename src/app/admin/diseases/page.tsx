import { getDiseasesData } from "@/lib/server/admin-data";
import { DiseasesContent } from "@/components/admin/diseases-content";

export default async function DiseasesManagementPage() {
  const diseases = await getDiseasesData();
  return <DiseasesContent initialDiseases={diseases} />;
}
