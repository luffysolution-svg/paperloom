const GUID_PATTERN =
  /^\{?([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})\}?$/i;

/**
 * Convert an OOXML font key GUID to the byte sequence used to obfuscate an
 * embedded OpenType font. ECMA-376 applies the reversed 16-byte key to each
 * of the first two 16-byte blocks in the font file.
 */
export function embeddedFontKeyBytes(fontKey: string): Uint8Array {
  const match = GUID_PATTERN.exec(fontKey);
  if (!match) throw new Error(`Invalid embedded font key GUID: ${fontKey}`);
  const bytes = Uint8Array.from(
    match.slice(1).join("").match(/.{2}/g)!.map((pair) => Number.parseInt(pair, 16)),
  );
  return bytes.reverse();
}

/** Obfuscate or de-obfuscate an OOXML embedded font (the operation is XOR). */
export function obfuscateEmbeddedFont(
  fontBytes: Uint8Array,
  fontKey: string,
): Uint8Array {
  // Uint8Array#slice copies, but Node's Buffer subclass overrides it with a
  // shared-memory view. Uint8Array.from guarantees identical behavior in both
  // browser and Node runtimes and keeps the caller's font bytes immutable.
  const result = Uint8Array.from(fontBytes);
  const key = embeddedFontKeyBytes(fontKey);
  const byteCount = Math.min(32, result.length);
  for (let index = 0; index < byteCount; index += 1) {
    result[index] ^= key[index % key.length];
  }
  return result;
}
