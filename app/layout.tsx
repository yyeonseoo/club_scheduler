import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Club Scheduler",
  description: "Local-first club performance and practice scheduler",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#129987",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
