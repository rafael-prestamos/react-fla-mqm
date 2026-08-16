import { afterEach, describe, expect, it, vi } from "vitest";
import { subscribeKeyboardAwareInput } from "./useKeyboardAwareInput";

function createMockViewport(height: number) {
  const listeners: Record<string, Array<() => void>> = {};
  return {
    height,
    addEventListener: vi.fn((event: string, listener: () => void) => {
      (listeners[event] ??= []).push(listener);
    }),
    removeEventListener: vi.fn((event: string, listener: () => void) => {
      listeners[event] = (listeners[event] ?? []).filter((current) => current !== listener);
    }),
    fire(event: string) {
      listeners[event]?.forEach((listener) => listener());
    },
  };
}

function createMockDocument(activeElement: Element | null) {
  const listeners: Record<string, Array<(e: FocusEvent) => void>> = {};
  return {
    activeElement,
    addEventListener: vi.fn((event: string, listener: (e: FocusEvent) => void) => {
      (listeners[event] ??= []).push(listener);
    }),
    removeEventListener: vi.fn((event: string, listener: (e: FocusEvent) => void) => {
      listeners[event] = (listeners[event] ?? []).filter((current) => current !== listener);
    }),
    fire(event: string, e: FocusEvent) {
      listeners[event]?.forEach((listener) => listener(e));
    },
  };
}

function setup(viewport: ReturnType<typeof createMockViewport> | undefined, activeElement: Element | null, contains = true) {
  const container = { contains: vi.fn(() => contains) } as unknown as HTMLElement;
  const mockDocument = createMockDocument(activeElement);
  vi.stubGlobal("window", { innerHeight: 1000, visualViewport: viewport, setTimeout });
  vi.stubGlobal("document", mockDocument);
  return { containerRef: { current: container }, mockDocument };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("useKeyboardAwareInput", () => {
  it("is a no-op when visualViewport is unavailable", () => {
    const { containerRef } = setup(undefined, null);
    expect(() => subscribeKeyboardAwareInput(containerRef)).not.toThrow();
  });

  it("scrolls the focused input when the keyboard opens (visualViewport strategy)", () => {
    vi.useFakeTimers();
    const viewport = createMockViewport(700);
    const scrollIntoView = vi.fn();
    const { containerRef } = setup(viewport, { tagName: "INPUT", scrollIntoView } as unknown as Element);
    subscribeKeyboardAwareInput(containerRef);

    viewport.fire("resize");
    vi.runAllTimers();

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
  });

  it("does not scroll while the keyboard is closed", () => {
    vi.useFakeTimers();
    const viewport = createMockViewport(800);
    const scrollIntoView = vi.fn();
    const { containerRef } = setup(viewport, { tagName: "INPUT", scrollIntoView } as unknown as Element);
    subscribeKeyboardAwareInput(containerRef);

    viewport.fire("resize");
    vi.runAllTimers();

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("removes its resize listener during cleanup", () => {
    const viewport = createMockViewport(700);
    const { containerRef } = setup(viewport, null);
    const cleanup = subscribeKeyboardAwareInput(containerRef);

    cleanup();

    expect(viewport.removeEventListener).toHaveBeenCalledWith("resize", expect.any(Function));
  });

  it("ignores the focused input when it is outside the container", () => {
    vi.useFakeTimers();
    const viewport = createMockViewport(700);
    const scrollIntoView = vi.fn();
    const { containerRef } = setup(viewport, { tagName: "INPUT", scrollIntoView } as unknown as Element, false);
    subscribeKeyboardAwareInput(containerRef);

    viewport.fire("resize");
    vi.runAllTimers();

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  // Sprint 6a-8c: tests del fallback focusin (MIUI/Xiaomi)
  it("scrolls via focusin fallback when target is inside the container", () => {
    vi.useFakeTimers();
    const viewport = createMockViewport(700);
    const scrollIntoView = vi.fn();
    const input = { tagName: "INPUT", scrollIntoView } as unknown as HTMLElement;
    const { containerRef, mockDocument } = setup(viewport, input);
    containerRef.current = { contains: vi.fn(() => true) } as unknown as HTMLElement;
    subscribeKeyboardAwareInput(containerRef);

    // Disparar focusin con el input como target
    mockDocument.fire("focusin", { target: input } as unknown as FocusEvent);
    vi.runAllTimers();

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
  });

  it("focusin fallback does NOT scroll when target is outside the container", () => {
    vi.useFakeTimers();
    const viewport = createMockViewport(700);
    const scrollIntoView = vi.fn();
    const input = { tagName: "INPUT", scrollIntoView } as unknown as HTMLElement;
    // contains = false → target fuera del contenedor
    const { containerRef, mockDocument } = setup(viewport, input, false);
    subscribeKeyboardAwareInput(containerRef);

    mockDocument.fire("focusin", { target: input } as unknown as FocusEvent);
    vi.runAllTimers();

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("removes focusin listener during cleanup", () => {
    const viewport = createMockViewport(700);
    const { containerRef, mockDocument } = setup(viewport, null);
    const cleanup = subscribeKeyboardAwareInput(containerRef);

    cleanup();

    expect(mockDocument.removeEventListener).toHaveBeenCalledWith("focusin", expect.any(Function));
  });
});
