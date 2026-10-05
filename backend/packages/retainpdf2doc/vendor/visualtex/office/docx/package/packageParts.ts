import { strToU8, zipSync } from "fflate";
import type { EmbeddedFontPart } from "../fonts/fontEmbedding.ts";
import { buildNumberingXml } from "../content/numbering.ts";
import {
  CONTENT_TYPES,
  OOXML_NAMESPACES,
  RELATIONSHIP_TYPES,
} from "../ooxml/schema.ts";
import { buildStylesXml } from "../content/styles.ts";
import type { DocxTheme } from "../config/index.ts";
import type { DocxMetadata } from "../model/types.ts";
import { rawXml, xml, xmlDocument } from "../ooxml/xml.ts";

interface RelationshipDefinition {
  id: string;
  type: string;
  target: string;
}

interface ContentTypeDefault {
  extension: string;
  contentType: string;
}

interface ContentTypeOverride {
  partName: string;
  contentType: string;
}

const ROOT_RELATIONSHIPS: RelationshipDefinition[] = [
  { id: "rId1", type: RELATIONSHIP_TYPES.document, target: "word/document.xml" },
  { id: "rId2", type: RELATIONSHIP_TYPES.coreProperties, target: "docProps/core.xml" },
  { id: "rId3", type: RELATIONSHIP_TYPES.appProperties, target: "docProps/app.xml" },
];

const DOCUMENT_RELATIONSHIPS: RelationshipDefinition[] = [
  { id: "rId1", type: RELATIONSHIP_TYPES.styles, target: "styles.xml" },
  { id: "rId2", type: RELATIONSHIP_TYPES.numbering, target: "numbering.xml" },
  { id: "rId3", type: RELATIONSHIP_TYPES.header, target: "header1.xml" },
  { id: "rId4", type: RELATIONSHIP_TYPES.footer, target: "footer1.xml" },
  { id: "rId5", type: RELATIONSHIP_TYPES.settings, target: "settings.xml" },
];

const CONTENT_TYPE_DEFAULTS: ContentTypeDefault[] = [
  { extension: "rels", contentType: CONTENT_TYPES.relationships },
  { extension: "xml", contentType: CONTENT_TYPES.xml },
];

const CONTENT_TYPE_OVERRIDES: ContentTypeOverride[] = [
  { partName: "/word/document.xml", contentType: CONTENT_TYPES.document },
  { partName: "/word/styles.xml", contentType: CONTENT_TYPES.styles },
  { partName: "/word/numbering.xml", contentType: CONTENT_TYPES.numbering },
  { partName: "/word/settings.xml", contentType: CONTENT_TYPES.settings },
  { partName: "/word/header1.xml", contentType: CONTENT_TYPES.header },
  { partName: "/word/footer1.xml", contentType: CONTENT_TYPES.footer },
  { partName: "/docProps/core.xml", contentType: CONTENT_TYPES.coreProperties },
  { partName: "/docProps/app.xml", contentType: CONTENT_TYPES.appProperties },
];

function relationshipsXml(definitions: RelationshipDefinition[]) {
  return xmlDocument(xml("Relationships", { xmlns: OOXML_NAMESPACES.relationships },
    definitions.map((definition) => rawXml(xml("Relationship", {
      Id: definition.id,
      Type: definition.type,
      Target: definition.target,
    }))),
  ));
}

function contentTypesXml(embeddedFont?: EmbeddedFontPart, media: DocxPackageMedia[] = []) {
  const baseDefaults = embeddedFont
    ? [...CONTENT_TYPE_DEFAULTS, { extension: "odttf", contentType: CONTENT_TYPES.obfuscatedFont }]
    : CONTENT_TYPE_DEFAULTS;
  const mediaDefaults = new Map<string, string>();
  for (const item of media) {
    const extension = item.fileName.split(".").at(-1)?.toLowerCase();
    if (extension) mediaDefaults.set(extension, item.contentType);
  }
  const defaults = [
    ...baseDefaults,
    ...[...mediaDefaults].map(([extension, contentType]) => ({ extension, contentType })),
  ];
  const overrides = embeddedFont
    ? [...CONTENT_TYPE_OVERRIDES, { partName: "/word/fontTable.xml", contentType: CONTENT_TYPES.fontTable }]
    : CONTENT_TYPE_OVERRIDES;
  return xmlDocument(xml("Types", { xmlns: OOXML_NAMESPACES.contentTypes }, [
    ...defaults.map((entry) => rawXml(xml("Default", {
      Extension: entry.extension,
      ContentType: entry.contentType,
    }))),
    ...overrides.map((entry) => rawXml(xml("Override", {
      PartName: entry.partName,
      ContentType: entry.contentType,
    }))),
  ]));
}

export interface DocxPackageOptions {
  includeHeaderFooter?: boolean;
  media?: DocxPackageMedia[];
}

export interface DocxPackageMedia {
  relationshipId: string;
  fileName: string;
  contentType: "image/jpeg" | "image/png";
  bytes: Uint8Array;
}

function documentXml(body: string, theme: DocxTheme, options: DocxPackageOptions = {}) {
  const page = theme.page;
  const includeHeaderFooter = options.includeHeaderFooter ?? true;
  const sectionProperties = xml("w:sectPr", {}, [
    includeHeaderFooter
      ? rawXml(xml("w:headerReference", { "w:type": "default", "r:id": "rId3" }))
      : undefined,
    includeHeaderFooter
      ? rawXml(xml("w:footerReference", { "w:type": "default", "r:id": "rId4" }))
      : undefined,
    rawXml(xml("w:pgSz", { "w:w": page.widthTwips, "w:h": page.heightTwips })),
    rawXml(xml("w:pgMar", {
      "w:top": page.marginTopTwips,
      "w:right": page.marginRightTwips,
      "w:bottom": page.marginBottomTwips,
      "w:left": page.marginLeftTwips,
      "w:header": page.headerTwips,
      "w:footer": page.footerTwips,
      "w:gutter": 0,
    })),
  ]);
  return xmlDocument(xml("w:document", {
    "xmlns:w": OOXML_NAMESPACES.word,
    "xmlns:m": OOXML_NAMESPACES.math,
    "xmlns:r": OOXML_NAMESPACES.relationshipAttributes,
    "xmlns:o": "urn:schemas-microsoft-com:office:office",
    "xmlns:v": "urn:schemas-microsoft-com:vml",
    "xmlns:w10": "urn:schemas-microsoft-com:office:word",
    "xmlns:wp": "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
    "xmlns:a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "xmlns:pic": "http://schemas.openxmlformats.org/drawingml/2006/picture",
    "xmlns:wps": "http://schemas.microsoft.com/office/word/2010/wordprocessingShape",
  }, [rawXml(xml("w:body", {}, [rawXml(body), rawXml(sectionProperties)]))]));
}

function headerXml(text: string, theme: DocxTheme) {
  return xmlDocument(xml("w:hdr", { "xmlns:w": OOXML_NAMESPACES.word }, [
    rawXml(xml("w:p", {}, [
      rawXml(xml("w:pPr", {}, [
        rawXml(xml("w:spacing", { "w:after": 0 })),
        rawXml(xml("w:jc", { "w:val": "right" })),
      ])),
      rawXml(xml("w:r", {}, [
        rawXml(xml("w:rPr", {}, [
          rawXml(xml("w:color", { "w:val": theme.headerColor })),
          rawXml(xml("w:sz", { "w:val": theme.headerFontSizePt * 2 })),
        ])),
        rawXml(xml("w:t", {}, [text])),
      ])),
    ])),
  ]));
}

function footerXml(theme: DocxTheme) {
  return xmlDocument(xml("w:ftr", { "xmlns:w": OOXML_NAMESPACES.word }, [
    rawXml(xml("w:p", {}, [
      rawXml(xml("w:pPr", {}, [
        rawXml(xml("w:spacing", { "w:before": 0, "w:after": 0 })),
        rawXml(xml("w:jc", { "w:val": "center" })),
      ])),
      rawXml(xml("w:r", {}, [
        rawXml(xml("w:rPr", {}, [
          rawXml(xml("w:color", { "w:val": theme.footerColor })),
          rawXml(xml("w:sz", { "w:val": theme.footerFontSizePt * 2 })),
        ])),
        rawXml(xml("w:fldChar", { "w:fldCharType": "begin" })),
      ])),
      rawXml(xml("w:r", {}, [rawXml(xml("w:instrText", { "xml:space": "preserve" }, [" PAGE "]))])),
      rawXml(xml("w:r", {}, [rawXml(xml("w:fldChar", { "w:fldCharType": "end" }))])),
    ])),
  ]));
}

function corePropertiesXml(metadata: Required<Pick<DocxMetadata, "title" | "creator" | "description">>) {
  return xmlDocument(xml("cp:coreProperties", {
    "xmlns:cp": OOXML_NAMESPACES.coreProperties,
    "xmlns:dc": OOXML_NAMESPACES.dc,
  }, [
    rawXml(xml("dc:title", {}, [metadata.title])),
    rawXml(xml("dc:creator", {}, [metadata.creator])),
    rawXml(xml("dc:description", {}, [metadata.description])),
  ]));
}

function appPropertiesXml() {
  return xmlDocument(xml("Properties", {
    xmlns: OOXML_NAMESPACES.extendedProperties,
    "xmlns:vt": "http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes",
  }, [
    rawXml(xml("Application", {}, ["VisualTeX"])),
    rawXml(xml("AppVersion", {}, ["1.2"])),
  ]));
}

function settingsXml(formulaMathFontName: string) {
  return xmlDocument(xml("w:settings", {
    "xmlns:w": OOXML_NAMESPACES.word,
    "xmlns:m": OOXML_NAMESPACES.math,
  }, [
    rawXml(xml("w:zoom", { "w:percent": 100 })),
    rawXml(xml("w:compat", {}, [
      rawXml(xml("w:compatSetting", {
        "w:name": "compatibilityMode",
        "w:uri": "http://schemas.microsoft.com/office/word",
        "w:val": 15,
      })),
    ])),
    rawXml(xml("m:mathPr", {}, [rawXml(xml("m:mathFont", { "m:val": formulaMathFontName }))])),
  ]));
}

function fontTableXml(embeddedFont: EmbeddedFontPart) {
  return xmlDocument(xml("w:fonts", {
    "xmlns:w": OOXML_NAMESPACES.word,
    "xmlns:r": OOXML_NAMESPACES.relationshipAttributes,
  }, [
    rawXml(xml("w:font", { "w:name": embeddedFont.fontName }, [
      rawXml(xml("w:family", { "w:val": "roman" })),
      rawXml(xml("w:embedRegular", { "r:id": "rId1", "w:fontKey": embeddedFont.fontKey })),
    ])),
  ]));
}

export function buildDocxPackage(
  body: string,
  formulaMathFontName: string,
  metadata: DocxMetadata,
  theme: DocxTheme,
  embeddedFont?: EmbeddedFontPart,
  options: DocxPackageOptions = {},
) {
  const media = options.media ?? [];
  const resolvedMetadata = {
    title: metadata.title ?? "VisualTeX Native Math Document",
    creator: metadata.creator ?? "VisualTeX",
    description: metadata.description ?? "Generated by VisualTeX with native Office Math formulas.",
    headerText: metadata.headerText ?? "VisualTeX",
  };
  const baseDocumentRelationships = embeddedFont
    ? [...DOCUMENT_RELATIONSHIPS, { id: "rId6", type: RELATIONSHIP_TYPES.fontTable, target: "fontTable.xml" }]
    : DOCUMENT_RELATIONSHIPS;
  const documentRelationships = [
    ...baseDocumentRelationships,
    ...media.map((item) => ({
      id: item.relationshipId,
      type: RELATIONSHIP_TYPES.image,
      target: `media/${item.fileName}`,
    })),
  ];
  const parts: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(contentTypesXml(embeddedFont, media)),
    "_rels/.rels": strToU8(relationshipsXml(ROOT_RELATIONSHIPS)),
    "docProps/core.xml": strToU8(corePropertiesXml(resolvedMetadata)),
    "docProps/app.xml": strToU8(appPropertiesXml()),
    "word/document.xml": strToU8(documentXml(body, theme, options)),
    "word/_rels/document.xml.rels": strToU8(relationshipsXml(documentRelationships)),
    "word/styles.xml": strToU8(buildStylesXml(theme)),
    "word/numbering.xml": strToU8(buildNumberingXml(theme)),
    "word/settings.xml": strToU8(settingsXml(formulaMathFontName)),
    "word/header1.xml": strToU8(headerXml(resolvedMetadata.headerText, theme)),
    "word/footer1.xml": strToU8(footerXml(theme)),
  };
  if (embeddedFont) {
    const fileName = embeddedFont.partName.split("/").at(-1)!;
    parts["word/fontTable.xml"] = strToU8(fontTableXml(embeddedFont));
    parts["word/_rels/fontTable.xml.rels"] = strToU8(relationshipsXml([
      { id: "rId1", type: RELATIONSHIP_TYPES.font, target: `fonts/${fileName}` },
    ]));
    parts[embeddedFont.partName] = embeddedFont.bytes;
  }
  for (const item of media) parts[`word/media/${item.fileName}`] = item.bytes;
  return zipSync(parts, { level: 6 });
}
