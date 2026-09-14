import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PAIR_FAILURES = 5;
const MAX_ACCOUNT_FAILURES = 30;

function hashKey(value: string): string {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");
}

function accountKey(username: string): string {
  return hashKey(`account\0${username}`);
}

function pairKey(username: string, clientFingerprint: string): string {
  return hashKey(`pair\0${username}\0${clientFingerprint}`);
}

export function getClientFingerprint(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = request.headers.get("x-real-ip")?.trim() || forwarded || "unknown";
  return ip.slice(0, 128);
}

export async function getLoginBlockSeconds(
  username: string,
  clientFingerprint: string
): Promise<number> {
  const records = await prisma.loginThrottle.findMany({
    where: { keyHash: { in: [accountKey(username), pairKey(username, clientFingerprint)] } },
  });

  return records.reduce((seconds, record) => {
    if (!record.blockedUntil) return seconds;
    return Math.max(seconds, Math.ceil((record.blockedUntil.getTime() - Date.now()) / 1000));
  }, 0);
}

async function recordFailureForKey(keyHash: string, maxFailures: number): Promise<void> {
  const now = new Date();
  const record = await prisma.loginThrottle.findUnique({ where: { keyHash } });

  if (!record || record.windowStartedAt.getTime() <= now.getTime() - WINDOW_MS) {
    await prisma.loginThrottle.upsert({
      where: { keyHash },
      create: { keyHash, failures: 1, windowStartedAt: now },
      update: { failures: 1, windowStartedAt: now, blockedUntil: null },
    });
    return;
  }

  const failures = record.failures + 1;
  await prisma.loginThrottle.update({
    where: { keyHash },
    data: {
      failures,
      blockedUntil: failures >= maxFailures ? new Date(now.getTime() + WINDOW_MS) : null,
    },
  });
}

export async function recordLoginFailure(
  username: string,
  clientFingerprint: string
): Promise<void> {
  await Promise.all([
    recordFailureForKey(pairKey(username, clientFingerprint), MAX_PAIR_FAILURES),
    recordFailureForKey(accountKey(username), MAX_ACCOUNT_FAILURES),
  ]);
}

export async function clearLoginFailures(
  username: string,
  clientFingerprint: string
): Promise<void> {
  await prisma.loginThrottle.deleteMany({
    where: { keyHash: { in: [accountKey(username), pairKey(username, clientFingerprint)] } },
  });
}
