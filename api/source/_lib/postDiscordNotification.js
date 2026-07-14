import { MessageComponentTypes, ButtonStyleTypes } from "discord-interactions";

// Plain fetch against Discord's REST API - no discord.js/gateway client,
// since this only ever sends one message via a bot token, never needs a
// persistent connection.
export async function postSourceRequestNotification({ requestId, name, email, purpose }) {
  const res = await fetch(`https://discord.com/api/v10/channels/${process.env.DISCORD_CHANNEL_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      embeds: [
        {
          title: "New source access request",
          color: 0x3987e5,
          fields: [
            { name: "Name", value: name },
            { name: "Email", value: email },
            { name: "Purpose", value: purpose },
          ],
        },
      ],
      components: [
        {
          type: MessageComponentTypes.ACTION_ROW,
          components: [
            {
              type: MessageComponentTypes.BUTTON,
              style: ButtonStyleTypes.SUCCESS,
              label: "Approve",
              custom_id: `approve_prompt:${requestId}`,
            },
            {
              type: MessageComponentTypes.BUTTON,
              style: ButtonStyleTypes.DANGER,
              label: "Deny",
              custom_id: `deny:${requestId}`,
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    // A failed notification shouldn't block the requester's submission -
    // the request is already safely written to Firestore either way.
    console.error(`Discord notification failed: ${res.status} ${await res.text()}`);
  }
}
