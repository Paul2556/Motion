// Verbatim signature, same "don't alter" treatment as the MAL license text
// and the /source page's legally-deliberate copy elsewhere in this codebase.
const SIGNATURE = `Best regards,<br>
Paul Taechaaukarakul<br>
Founder of Motion`;

// name/note reach here from the public request form (name) and an admin's
// Discord modal (note) - neither is trusted, so both are escaped before
// interpolation into HTML rather than sent verbatim.
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

export function approvalEmail({ name, downloadUrl, note }) {
  const safeName = escapeHtml(name);
  const noteBlock = note ? `<p>${escapeHtml(note)}</p>` : "";
  return {
    subject: "Your Motion source access request was approved",
    html: `<p>Hi ${safeName},</p>
<p>Your request for Motion's source code has been approved. You can download it here:</p>
<p><a href="${downloadUrl}">${downloadUrl}</a></p>
<p>This link expires in 72 hours and allows up to 3 downloads.</p>
${noteBlock}
<p>${SIGNATURE}</p>`,
  };
}

export function denialEmail({ name }) {
  return {
    subject: "Your Motion source access request",
    html: `<p>Hi ${escapeHtml(name)},</p>
<p>Thanks for your interest in Motion's source code. I'm not able to grant access for this request.</p>
<p>${SIGNATURE}</p>`,
  };
}
