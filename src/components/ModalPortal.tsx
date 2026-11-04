"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Contador global de modales activos para gestionar el scroll lock de forma segura
let activeModalCount = 0;
let originalOverflowStyle = "";

export default function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (activeModalCount === 0) {
      originalOverflowStyle = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    activeModalCount++;

    return () => {
      activeModalCount = Math.max(0, activeModalCount - 1);
      if (activeModalCount === 0) {
        document.body.style.overflow = originalOverflowStyle;
      }
    };
  }, []);

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(children, document.body);
}
