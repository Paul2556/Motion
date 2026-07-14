import { isAdminAuthorized } from "./_lib/requireAdmin.js";
import { approveRequest, RequestNotFoundError } from "./_lib/approveRequest.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }
  if (!isAdminAuthorized(req)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const { requestId } = req.body ?? {};
  if (!requestId) {
    res.status(400).json({ error: "request_id_required" });
    return;
  }

  try {
    const { downloadUrl } = await approveRequest(requestId);
    res.status(200).json({ downloadUrl });
  } catch (error) {
    if (error instanceof RequestNotFoundError) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    throw error;
  }
}
