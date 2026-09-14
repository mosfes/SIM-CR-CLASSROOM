import crypto from "node:crypto";
import { createInterface, emitKeypressEvents } from "node:readline";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const usernamePattern = /^[a-z0-9._-]{3,64}$/;

function question(prompt) {
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => readline.question(prompt, (answer) => {
    readline.close();
    resolve(answer);
  }));
}

function hiddenQuestion(prompt) {
  if (!process.stdin.isTTY) {
    const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
    if (!password) throw new Error("ต้องรันใน terminal หรือกำหนด ADMIN_BOOTSTRAP_PASSWORD ผ่าน secret environment");
    return Promise.resolve(password);
  }

  return new Promise((resolve, reject) => {
    let value = "";
    process.stdout.write(prompt);
    emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();

    function finish() {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.off("keypress", onKeypress);
      process.stdout.write("\n");
    }

    function onKeypress(character, key) {
      if (key?.ctrl && key.name === "c") {
        finish();
        reject(new Error("ยกเลิกการสร้างแอดมิน"));
        return;
      }
      if (key?.name === "return" || key?.name === "enter") {
        finish();
        resolve(value);
        return;
      }
      if (key?.name === "backspace") {
        value = value.slice(0, -1);
        return;
      }
      if (character && !key?.ctrl && !key?.meta) value += character;
    }

    process.stdin.on("keypress", onKeypress);
  });
}

function deriveKey(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(
      password,
      salt,
      64,
      { N: 32_768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, key) => error ? reject(error) : resolve(key)
    );
  });
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const hash = await deriveKey(password, salt);
  return `scrypt$32768$8$1$${salt}$${hash.toString("base64url")}`;
}

async function main() {
  const username = String(await question("Username: ")).trim().toLowerCase();
  if (!usernamePattern.test(username)) {
    throw new Error("Username ต้องมี 3-64 ตัว และใช้ได้เฉพาะ a-z, 0-9, จุด, ขีดกลาง หรือขีดล่าง");
  }

  const name = String(await question("ชื่อที่แสดง: ")).trim();
  if (!name || name.length > 160) throw new Error("กรุณากรอกชื่อที่แสดงไม่เกิน 160 ตัวอักษร");

  const password = await hiddenQuestion("Password (อย่างน้อย 8 ตัวอักษร): ");
  if (password.length < 8 || password.length > 256) {
    throw new Error("รหัสผ่านต้องมี 8-256 ตัวอักษร");
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) throw new Error("Username นี้มีอยู่แล้ว");

  await prisma.user.create({
    data: {
      role: "ADMIN",
      username,
      password: await hashPassword(password),
      name,
      firstName: name,
    },
  });

  process.stdout.write(`สร้างบัญชี @${username} สำเร็จ\n`);
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : "สร้างบัญชีไม่สำเร็จ";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
