// Plain fetch against Resend's REST API rather than adding their SDK - one
// HTTP call is all this needs.
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

// Resend's batch endpoint, for announcement sends - one HTTP call per up to
// 100 recipients instead of one per recipient. `messages` items omit `from`,
// filled in here so every batch send comes from the same address as sendEmail.
export async function sendEmailBatch(messages) {
  const res = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages.map((m) => ({ from: "Motion <hello@motionmun.com>", ...m }))),
  });

  if (!res.ok) {
    throw new Error(`Resend batch API returned ${res.status}: ${await res.text()}`);
  }
}
