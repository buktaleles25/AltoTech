import type { Metadata, Viewport } from "next";
import { Geist_Mono, Noto_Sans_Thai } from "next/font/google";
import BottomNav from "@/components/BottomNav";
import PwaRegister from "@/components/PwaRegister";
import "./globals.css";

// Geist doesn't cover Thai script (combining vowels/tone marks render incorrectly with it).
// Noto Sans Thai has full Thai + Latin coverage, so it's used as the single UI font.
const notoSansThai = Noto_Sans_Thai({
  variable: "--font-sans-thai",
  subsets: ["thai", "latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Step 5 — วิเคราะห์บอลตามราคาน้ำจริง",
    template: "%s · Step 5",
  },
  description: "วิเคราะห์ฟุตบอลจากราคาน้ำจริง ไลน์อัพ และข่าวล่าสุด พร้อมสเต็ป 5 คู่คุณค่าที่สุดของวันทุกวัน",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Step 5" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0f14",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${notoSansThai.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background text-text-primary">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
        <PwaRegister />
        <BottomNav />
      </body>
    </html>
  );
}
