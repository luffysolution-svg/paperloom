export const OOXML_NAMESPACES = {
  contentTypes: "http://schemas.openxmlformats.org/package/2006/content-types",
  coreProperties: "http://schemas.openxmlformats.org/package/2006/metadata/core-properties",
  dc: "http://purl.org/dc/elements/1.1/",
  extendedProperties: "http://schemas.openxmlformats.org/officeDocument/2006/extended-properties",
  math: "http://schemas.openxmlformats.org/officeDocument/2006/math",
  relationships: "http://schemas.openxmlformats.org/package/2006/relationships",
  relationshipAttributes: "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
  word: "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
} as const;

const OFFICE_RELATIONSHIP_BASE =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PACKAGE_RELATIONSHIP_BASE =
  "http://schemas.openxmlformats.org/package/2006/relationships";

export const RELATIONSHIP_TYPES = {
  appProperties: `${OFFICE_RELATIONSHIP_BASE}/extended-properties`,
  coreProperties: `${PACKAGE_RELATIONSHIP_BASE}/metadata/core-properties`,
  document: `${OFFICE_RELATIONSHIP_BASE}/officeDocument`,
  font: `${OFFICE_RELATIONSHIP_BASE}/font`,
  fontTable: `${OFFICE_RELATIONSHIP_BASE}/fontTable`,
  footer: `${OFFICE_RELATIONSHIP_BASE}/footer`,
  header: `${OFFICE_RELATIONSHIP_BASE}/header`,
  image: `${OFFICE_RELATIONSHIP_BASE}/image`,
  numbering: `${OFFICE_RELATIONSHIP_BASE}/numbering`,
  settings: `${OFFICE_RELATIONSHIP_BASE}/settings`,
  styles: `${OFFICE_RELATIONSHIP_BASE}/styles`,
} as const;

export const CONTENT_TYPES = {
  appProperties: "application/vnd.openxmlformats-officedocument.extended-properties+xml",
  coreProperties: "application/vnd.openxmlformats-package.core-properties+xml",
  document: "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml",
  fontTable: "application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml",
  footer: "application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml",
  header: "application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml",
  numbering: "application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml",
  obfuscatedFont: "application/vnd.openxmlformats-officedocument.obfuscatedFont",
  relationships: "application/vnd.openxmlformats-package.relationships+xml",
  settings: "application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml",
  styles: "application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml",
  xml: "application/xml",
} as const;
