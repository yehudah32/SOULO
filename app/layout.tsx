import type { Metadata } from "next";
import { Lora, Inter } from "next/font/google";
import "./globals.css";
import DebugPanel from "@/components/ui/debug-panel";

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Soulo Enneagram",
  description: "A conversation to get to know you — without reducing you to a number.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${lora.variable} ${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-[#FAF8F5] text-[#2C2C2C] font-sans antialiased" suppressHydrationWarning>
        {children}
        <DebugPanel />
      </body>
    </html>
  );
}
