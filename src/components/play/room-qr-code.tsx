"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

function getJoinUrl(roomCode: string) {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const origin = configuredOrigin || (typeof window === "undefined" ? "" : window.location.origin);
  return `${origin}/play?roomCode=${encodeURIComponent(roomCode)}&entry=qr`;
}

export function RoomQrCode({ roomCode, size = 176 }: { roomCode: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void QRCode.toDataURL(getJoinUrl(roomCode), {
      width: 360,
      margin: 2,
      errorCorrectionLevel: "M",
      color: {
        dark: "#17233e",
        light: "#ffffff",
      },
    })
      .then((nextDataUrl) => {
        if (!cancelled) setDataUrl(nextDataUrl);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [roomCode]);

  if (!dataUrl) {
    return <div style={{ width: size, height: size }} className="flex shrink-0 items-center justify-center rounded-2xl bg-white/85 text-center text-[10px] font-bold text-slate-500">กำลังสร้าง<br />QR Code...</div>;
  }

  return (
    <div className={`shrink-0 rounded-2xl bg-white shadow-lg shadow-red-950/15 ${size < 120 ? "p-1.5" : "p-2"}`}>
      <Image
        src={dataUrl}
        alt={`สแกน QR Code เพื่อเข้าห้อง ${roomCode}`}
        width={size}
        height={size}
        unoptimized
      />
    </div>
  );
}
