// Trimmed copy of api/source/_lib/postDiscordNotification.js without the approve/deny buttons -
// feedback is a one-way note, there's no admin workflow attached to it.
export async function postFeedbackNotification({ message, email }) {
  const channelId = process.env.DISCORD_FEEDBACK_CHANNEL_ID || process.env.DISCORD_CHANNEL_ID;

  const fields = [{ name: "Message", value: message }];
  if (email) fields.push({ name: "Email", value: email });

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
          fields,
        },
      ],
    }),
  });

  if (!res.ok) {
    // A failed notification shouldn't fail the submission for the sender - log and move on.
    console.error(`Discord notification failed: ${res.status} ${await res.text()}`);
  }
}
