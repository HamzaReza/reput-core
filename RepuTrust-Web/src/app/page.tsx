"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    let destination = "/login";
    try {
      if (localStorage.getItem("reput_authed") === "true") destination = "/dashboard";
    } catch {}

    const timer = setTimeout(() => router.replace(destination), 3200);
    return () => clearTimeout(timer);
  }, [router]);

  return null;
}
