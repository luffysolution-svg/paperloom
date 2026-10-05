import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contract = JSON.parse(readFileSync(resolve(PACKAGE_ROOT, "reader-data.v1.schema.json"), "utf8"));
const definitions = contract.definitions;

function propertyNames(definitionName) {
  return Object.keys(definitions[definitionName].properties).sort();
}

test("reader data schema publishes the complete independent read surfaces", () => {
  assert.deepEqual(
    contract.endpoints.map((endpoint) => endpoint.output),
    [
      "ReaderArtifactLinks",
      "ReaderArtifactManifestView",
      "MarkdownDocumentView",
      "ReaderRegionsView",
      "ReaderMetadataView",
      "LiveTranslationLayout",
      "LiveTranslationPageSnapshot",
      "LiveTranslationCommitEvent",
    ],
  );

  for (const definitionName of contract.endpoints.map((endpoint) => endpoint.output)) {
    assert.ok(Object.hasOwn(definitions, definitionName), `missing ${definitionName}`);
  }
});

test("reader regions and live translation keep separate page-index conventions", () => {
  const regionBox = definitions.ReaderRegionBox;
  const layoutPage = definitions.LiveTranslationLayoutPage;
  const snapshot = definitions.LiveTranslationPageSnapshot;
  const event = definitions.LiveTranslationCommitEvent;

  assert.equal(regionBox.properties.page.minimum, 1);
  assert.equal(regionBox.properties.unit.const, "pdf_point");
  assert.equal(regionBox.properties.origin.const, "top_left");
  assert.equal(layoutPage.properties.page_idx.minimum, 0);
  assert.equal(snapshot.properties.page_idx.minimum, 0);
  assert.equal(event.properties.page_idx.minimum, 0);
  assert.match(regionBox.description, /one-based/i);
  assert.match(layoutPage.properties.page_idx.description, /zero-based/i);
});

test("live translation contract retains durable ordering and immutable snapshot fields", () => {
  const snapshot = definitions.LiveTranslationPageSnapshot;
  const event = definitions.LiveTranslationCommitEvent;

  assert.deepEqual(snapshot.required, ["attempt", "generation", "page_idx", "page_hash", "items"]);
  assert.deepEqual(
    event.required,
    ["event", "seq", "attempt", "generation", "page_idx", "page_hash", "changed_item_ids"],
  );
  assert.equal(event.properties.event.const, "translation_units_committed");
  assert.equal(snapshot.properties.page_hash.pattern, "^[0-9A-Fa-f]{64}$");
  assert.equal(event.properties.page_hash.pattern, "^[0-9A-Fa-f]{64}$");
  assert.match(event.description, /refresh hint/i);
});

test("reader contract exposes public resources but no internal path fields", () => {
  const forbidden = /(?:checkpoint|workspace|credential|provider_request|absolute_path)/i;
  for (const definitionName of [
    "PublicResourceLink",
    "ReaderArtifactLinks",
    "ReaderArtifactManifestItem",
    "MarkdownDocumentView",
    "MarkdownImageView",
    "ReaderRegionItem",
    "LiveTranslationPageSnapshot",
  ]) {
    const names = propertyNames(definitionName);
    assert.equal(
      names.some((name) => forbidden.test(name)),
      false,
      `${definitionName} leaks an internal field name: ${names.join(", ")}`,
    );
  }

  assert.ok(propertyNames("PublicResourceLink").includes("path"));
  assert.ok(propertyNames("PublicResourceLink").includes("url"));
  assert.equal(Object.hasOwn(definitions.ReaderArtifactManifestItem.properties, "relative_path"), false);
});

test("reader optional fields mirror serde omission or nullability", () => {
  assert.equal(definitions.LiveTranslationLayoutBlock.required.includes("typography"), false);
  assert.equal(definitions.ReaderRegionItem.required.includes("asset_ids"), true);
  assert.equal(definitions.ReaderRegionItem.required.includes("asset_urls"), true);
  assert.deepEqual(definitions.ReaderRegionItem.properties.asset_ids, { type: "array", items: { type: "string" } });
  assert.deepEqual(definitions.ReaderRegionItem.properties.asset_urls, { type: "array", items: { type: "string" } });
  assert.deepEqual(definitions.ReaderMetadataView.required, ["source", "translated"]);
  assert.equal(definitions.ReaderMetadataView.properties.source.anyOf[1].type, "null");
  assert.equal(definitions.ReaderMetadataView.properties.translated.anyOf[1].type, "null");
});
