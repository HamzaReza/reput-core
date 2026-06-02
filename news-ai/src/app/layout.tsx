import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NewsRoom | AI Editorial",
  description: "Tool di riscrittura automatica di articoli giornalistici",
};

import { LanguageProvider } from "@/lib/LanguageContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className="h-full antialiased bg-[#f1f5f9]">
      <body className={`${inter.className} h-full flex overflow-hidden`} suppressHydrationWarning>
        <LanguageProvider>
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </LanguageProvider>
      </body>
    </html>
  );
}
