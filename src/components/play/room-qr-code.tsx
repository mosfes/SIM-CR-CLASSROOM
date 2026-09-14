"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

function getJoinUrl(roomCode: string) {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const origin = configuredOrigin || (typeof window === "undefined" ? "" : window.location.origin);
  return `${origin}/play?roomCode=${encodeURIComponent(roomCode)}&entry=qr`;
}

export function RoomQrCode({ roomCode }: { roomCode: string }) {
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
    return <div className="flex h-44 w-44 shrink-0 items-center justify-center rounded-2xl bg-white/85 text-center text-[10px] font-bold text-slate-500">กำลังสร้าง<br />QR Code...</div>;
  }

  return (
    <div className="shrink-0 rounded-2xl bg-white p-2 shadow-lg shadow-red-950/15">
      <Image
        src={dataUrl}
        alt={`สแกน QR Code เพื่อเข้าห้อง ${roomCode}`}
        width={176}
        height={176}
        unoptimized
      />
    </div>
  );
}
