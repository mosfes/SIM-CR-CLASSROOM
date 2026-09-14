import type { Metadata, Viewport } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";

const kanit = Kanit({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-kanit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SIM CR Classroom",
  description: "ระบบจำลองสถานการณ์ผู้ป่วยสำหรับการฝึกปฏิบัติทางการแพทย์",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={`${kanit.variable} ${kanit.className} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
