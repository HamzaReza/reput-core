"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SplashPage() {
  const router = useRouter();
  const [fade, setFade] = useState(false);

  useEffect(() => {
    let destination = "/login";
    try {
      if (localStorage.getItem("reput_token")) destination = "/dashboard";
    } catch {}

    const t1 = setTimeout(() => setFade(true), 2400);
    const t2 = setTimeout(() => router.replace(destination), 3400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
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
      }}
    >
      <div
        style={{
          opacity: fade ? 0 : 1,
          transition: "opacity 0.8s ease",
          pointerEvents: fade ? "none" : "all",
        }}
      >
        <Image
          src="/images/Ealixir.png"
          alt="Ealixir"
          width={200}
          height={70}
          priority
          style={{ objectFit: "contain" }}
        />
      </div>
    </div>
  );
}
