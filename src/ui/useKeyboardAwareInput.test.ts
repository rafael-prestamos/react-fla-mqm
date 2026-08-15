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

function setup(viewport: ReturnType<typeof createMockViewport> | undefined, activeElement: Element | null, contains = true) {
  const container = { contains: vi.fn(() => contains) } as unknown as HTMLElement;
  vi.stubGlobal("window", { innerHeight: 1000, visualViewport: viewport, setTimeout });
  vi.stubGlobal("document", { activeElement });
  return { current: container };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("useKeyboardAwareInput", () => {
  it("is a no-op when visualViewport is unavailable", () => {
    const ref = setup(undefined, null);
    expect(() => subscribeKeyboardAwareInput(ref)).not.toThrow();
  });

  it("scrolls the focused input when the keyboard opens", () => {
    vi.useFakeTimers();
    const viewport = createMockViewport(700);
    const scrollIntoView = vi.fn();
    const ref = setup(viewport, { tagName: "INPUT", scrollIntoView } as unknown as Element);
    subscribeKeyboardAwareInput(ref);

    viewport.fire("resize");
    vi.runAllTimers();

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
  });

  it("does not scroll while the keyboard is closed", () => {
    vi.useFakeTimers();
    const viewport = createMockViewport(800);
    const scrollIntoView = vi.fn();
    const ref = setup(viewport, { tagName: "INPUT", scrollIntoView } as unknown as Element);
    subscribeKeyboardAwareInput(ref);

    viewport.fire("resize");
    vi.runAllTimers();

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("removes its resize listener during cleanup", () => {
    const viewport = createMockViewport(700);
    const ref = setup(viewport, null);
    const cleanup = subscribeKeyboardAwareInput(ref);

    cleanup();

    expect(viewport.removeEventListener).toHaveBeenCalledWith("resize", expect.any(Function));
  });

  it("ignores the focused input when it is outside the container", () => {
    vi.useFakeTimers();
    const viewport = createMockViewport(700);
    const scrollIntoView = vi.fn();
    const ref = setup(viewport, { tagName: "INPUT", scrollIntoView } as unknown as Element, false);
    subscribeKeyboardAwareInput(ref);

    viewport.fire("resize");
    vi.runAllTimers();

    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
