import { ProjectorBoard } from "@/components/projector/projector-board";

export const dynamic = "force-dynamic";

export default async function ProjectorPage({
  params,
}: {
  params: Promise<{ roomCode: string }>;
}) {
  const { roomCode } = await params;
  return <ProjectorBoard roomCode={roomCode} />;
}
