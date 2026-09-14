import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ database: "connected", provider: "TiDB / MySQL" });
  } catch {
    return Response.json({ database: "disconnected" }, { status: 503 });
  }
}
