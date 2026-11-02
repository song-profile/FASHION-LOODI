import type { Metadata, Viewport } from "next";
import "./globals.css";
import { MotionProvider } from "@/components/layout/motion-provider";
import { NetworkStatus } from "@/components/blocks/network-status";

export const metadata: Metadata = {
  title: "LOODI - Your Style, Recorded",
  description: "매일의 착장을 기록하는 나만의 패션 다이어리",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head><link rel="preload" href="/fonts/NotoSansKR.woff" as="font" type="font/woff" crossOrigin="anonymous" /></head>
      <body><MotionProvider><NetworkStatus />{children}</MotionProvider></body>
    </html>
  );
}
