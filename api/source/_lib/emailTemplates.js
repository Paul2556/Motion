// Verbatim signature, same "don't alter" treatment as the MAL license text
// and the /source page's legally-deliberate copy elsewhere in this codebase.
const SIGNATURE = `Best regards,<br>
Paul Taechaaukarakul<br>
Founder of Motion`;

const GSIGNATURE = `Best regards,<br>
The Motion Team<br>
From Motion To Resolution`;


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

export function waitlistWelcomeEmail() {
  return {
    subject: "Thanks for joining the Motion waitlist",
    html: `<p>Hi,</p>
<p>Thanks for joining the Motion waitlist. While you wait for full access, you can try a live demo right now, no sign-up needed:</p>
<p><a href="https://demo.motionmun.com">https://demo.motionmun.com</a></p>
<p>${GSIGNATURE}</p>`,
  };
}
