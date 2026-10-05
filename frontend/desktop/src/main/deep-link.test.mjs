import assert from "node:assert/strict";
import test from "node:test";

import { findDeepLink, readerQueryFromDeepLink } from "./deep-link.js";

test("finds the deep link among launch arguments", () => {
  assert.equal(
    findDeepLink(["PaperLoom.exe", "--allow-file-access", "paperloom://open?job=20261003-abc"]),
    "paperloom://open?job=20261003-abc",
  );
  assert.equal(findDeepLink(["PaperLoom.exe", "--flag"]), "");
});

test("maps open links to reader query, preferring job and converting page to page_idx", () => {
  assert.equal(
    readerQueryFromDeepLink("paperloom://open?job=20261003184858-b8effd&document=a784c8&page=3"),
    "job_id=20261003184858-b8effd&page_idx=2",
  );
  assert.equal(readerQueryFromDeepLink("paperloom://open/?document=a784c8118d"), "document_id=a784c8118d");
  assert.equal(readerQueryFromDeepLink("PAPERLOOM://OPEN?job=j1&page=0"), "job_id=j1");
});

test("rejects foreign schemes, unknown actions and unsafe ids", () => {
  for (const link of [
    "https://example.com/open?job=j1",
    "paperloom://delete?job=j1",
    "paperloom://open",
    "paperloom://open?job=../../etc",
    "paperloom://open?job=a%20b",
    "not a url",
  ]) {
    assert.equal(readerQueryFromDeepLink(link), "", link);
  }
});
