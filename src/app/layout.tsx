import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

/**
 * Self-hosted after build, so frame capture never depends on the network.
 * `display: "block"` avoids a fallback-font flash: each exported frame is a
 * fresh page load, and a swap mid-load would render some frames in the wrong
 * face. The exporter also awaits `document.fonts.ready` before screenshotting.
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "block",
});

export const metadata: Metadata = {
  title: "Kinetta",
  description: "AI-assisted motion graphics editor",
  icons: { icon: [] },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full antialiased ${inter.variable}`}>
      <body className="min-h-full bg-white text-zinc-900">{children}</body>
    </html>
  );
}
