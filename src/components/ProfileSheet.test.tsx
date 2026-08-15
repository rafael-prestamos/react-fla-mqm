import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { APP_VERSION } from "../config/version";
import { confirmSignOut, ProfileSheet } from "./ProfileSheet";

const syncState: { status: "synced" | "offline"; lastSyncAt: string | null } = { status: "synced", lastSyncAt: null };
const signOut = vi.fn<() => Promise<void>>().mockResolvedValue();

vi.mock("../sync/SyncEngine", () => ({ useSync: () => syncState }));
vi.mock("../auth/SessionContext", () => ({ useSession: () => ({ signOut }) }));

function renderProfile() {
  return renderToStaticMarkup(<ProfileSheet open onClose={() => {}} onOpenSettings={() => {}} />);
}

describe("ProfileSheet", () => {
  beforeEach(() => {
    syncState.status = "synced";
    syncState.lastSyncAt = null;
    signOut.mockClear();
  });

  it("renders Fla, the app version and the online state", () => {
    const markup = renderProfile();
    expect(markup).toContain("Fla");
    expect(markup).toContain(`Versión ${APP_VERSION}`);
    expect(markup).toContain("En línea");
    expect(renderToStaticMarkup(<ProfileSheet open={false} onClose={() => {}} onOpenSettings={() => {}} />)).toBe("");
  });

  it("renders the offline state", () => {
    syncState.status = "offline";
    expect(renderProfile()).toContain("Sin conexión");
  });

  it("only invokes logout after explicit confirmation", () => {
    confirmSignOut(() => false, signOut);
    expect(signOut).not.toHaveBeenCalled();
    confirmSignOut(() => true, signOut);
    expect(signOut).toHaveBeenCalledOnce();
  });
});
