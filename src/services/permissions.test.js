import { afterEach, describe, expect, it, vi } from "vitest";

const getDoc = vi.fn();
vi.mock("firebase/firestore", () => ({ doc: (...path) => path.slice(1).join("/"), getDoc: (...args) => getDoc(...args) }));
vi.mock("../firebase", () => ({ getFirebaseDb: () => ({}), getFirebaseAuth: () => ({}), isFirebaseConfigured: () => false }));

const { checkPermission } = await import("./permissions");

afterEach(() => getDoc.mockReset());

const contributor = { uid: "u1", email: "someone@example.org" };

describe("checkPermission", () => {
  it("grants what the contributor's permission doc grants", async () => {
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ app: true }) });
    await expect(checkPermission(contributor, "app")).resolves.toEqual({ allowed: true, failed: false });
    await expect(checkPermission(contributor, "debug")).resolves.toEqual({ allowed: false, failed: false });
  });

  it("denies a signed-out visitor without asking Firestore", async () => {
    await expect(checkPermission(null, "app")).resolves.toEqual({ allowed: false, failed: false });
    expect(getDoc).not.toHaveBeenCalled();
  });

  // A failed lookup used to leave the access gate blank forever.
  it("settles as a failed check when the lookup errors", async () => {
    getDoc.mockRejectedValue(new Error("Failed to get document because the client is offline."));
    await expect(checkPermission(contributor, "app")).resolves.toEqual({ allowed: false, failed: true });
  });
});
