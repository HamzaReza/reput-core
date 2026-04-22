"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function SplashPage() {
  const router = useRouter();
  const [fadeEalixir, setFadeEalixir] = useState(false);
  const [fadeReput, setFadeReput] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFadeEalixir(true), 2000);
    const t2 = setTimeout(() => setFadeReput(true), 2800);
    const t3 = setTimeout(() => router.replace("/lead"), 3800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [router]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#ffffff",
      }}
    >
      {/* ReputTrust logo — centered */}
      <div
        style={{
          opacity: fadeReput ? 0 : 1,
          transition: "opacity 0.8s ease",
        }}
      >
        <Image
          src="/images/logo-grey.png"
          alt="ReputTrust"
          width={280}
          height={80}
          priority
          style={{ objectFit: "contain" }}
        />
      </div>

      {/* Ealixir logo — pinned to bottom */}
      <div
        style={{
          position: "absolute",
          bottom: "2.5rem",
          opacity: fadeEalixir ? 0 : 1,
          transition: "opacity 0.8s ease",
        }}
      >
        <Image
          src="/images/Ealixir.png"
          alt="Ealixir"
          width={120}
          height={40}
          priority
          style={{ objectFit: "contain" }}
        />
      </div>
    </div>
  );
}
