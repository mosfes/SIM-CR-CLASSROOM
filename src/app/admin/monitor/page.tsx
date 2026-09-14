import { Suspense } from "react";
import { MonitorContent } from "@/components/admin/monitor-content";
import { RefreshCw } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MonitorPage({
  searchParams,
}: {
  searchParams: Promise<{ classroomId?: string; groupId?: string }>;
}) {
  const { classroomId, groupId } = await searchParams;

  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
          <RefreshCw className="h-8 w-8 animate-spin text-red-600 mb-3" />
          <p className="text-sm font-semibold">กำลังโหลดข้อมูลการส่งตรวจของแต่ละห้องตรวจ...</p>
        </div>
      }
    >
      <MonitorContent
        initialClassroomId={classroomId}
        initialGroupId={groupId}
      />
    </Suspense>
  );
}
