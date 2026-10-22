import { afterEach, describe, expect, it, vi } from "vitest";

const setDoc = vi.fn();
vi.mock("firebase/firestore", () => ({
  doc: (...path) => path.slice(1).join("/"),
  setDoc: (...args) => setDoc(...args),
  onSnapshot: vi.fn(),
  serverTimestamp: () => "server-time",
}));
vi.mock("../firebase", () => ({ getFirebaseDb: () => ({}) }));

const { default: LiveSessionService } = await import("./LiveSessionService");

afterEach(() => {
  setDoc.mockReset();
  vi.restoreAllMocks();
});

describe("LiveSessionService.publish", () => {
  it("writes the patch to the session's live doc", async () => {
    setDoc.mockResolvedValue();
    await expect(LiveSessionService.publish("abc", { activeMotionLabel: "Moderated Caucus" })).resolves.toBe(true);
    expect(setDoc).toHaveBeenCalledWith(
      "sessions/abc/live/state",
      { activeMotionLabel: "Moderated Caucus", updatedAt: "server-time" },
      { merge: true }
    );
  });

  // Broadcasting is best-effort: a dropped write must never surface as an unhandled rejection mid-session.
  it("reports a failed write instead of throwing", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    setDoc.mockRejectedValue(new Error("Missing or insufficient permissions."));
    await expect(LiveSessionService.publish("abc", { queue: [] })).resolves.toBe(false);

    setDoc.mockImplementation(() => {
      throw new Error("Unsupported field value: undefined");
    });
    await expect(LiveSessionService.publish("abc", { queue: [] })).resolves.toBe(false);
  });
});
