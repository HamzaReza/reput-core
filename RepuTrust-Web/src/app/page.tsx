"use client";

import Features from "@/components/common/Features";
import Footer from "@/components/common/Footer";
import Header from "@/components/common/Header";
import Hero from "@/components/common/Hero";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function Home() {
  const [splashVisible, setSplashVisible] = useState(true);
  const [splashFading, setSplashFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setSplashFading(true), 3000);
    const hideTimer = setTimeout(() => setSplashVisible(false), 3800); // 800ms fade
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  return (
    <>
      {/* Splash screen */}
      {splashVisible && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "var(--color-background)",
            transition: "opacity 0.8s ease",
            opacity: splashFading ? 0 : 1,
            pointerEvents: splashFading ? "none" : "auto",
          }}
        >
          <Image
            src="/images/Ealixir.png"
            alt="Ealixir"
            width={400}
            height={160}
            style={{ width: "min(40rem, 85vw)", height: "auto" }}
            priority
          />
        </div>
      )}

      {/* Main page */}
      <div
        className="grid-bg"
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          width: "100%",
          backgroundColor: "var(--color-background)",
        }}
      >
        <Header />
        <main style={{ flex: 1 }}>
          <Hero />
          <Features />
        </main>
        <Footer />
      </div>
    </>
  );
}
