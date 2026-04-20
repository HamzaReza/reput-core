import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RepuTrust — Find out what the web says about you",
  description:
    "RepuTrust — Find out what the web says about you analyze your online presence across thousands of sources and get a clear, reliable reputation score in minutes.",
  icons: {
    icon: "/images/logo-icon.png",
    shortcut: "/images/logo-icon.png",
    apple: "/images/logo-icon.png",
  },
  openGraph: {
    title: "RepuTrust — Find out what the web says about you",
    description:
      "RepuTrust — Find out what the web says about you analyze your online presence across thousands of sources and get a clear, reliable reputation score in minutes.",
    images: ["/images/logo-icon.png"],
  },
  twitter: {
    card: "summary",
    images: ["/images/logo-icon.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body
        suppressHydrationWarning
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          margin: 0,
          padding: 0,
        }}
      >
        {children}
      </body>
    </html>
  );
}
