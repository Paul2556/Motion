import {
  verifyKey,
  InteractionType,
  InteractionResponseType,
  MessageComponentTypes,
  TextStyleTypes,
} from "discord-interactions";
import { approveRequest, RequestNotFoundError as ApproveNotFoundError } from "../source/_lib/approveRequest.js";
import { denyRequest, RequestNotFoundError as DenyNotFoundError } from "../source/_lib/denyRequest.js";

// Discord signs the exact raw bytes it sent - Vercel's default JSON body
// parsing re-serializes the body, which won't byte-match what was signed,
// so parsing is disabled here and the raw body is read and verified first.
export const config = {
  api: { bodyParser: false },
};

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

const NOTE_ACTION_ROW = {
  type: MessageComponentTypes.ACTION_ROW,
  components: [
    {
      type: MessageComponentTypes.INPUT_TEXT,
      custom_id: "note",
      label: "Personal note (optional)",
      style: TextStyleTypes.PARAGRAPH,
      required: false,
      max_length: 500,
    },
  ],
};

export default async function handler(req, res) {
  const rawBody = await readRawBody(req);
  const signature = req.headers["x-signature-ed25519"];
  const timestamp = req.headers["x-signature-timestamp"];

  const isValid =
    typeof signature === "string" &&
    typeof timestamp === "string" &&
    (await verifyKey(rawBody, signature, timestamp, process.env.DISCORD_PUBLIC_KEY));

  if (!isValid) {
    res.status(401).end("invalid signature");
    return;
  }

  const interaction = JSON.parse(rawBody.toString("utf8"));

  if (interaction.type === InteractionType.PING) {
    res.status(200).json({ type: InteractionResponseType.PONG });
    return;
  }

  if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
    const customId = interaction.data.custom_id;

    if (customId.startsWith("approve_prompt:")) {
      const requestId = customId.slice("approve_prompt:".length);
      res.status(200).json({
        type: InteractionResponseType.MODAL,
        data: {
          custom_id: `approve_submit:${requestId}`,
          title: "Approve source access",
          components: [NOTE_ACTION_ROW],
        },
      });
      return;
    }

    if (customId.startsWith("deny:")) {
      const requestId = customId.slice("deny:".length);
      try {
        await denyRequest(requestId);
        res.status(200).json({
          type: InteractionResponseType.UPDATE_MESSAGE,
          data: { content: "❌ Denied", embeds: [], components: [] },
        });
      } catch (error) {
        if (error instanceof DenyNotFoundError) {
          res.status(200).json({
            type: InteractionResponseType.UPDATE_MESSAGE,
            data: { content: "⚠️ Request no longer exists", embeds: [], components: [] },
          });
          return;
        }
        throw error;
      }
      return;
    }
  }

  if (interaction.type === InteractionType.MODAL_SUBMIT) {
    const customId = interaction.data.custom_id;

    if (customId.startsWith("approve_submit:")) {
      const requestId = customId.slice("approve_submit:".length);
      const note = interaction.data.components?.[0]?.components?.[0]?.value || undefined;

      try {
        await approveRequest(requestId, { note });
        res.status(200).json({
          type: InteractionResponseType.UPDATE_MESSAGE,
          data: { content: "✅ Approved", embeds: [], components: [] },
        });
      } catch (error) {
        if (error instanceof ApproveNotFoundError) {
          res.status(200).json({
            type: InteractionResponseType.UPDATE_MESSAGE,
            data: { content: "⚠️ Request no longer exists", embeds: [], components: [] },
          });
          return;
        }
        throw error;
      }
      return;
    }
  }

  res.status(400).end("unhandled interaction");
}
