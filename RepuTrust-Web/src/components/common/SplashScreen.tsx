"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export default function SplashScreen() {
  // "visible" → showing, "fading" → opacity transitioning to 0, "done" → unmounted
  const [phase, setPhase] = useState<"visible" | "fading" | "done">("visible");

  useEffect(() => {
    // Only show the splash once per browser session
    if (sessionStorage.getItem("splash_shown")) {
      setPhase("done");
      return;
    }

    const fadeTimer = setTimeout(() => setPhase("fading"), 3000);
    const doneTimer = setTimeout(() => {
      setPhase("done");
      sessionStorage.setItem("splash_shown", "1");
    }, 3600); // 3 s hold + 0.6 s fade

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  if (phase === "done") return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: phase === "fading" ? 0 : 1,
        transition: "opacity 0.6s ease",
        pointerEvents: phase === "fading" ? "none" : "auto",
      }}
    >
      <Image
        src="/images/Ealixir.png"
        alt="ealixir"
        width={360}
        height={135}
        priority
        style={{ width: "min(22rem, 80vw)", height: "auto" }}
      />
    </div>
  );
}
