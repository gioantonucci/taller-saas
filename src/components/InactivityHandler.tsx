"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// 30 minutos de inactividad
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

export default function InactivityHandler() {
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleLogout = async () => {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login?inactivity=1");
      } catch (err) {
        console.error("Error en auto-cierre de sesión:", err);
      }
    };

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(handleLogout, INACTIVITY_TIMEOUT_MS);
    };

    // Eventos que resetean la inactividad
    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, resetTimer));

    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [router]);

  return null;
}
