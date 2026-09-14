import { RefreshCw } from "lucide-react";

export default function MonitorLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center text-slate-400">
      <RefreshCw className="h-8 w-8 animate-spin text-red-600 mb-3" />
      <p className="text-sm font-semibold text-slate-600">กำลังโหลดข้อมูลการส่งตรวจของแต่ละห้องตรวจ...</p>
    </div>
  );
}
