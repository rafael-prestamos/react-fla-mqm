/** Patrón: Keyboard-aware scroll — Sprint 6a-7 */
import { useEffect, type RefObject } from "react";

type ScrollableContainer = HTMLElement | null;

function isFormControl(element: Element): element is HTMLElement {
  return ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName);
}

export function subscribeKeyboardAwareInput(containerRef: RefObject<ScrollableContainer>): () => void {
  if (typeof window === "undefined" || !window.visualViewport) return () => {};

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
  return () => viewport.removeEventListener("resize", handleResize);
}

export function useKeyboardAwareInput(containerRef: RefObject<ScrollableContainer>): void {
  useEffect(() => subscribeKeyboardAwareInput(containerRef), [containerRef]);
}
