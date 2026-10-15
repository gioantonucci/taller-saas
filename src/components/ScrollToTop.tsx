"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Componente global de restauración de scroll:
 * Garantiza que al navegar a cualquier vista o cambiar de ruta/parámetros,
 * el usuario empiece siempre en la parte superior (top scroll: 0, 0).
 */
export default function ScrollToTop() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Si la navegación incluye un ancla / hash (ej. /#servicios),
    // desplazamos suavemente hacia la sección y evitamos forzar (0, 0).
    if (typeof window !== "undefined" && window.location.hash) {
      const targetId = decodeURIComponent(window.location.hash.replace("#", ""));
      const scrollToSection = () => {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      };

      const t0 = setTimeout(scrollToSection, 20);
      const t1 = setTimeout(scrollToSection, 120);
      return () => {
        clearTimeout(t0);
        clearTimeout(t1);
      };
    }

    // 1. Desactivar la restauración de scroll automática del navegador para que no retenga el offset previo
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      try {
        window.history.scrollRestoration = "manual";
      } catch {}
    }

    const resetScroll = () => {
      // Scroll en window y document
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      if (document.documentElement) {
        document.documentElement.scrollTop = 0;
      }
      if (document.body) {
        document.body.scrollTop = 0;
      }

      // Resetear scroll de cualquier contenedor <main> o elementos con scroll
      const mainEl = document.querySelector("main");
      if (mainEl) {
        mainEl.scrollTop = 0;
      }
    };

    // Reset inmediato síncrono
    resetScroll();

    // Reset en el siguiente frame de renderizado del navegador
    const rafId = requestAnimationFrame(resetScroll);

    // Resets diferidos para páginas que cargan datos asíncronos y reajustan su altura dinámica
    const t1 = setTimeout(resetScroll, 60);
    const t2 = setTimeout(resetScroll, 180);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [pathname, searchParams]);

  return null;
}
