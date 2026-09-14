import type { Metadata } from "next";
import { PlayLobby } from "@/components/play/play-lobby";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "รอเริ่มเกม — SIM CR Classroom",
};

export default async function PlayLobbyPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; student?: string }>;
}) {
  const { session, student } = await searchParams;
  return <PlayLobby simulationId={session ?? ""} studentId={student ?? ""} />;
}
