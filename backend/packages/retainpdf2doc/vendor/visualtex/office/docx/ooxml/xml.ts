export interface RawXml {
  readonly kind: "raw-xml";
  readonly value: string;
}

export type XmlChild = string | number | RawXml | null | undefined | false;
export type XmlAttributes = Record<string, string | number | boolean | null | undefined>;

export const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

export function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function rawXml(value: string): RawXml {
  return { kind: "raw-xml", value };
}

function childXml(child: XmlChild) {
  if (child === null || child === undefined || child === false) return "";
  if (typeof child === "object") return child.value;
  return escapeXml(String(child));
}

export function xml(name: string, attributes: XmlAttributes = {}, children: XmlChild[] = []) {
  const serializedAttributes = Object.entries(attributes)
    .filter(([, value]) => value !== null && value !== undefined && value !== false)
    .map(([key, value]) => ` ${key}="${escapeXml(String(value))}"`)
    .join("");
  if (children.length === 0) return `<${name}${serializedAttributes}/>`;
  return `<${name}${serializedAttributes}>${children.map(childXml).join("")}</${name}>`;
}

export function xmlDocument(root: string) {
  return `${XML_DECLARATION}${root}`;
}
