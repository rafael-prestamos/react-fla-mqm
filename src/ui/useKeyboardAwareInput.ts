/** Patrón: Keyboard-aware scroll — Sprint 6a-7, fallback MIUI Sprint 6a-8c */
import { useEffect, type RefObject } from "react";

type ScrollableContainer = HTMLElement | null;

function isFormControl(element: Element): element is HTMLElement {
  return ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName);
}

export function subscribeKeyboardAwareInput(containerRef: RefObject<ScrollableContainer>): () => void {
  const cleanups: (() => void)[] = [];

  // Estrategia 1: visualViewport resize (funciona en Chrome, Samsung, etc.)
  if (typeof window !== "undefined" && window.visualViewport) {
    const viewport = window.visualViewport;
    const handleResize = () => {
      if (viewport.height >= window.innerHeight * 0.75) return;

      window.setTimeout(() => {
        const container = containerRef.current;
        const activeElement = document.activeElement;
        if (!container || !activeElement || !isFormControl(activeElement) || !container.contains(activeElement)) return;

        activeElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    };
    viewport.addEventListener("resize", handleResize);
    cleanups.push(() => viewport.removeEventListener("resize", handleResize));
  }

  // Estrategia 2: focusin fallback (cubre MIUI/Xiaomi que no dispara visualViewport.resize correctamente)
  if (typeof window !== "undefined") {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target;
      // Patrón: defensive guard — evitar instanceof Element (no disponible en entornos sin jsdom)
      if (!target || typeof (target as Element).tagName !== "string") return;
      if (!isFormControl(target as Element)) return;
      const container = containerRef.current;
      if (!container || !container.contains(target as Node)) return;
      // Esperar a que el teclado abra y el layout se estabilice
      window.setTimeout(() => {
        (target as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    };
    document.addEventListener("focusin", handleFocusIn);
    cleanups.push(() => document.removeEventListener("focusin", handleFocusIn));
  }

  return () => cleanups.forEach(fn => fn());
}

export function useKeyboardAwareInput(containerRef: RefObject<ScrollableContainer>): void {
  useEffect(() => subscribeKeyboardAwareInput(containerRef), [containerRef]);
}
