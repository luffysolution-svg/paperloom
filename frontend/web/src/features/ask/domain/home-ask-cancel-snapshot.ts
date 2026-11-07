import { getConversation } from "@/platform/api/index.js";
import { nodesFromDetail } from "./home-ask-message-mapping.js";

/** Wait for Rust to persist the stopped turn before replacing the local partial. */
export async function waitForStoppedMessage(conversationId: string, assistantId: string) {
  for (let attempt = 0; attempt < 15; attempt++) {
    try {
      const detail = await getConversation(conversationId);
      const record = detail.messages.find((message) => message.message_id === assistantId);
      if (record && record.finish_reason !== "running") {
        return nodesFromDetail(detail).nodes.find((message) => message.id === assistantId) || null;
      }
    } catch { break; }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return null;
}
