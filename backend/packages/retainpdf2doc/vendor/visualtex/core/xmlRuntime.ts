export interface VisualTexXmlRuntime {
  parse(xml: string): Document;
}

/** Browser/Tauri runtime. Access DOMParser lazily so importing core works in Node. */
export const browserXmlRuntime: VisualTexXmlRuntime = {
  parse(xml: string) {
    if (typeof DOMParser === "undefined") {
      throw new Error(
        "No XML runtime is available. Pass nodeXmlRuntime when running in Node.",
      );
    }
    return new DOMParser().parseFromString(xml, "application/xml");
  },
};
