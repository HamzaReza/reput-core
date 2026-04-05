"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem("reput_splash_shown")) return;
      localStorage.setItem("reput_splash_shown", "1");
    } catch {
      return;
    }
    setShow(true);
  }, []);

  if (!show) return null;

  return (
    <>
      <style>{`
        @keyframes splashFade {
          0%   { opacity: 1; }
          75%  { opacity: 1; }
          100% { opacity: 0; }
        }
        .splash-overlay {
          animation: splashFade 4s ease forwards;
        }
      `}</style>
      <div
        className="splash-overlay"
        onAnimationEnd={() => setShow(false)}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          backgroundColor: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <Image
          src="/images/Ealixir.png"
          alt="Ealixir"
          width={400}
          height={160}
          style={{ width: "min(34rem, 80vw)", height: "auto" }}
          priority
        />
      </div>
    </>
  );
}
