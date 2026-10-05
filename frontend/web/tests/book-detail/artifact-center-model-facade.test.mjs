import test from "node:test";
import assert from "node:assert/strict";

import * as facade from "../../src/features/book-detail/domain/artifact-center-model.js";
import { buildArtifactCenterSections } from "../../src/features/book-detail/domain/artifact-center-sections.js";
import { mergeArtifactLinksIntoManifest } from "../../src/features/book-detail/domain/artifact-resources.js";
import { selectArtifactQuickDownloads } from "../../src/features/book-detail/domain/artifact-quick-downloads.js";
import {
  formatArtifactBytes,
  formatArtifactTime,
} from "../../src/features/book-detail/domain/artifact-format.js";

test("artifact center facade: 保留全部公开函数并转发到聚焦模块", () => {
  assert.equal(facade.buildArtifactCenterSections, buildArtifactCenterSections);
  assert.equal(facade.mergeArtifactLinksIntoManifest, mergeArtifactLinksIntoManifest);
  assert.equal(facade.selectArtifactQuickDownloads, selectArtifactQuickDownloads);
  assert.equal(facade.formatArtifactBytes, formatArtifactBytes);
  assert.equal(facade.formatArtifactTime, formatArtifactTime);
});

test("artifact center facade: 仍可直接构建 sections（import 路径不变）", () => {
  const sections = buildArtifactCenterSections({
    documentId: "doc-1",
    source: {
      filename: "paper.pdf",
      url: "/api/v1/documents/doc-1/source.pdf",
      sizeBytes: 2048,
      generatedAt: "2026-09-01T08:30:00Z",
    },
    jobs: [],
    manifests: {},
  });
  assert.deepEqual(sections.map((section) => section.id), ["source"]);
  assert.equal(sections[0].items[0].filename, "paper.pdf");
});
