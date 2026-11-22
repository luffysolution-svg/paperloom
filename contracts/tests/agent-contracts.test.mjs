import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function json(name) {
  return JSON.parse(await readFile(resolve(root, name), "utf8"));
}

test("agent schemas use versioned ids and closed top-level contracts", async () => {
  for (const name of ["agent-envelope.v1.schema.json", "agent-run-manifest.v1.schema.json", "agent-batch-workflow.v1.schema.json"]) {
    const schema = await json(name);
    assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
    assert.match(schema.$id, /^retainpdf\/contracts\/agent-[a-z-]+\/v1$/);
    assert.equal(schema.type, "object");
    assert.equal(schema.additionalProperties, false);
  }
});

test("batch workflow example carries the required execution contract", async () => {
  const workflow = await readFile(resolve(root, "../skills/paperloom-pdf-ops/examples/zotero-translate.yml"), "utf8");
  for (const field of ["schema_version:", "inputs:", "steps:", "execution:", "dry_run:", "failure_policy:"]) {
    assert.match(workflow, new RegExp(`^\\s*${field}`, "m"));
  }
});
