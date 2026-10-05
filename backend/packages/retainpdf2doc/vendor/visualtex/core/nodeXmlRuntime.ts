import { DOMParser } from "@xmldom/xmldom";
import type { VisualTexXmlRuntime } from "./xmlRuntime.ts";

/** Node runtime used by the CLI and server-side document conversion. */
export const nodeXmlRuntime: VisualTexXmlRuntime = {
  parse(xml: string) {
    return new DOMParser().parseFromString(
      xml,
      "application/xml",
    ) as unknown as Document;
  },
};
