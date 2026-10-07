"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** מרענן את הדף מדי כמה שניות (למשל בזמן שהניתוח עדיין רץ) */
export default function AutoRefresh({ seconds = 8 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}
