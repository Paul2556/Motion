import fs from "node:fs";
import path from "node:path";
import { Timestamp } from "firebase-admin/firestore";
import JSZip from "jszip";
import { getAdminDb } from "./_lib/firebaseAdmin.js";
import { sendErrorPage } from "./_lib/errorPage.js";

const ARCHIVE_PATH = path.join(process.cwd(), "api", "source", "_archive", "base.zip");

class TokenError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length) return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress ?? null;
}

export default async function handler(req, res) {
  const token = req.query?.t;
  if (!token || typeof token !== "string") {
    sendErrorPage(res, 404);
    return;
  }

  const db = getAdminDb();
  const tokenRef = db.collection("sourceTokens").doc(token);
  const ip = clientIp(req);

  // Atomic check-and-increment, same runTransaction shape as
  // CloudSessionService.js's addDay: Firestore's optimistic concurrency
  // means two near-simultaneous downloads at maxDownloads-1 can't both pass
  // - whichever commits first wins, and the loser's transaction retries with
  // a fresh read, correctly seeing the incremented count and throwing.
  let tokenData;
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(tokenRef);
      if (!snap.exists) throw new TokenError("not_found");

      const data = snap.data();
      if (Date.now() > data.expiresAt.toMillis()) throw new TokenError("expired");

      const downloads = data.downloads ?? [];
      if (downloads.length >= data.maxDownloads) throw new TokenError("exhausted");

      tx.update(tokenRef, { downloads: [...downloads, { at: Timestamp.now(), ip }] });
      tokenData = data;
    });
  } catch (error) {
    if (error instanceof TokenError) {
      sendErrorPage(res, error.code === "not_found" ? 404 : 410);
      return;
    }
    throw error;
  }

  const buf = fs.readFileSync(ARCHIVE_PATH);
  const zip = await JSZip.loadAsync(buf);

  const issuedAt = new Date().toISOString();
  const watermarkLine = `\n\nDownload ID: ${token} — issued to ${tokenData.name}, ${issuedAt}`;

  const licenseEntry = zip.file("LICENSE") ?? zip.file("LICENSE.md");
  if (licenseEntry) {
    const originalText = await licenseEntry.async("string");
    zip.file(licenseEntry.name, originalText + watermarkLine);
  }

  zip.file(
    "DOWNLOAD_RECEIPT.txt",
    `Download ID: ${token} — issued to ${tokenData.name}, ${issuedAt}\n\n` +
      "This copy is licensed to the named recipient under MAL v1.3. " +
      "Redistribution of source is prohibited (MAL §3, §8.1.1)."
  );

  const out = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", 'attachment; filename="motion-source.zip"');
  res.status(200).send(out);
}
