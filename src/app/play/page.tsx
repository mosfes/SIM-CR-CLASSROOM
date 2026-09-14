import type { Metadata } from "next";
import { PlayWizard } from "@/components/play/play-wizard";

export const metadata: Metadata = {
  title: "เริ่มเล่น — SIM CR Classroom",
  description: "ใส่เลขห้องจำลอง เลือกตัวตน กลุ่ม และบทบาทเพื่อเข้าร่วมการฝึกปฏิบัติ",
};

export default function PlayPage() {
  return (
    <main className="relative min-h-screen bg-[#faf8f5] text-slate-800 bg-game-grid selection:bg-rose-500 selection:text-white">
      {/* Soft ambient lighting */}
      <div className="pointer-events-none fixed -top-32 -left-32 h-96 w-96 rounded-full bg-rose-200/20 blur-3xl" />
      <div className="pointer-events-none fixed top-1/3 -right-32 h-96 w-96 rounded-full bg-amber-100/30 blur-3xl" />

      <PlayWizard />
    </main>
  );
}
