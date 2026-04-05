"use client";

import Features from "@/components/common/Features";
import Footer from "@/components/common/Footer";
import Header from "@/components/common/Header";
import Hero from "@/components/common/Hero";

export default function Home() {
  return (
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
  );
}
