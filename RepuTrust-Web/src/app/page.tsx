"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function SplashPage() {
  const router = useRouter();
  const [fading, setFading] = useState(false);

  useEffect(() => {
    let destination = "/login";
    try {
      if (localStorage.getItem("reput_authed") === "true") destination = "/dashboard";
    } catch {}

    const fadeTimer = setTimeout(() => setFading(true), 2400);
    const navTimer = setTimeout(() => router.replace(destination), 3200);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(navTimer);
    };
  }, [router]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#ffffff",
        opacity: fading ? 0 : 1,
        transition: "opacity 0.8s ease",
      }}
    >
      <Image
        src="/images/Ealixir.png"
        alt="Ealixir"
        width={300}
        height={150}
        priority
        style={{ objectFit: "contain" }}
      />
    </div>
  );
}
