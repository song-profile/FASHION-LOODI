import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LOODI - Your Style, Recorded",
  description: "AI fashion diary UI prototype",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
