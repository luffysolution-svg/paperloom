import { createHash } from "node:crypto";

/** Produce a stable UUID-shaped font key from the font bytes. */
export function deterministicEmbeddedFontKey(fontBytes: Uint8Array) {
  const bytes = createHash("sha256").update(fontBytes).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex").toUpperCase();
  return `{${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}}`;
}
