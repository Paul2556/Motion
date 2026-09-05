import { cert, initializeApp } from "firebase-admin/app";

// Runs as part of `vercel-build`, before `vite build`. Preview deployments
// get a stable per-branch alias (VERCEL_BRANCH_URL) that Vercel posts to
// GitHub PRs, but Firebase Auth rejects sign-in from any domain not in its
// authorizedDomains allowlist - without this, OwnerGate's sign-in (which
// gates every non-local hostname, per SEC-010) is unusable on previews.
// Best-effort and non-blocking: any failure here must never fail the build,
// since the static site itself doesn't depend on it. Own copy of the
// credential-loading snippet rather than importing api/admin/_lib, same
// self-containment reasoning as that file already documents.
async function main() {
  if (process.env.VERCEL_ENV !== "preview") return;

  const branchDomain = process.env.VERCEL_BRANCH_URL;
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (!branchDomain || !encoded) {
    console.warn("[registerPreviewDomain] Skipping: VERCEL_BRANCH_URL or FIREBASE_SERVICE_ACCOUNT_B64 not set.");
    return;
  }

  const serviceAccount = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
  const app = initializeApp({ credential: cert(serviceAccount) });
  const { access_token: accessToken } = await app.options.credential.getAccessToken();

  // The Admin SDK's projectConfigManager() doesn't expose authorizedDomains
  // (verified against firebase-admin 14.1.0) - it's only reachable via the
  // raw Identity Toolkit Admin API.
  const configUrl = `https://identitytoolkit.googleapis.com/admin/v2/projects/${serviceAccount.project_id}/config`;
  const getRes = await fetch(configUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!getRes.ok) throw new Error(`Fetching Firebase auth config failed: ${getRes.status} ${await getRes.text()}`);
  const current = await getRes.json();

  const domains = new Set(current.authorizedDomains ?? []);
  if (domains.has(branchDomain)) {
    console.log(`[registerPreviewDomain] ${branchDomain} already authorized.`);
    return;
  }
  domains.add(branchDomain);

  const patchRes = await fetch(`${configUrl}?updateMask=authorizedDomains`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ authorizedDomains: [...domains] }),
  });
  if (!patchRes.ok) throw new Error(`Updating Firebase auth config failed: ${patchRes.status} ${await patchRes.text()}`);
  console.log(`[registerPreviewDomain] Authorized ${branchDomain}.`);
}

main().catch((err) => {
  console.warn("[registerPreviewDomain] Non-fatal error, continuing build:", err.message);
});
