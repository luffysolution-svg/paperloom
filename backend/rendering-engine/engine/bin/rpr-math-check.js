#!/usr/bin/env node
"use strict";

// Formula check service: can the renderer typeset these TeX formulas? Uses the same MathJax setup
// and the same TeX normalization as the layout (src/text/mathjax-node.js), so "ok" here means the
// formula will render in the PDF, not merely that it looks like valid TeX.
//
// Long-lived, JSON lines on stdin/stdout (callers keep one process and send many formulas):
//   -> {"ready": true, "engine": "<commit>"}                      once MathJax is loaded
//   <- {"id": 1, "tex": "\\frac{a}{b}", "display": false}
//   -> {"id": 1, "ok": true}
//   <- {"id": 2, "tex": "\\rho_{s}(\\mathbf{r}})"}
//   -> {"id": 2, "ok": false, "error": "Extra close brace or missing open brace"}
// A line that is not valid JSON gets {"id": null, "ok": false, "error": "bad request: ..."}.

const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");
const { createMathRenderer } = require("../src/text/mathjax-node");

function engineCommit() {
  try { return fs.readFileSync(path.join(__dirname, "..", "COMMIT"), "utf8").trim(); }
  catch (_error) { return ""; }
}

function main() {
  const renderer = createMathRenderer();
  renderer.texToSVG("x", false); // load MathJax before announcing readiness
  const write = value => process.stdout.write(JSON.stringify(value) + "\n");
  write({ ready: true, engine: engineCommit() });
  const lines = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
  lines.on("line", line => {
    if (!line.trim()) return;
    let request;
    try { request = JSON.parse(line); }
    catch (error) { write({ id: null, ok: false, error: `bad request: ${error.message}` }); return; }
    const id = request && Object.prototype.hasOwnProperty.call(request, "id") ? request.id : null;
    if (!request || typeof request.tex !== "string") { write({ id, ok: false, error: "bad request: tex must be a string" }); return; }
    const result = renderer.texToSVG(request.tex, Boolean(request.display));
    write(result.ok ? { id, ok: true } : { id, ok: false, error: String(result.error || "unrenderable") });
  });
}

main();
