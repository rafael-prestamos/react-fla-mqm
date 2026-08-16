import { describe, it, expect, afterEach, vi } from "vitest";
import { isPushSubscribed } from "./pushSubscription";

describe("pushSubscription", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("isPushSubscribed devuelve false cuando PushManager no existe", async () => {
    vi.stubGlobal("navigator", {});
    vi.stubGlobal("window", {});
    expect(await isPushSubscribed()).toBe(false);
  });

  it("subscribeToPush devuelve false sin VAPID key configurada", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_VAPID_PUBLIC_KEY", "");
    const { subscribeToPush } = await import("./pushSubscription");
    expect(await subscribeToPush()).toBe(false);
  });
});
