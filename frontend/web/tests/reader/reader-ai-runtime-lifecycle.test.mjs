import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("hiding Reader AI aborts its active model stream", async () => {
  const source = await readFile(
    new URL("../../../../frontend/packages/reader/src/components/react-pdf/assistant/use-reader-chat.ts", import.meta.url),
    "utf8",
  );
  // 按意图匹配，不写死语句形状:两条取消路径都必须 stop()，并且都必须补上收尾回调
  // ——只 stop() 会让消息永远停在 running，重开面板后一直显示「思考中…」。
  assert.match(source, /if \(options\.enabled\) return;[\s\S]*?chat\.stop\(\)/);
  assert.match(source, /useEffect\(\(\) => \(\) => \{[\s\S]*?chat\.stop\(\)/);
  // 只看代码，不看注释（注释里也会提到 chat.stop()）。
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const stopCalls = code.match(/chat\.stop\(\)/g) || [];
  const withHook = code.match(/chat\.stop\(\)\.finally\(\(\) => stoppedRef\.current\?\.\(\)\)/g) || [];
  assert.ok(stopCalls.length >= 2, `取消路径少了：只找到 ${stopCalls.length} 处 chat.stop()`);
  assert.equal(
    withHook.length,
    stopCalls.length,
    "每一处 chat.stop() 都要跟一次收尾回调，否则消息会停在 running",
  );
  // durable 的 PDF operation 有自己的生命周期，这里不许取消它们。
  assert.doesNotMatch(source, /cancelAgentOperation|\.cancel\(/);
});

test("frozen retry lives in the reading request hook, not the facade", async () => {
  const source = await readFile(
    new URL("../../../../frontend/packages/reader/src/components/react-pdf/assistant/use-reader-reading-request.ts", import.meta.url),
    "utf8",
  );
  const retryBlock = source.slice(
    source.indexOf("const retryAnswer"),
    source.indexOf("const cancelAnswer"),
  );

  assert.match(retryBlock, /loadRetryRequestSnapshot\(\{[\s\S]*?scopeKey,[\s\S]*?jobId,[\s\S]*?assistantMessageId,[\s\S]*?\}\)/);
  assert.match(retryBlock, /assistantMode: snapshot\.assistantMode/);
  assert.match(retryBlock, /scope: snapshot\.scope/);
  assert.match(retryBlock, /context: snapshot\.context/);
  assert.doesNotMatch(retryBlock, /assistantMode:\s*assistantMode/);
});

test("stopping generation marks the tree cancelled without touching operations", async () => {
  const source = await readFile(
    new URL("../../../../frontend/packages/reader/src/components/react-pdf/assistant/use-reader-reading-request.ts", import.meta.url),
    "utf8",
  );
  const cancelBlock = source.slice(source.indexOf("const cancelAnswer"));
  assert.match(cancelBlock, /stopStream/);
  assert.match(cancelBlock, /markRunningCancelled/);
  assert.doesNotMatch(cancelBlock, /cancelAgentOperation|commitAgentOperation|runAgentOperation/);
});

test("session hydration guards live in the conversation shell", async () => {
  const source = await readFile(
    new URL("../../../../frontend/packages/reader/src/components/react-pdf/assistant/use-reader-conversation.ts", import.meta.url),
    "utf8",
  );
  const switchBlock = source.slice(
    source.indexOf("const switchSession"),
    source.indexOf("const branchFromAnswer"),
  );

  const suspendIndex = switchBlock.indexOf("persistReadyRef.current = false");
  const selectIndex = switchBlock.indexOf("setActiveConversationId(id)");
  assert.ok(
    suspendIndex >= 0 && selectIndex >= 0 && suspendIndex < selectIndex,
    "切换目标会话前应暂停空树持久化",
  );
  assert.match(switchBlock, /loadThreadBranchSnapshot\([\s\S]*?documentId:[\s\S]*?,\s*id,\s*\)/);
  assert.match(source, /generation === sessionListGenerationRef\.current/);
  assert.match(source, /doc === `\$\{documentIdRef\.current \|\| ""\}`\.trim\(\)/);
  assert.match(source, /expectedSwitchToken === undefined \|\| expectedSwitchToken === switchTokenRef\.current/);
});

test("answer completion refreshes sessions from the facade, reset on job switch", async () => {
  const source = await readFile(
    new URL("../../../../frontend/packages/reader/src/components/react-pdf/assistant/use-reader-ask-runtime.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /useEffect\(\(\) => \{\s*prevRunning\.current = false;\s*\}, \[jobId\]\)/);
  assert.match(source, /sessionCommands\.refreshSessions\(\)/);
  assert.match(source, /sessionCommands\.adoptRemoteConversationId\(\)/);
});

test("AI runtime reset scope combines jobId, documentId and sessionIdentity", async () => {
  const source = await readFile(
    new URL("../../../../frontend/packages/reader/src/components/react-pdf/assistant/use-reader-ask-runtime.ts", import.meta.url),
    "utf8",
  );
  assert.ok(
    source.includes("`${jobId}\\u0000${documentId}\\u0000${sessionIdentity}`"),
    "resetScopeKey 必须由 jobId/documentId/sessionIdentity 组成",
  );
  assert.ok(source.includes("}, [resetScopeKey])"), "重置 effect 必须依赖 resetScopeKey");
  assert.match(source, /sessionIdentity = ""/);

  // 面板把 route 身份透传给运行时，documentId 变了 jobId 不变也会重置。
  const panel = await readFile(
    new URL("../../../../frontend/packages/reader/src/components/react-pdf/ReaderAiPanel.tsx", import.meta.url),
    "utf8",
  );
  assert.match(panel, /sessionIdentity/);
  assert.match(panel, /sessionIdentity,/);
});
