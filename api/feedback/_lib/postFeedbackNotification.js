// Trimmed copy of api/source/_lib/postDiscordNotification.js without the approve/deny buttons -
// feedback is a one-way note, there's no admin workflow attached to it.
// The message goes in the description (4096-char limit), not a field (1024),
// or longer feedback would be rejected by Discord and silently lost.
export async function postFeedbackNotification({ message, email }) {
  const channelId = process.env.DISCORD_FEEDBACK_CHANNEL_ID || process.env.DISCORD_CHANNEL_ID;

  const fields = email ? [{ name: "Email", value: email }] : [];

  // A failed notification shouldn't fail the submission for the sender - log and move on.
  try {
    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        embeds: [
          {
            title: "New feedback",
            color: 0x3987e5,
            description: message,
            fields,
          },
        ],
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.error(`Discord notification failed: ${res.status} ${await res.text()}`);
    }
  } catch (error) {
    console.error("Discord notification failed:", error);
  }
}
