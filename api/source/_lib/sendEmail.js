// Plain fetch against Resend's REST API rather than adding their SDK - one
// HTTP call is all this needs, same reasoning build-source-archive.js
// already used for the GitHub API instead of @octokit.
export async function sendEmail({ to, subject, html }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Motion <hello@motionmun.com>",
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend API returned ${res.status}: ${await res.text()}`);
  }
}
