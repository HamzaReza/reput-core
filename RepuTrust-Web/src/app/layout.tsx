import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RepuTrust - Reputation Management Platform",
  description: "Build and manage your digital reputation with RepuTrust. Secure identity verification, trust building, and reputation scoring.",
  icons: {
    icon: "/images/logo-icon.png",
    shortcut: "/images/logo-icon.png",
    apple: "/images/logo-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body suppressHydrationWarning style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', width: '100%', margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
