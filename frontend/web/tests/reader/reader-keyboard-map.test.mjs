import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  READER_KEY_BINDINGS,
  READER_SHORTCUT_HELP,
  matchReaderKeyBinding,
} from "../../../../frontend/packages/reader/src/hooks/reader-keyboard-map.ts";

function helpActions() {
  return new Set(
    READER_SHORTCUT_HELP.flatMap((group) => group.items.flatMap((item) => item.actions)),
  );
}

test("shortcut help covers every implemented keyboard action", () => {
  const covered = helpActions();
  const missing = READER_KEY_BINDINGS
    .map((binding) => binding.action)
    .filter((action) => !covered.has(action));
  assert.deepEqual(missing, [], `help overlay misses actions: ${missing.join(", ")}`);
});

test("shortcut help references no unimplemented action", () => {
  const implemented = new Set(READER_KEY_BINDINGS.map((binding) => binding.action));
  const orphans = [...helpActions()].filter((action) => !implemented.has(action));
  assert.deepEqual(orphans, [], `help overlay has orphan actions: ${orphans.join(", ")}`);
});

test("binding lookup keeps the documented key set routable", () => {
  const routes = {
    "j": "next-page",
    "ArrowDown": "next-page",
    "PageDown": "next-page",
    "k": "prev-page",
    "ArrowUp": "prev-page",
    "PageUp": "prev-page",
    "Home": "first-page",
    "End": "last-page",
    "+": "zoom-in",
    "=": "zoom-in",
    "-": "zoom-out",
    "_": "zoom-out",
    "0": "zoom-reset",
    "1": "mode-source",
    "2": "mode-compare",
    "3": "mode-translated",
  };
  for (const [key, action] of Object.entries(routes)) {
    assert.equal(matchReaderKeyBinding(key)?.action, action, `key ${key}`);
  }
  assert.equal(matchReaderKeyBinding("b"), null);
});

test("help overlay renders from the shared map instead of a local copy", () => {
  const source = readFileSync(
    new URL(
      "../../../../frontend/packages/reader/src/components/react-pdf/ReaderShortcutsHelp.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(source, /READER_SHORTCUT_HELP/);
  assert.doesNotMatch(source, /SHORTCUT_GROUPS\s*[:=]/);
});
