import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let launchPortableUpdate;
try { ({ launchPortableUpdate } = require("./portable-update.js")); } catch (error) {
  if (error.code !== "MODULE_NOT_FOUND") throw error;
}

test("portable helper waits for the old process, replaces only the executable, and starts the new version", { skip: process.platform !== "win32" }, async (t) => {
  assert.equal(typeof launchPortableUpdate, "function", "portable installer is available");
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "PaperLoom 空格 ' $ ` "));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const cache = path.join(root, "updates");
  await fs.mkdir(cache);
  let targetRoot = root;
  if (path.parse(process.cwd()).root !== path.parse(root).root) {
    const parentDir = path.join(process.cwd(), "tmp");
    await fs.mkdir(parentDir, { recursive: true });
    targetRoot = await fs.mkdtemp(path.join(parentDir, "portable-cross-volume-"));
    t.after(() => fs.rm(targetRoot, { recursive: true, force: true }));
  }
  const source = path.join(cache, "new.exe"), target = path.join(targetRoot, "PaperLoom.exe");
  const cs = path.join(root, "fixture.cs");
  await fs.writeFile(cs, 'using System; using System.IO; class App { static void Main() { File.WriteAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "restarted.txt"), "new"); } }');
  const compiler = path.join(process.env.SystemRoot, "Microsoft.NET", "Framework64", "v4.0.30319", "csc.exe");
  execFileSync(compiler, ["/nologo", "/target:winexe", `/out:${source}`, cs]);
  await fs.writeFile(cs, 'using System.Threading; class App { static void Main() { Thread.Sleep(5000); } }');
  execFileSync(compiler, ["/nologo", "/target:winexe", `/out:${target}`, cs]);
  const original = await fs.readFile(target);
  await fs.writeFile(path.join(targetRoot, "notes.json"), "keep notes");
  const parent = spawn(target, [], { windowsHide: true });
  t.after(() => parent.kill());
  const content = await fs.readFile(source);
  const plan = await launchPortableUpdate({ source, target, sha256: createHash("sha256").update(content).digest("hex"), parentPid: parent.pid });
  assert.deepEqual(await fs.readFile(target), original, "must not replace a running version");
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    try { if (await fs.readFile(path.join(targetRoot, "restarted.txt"), "utf8") === "new") break; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.deepEqual(await fs.readFile(target), content);
  assert.equal(await fs.readFile(path.join(targetRoot, "notes.json"), "utf8"), "keep notes");
  const result = JSON.parse(await fs.readFile(`${plan}.result.json`, "utf8"));
  assert.equal(result.ok, true);
});

test("portable helper rejects a corrupted source before waiting or changing the original", { skip: process.platform !== "win32" }, async (t) => {
  assert.equal(typeof launchPortableUpdate, "function", "portable installer is available");
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "paperloom-bad-update-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const source = path.join(root, "new.exe"), target = path.join(root, "old.exe");
  await fs.writeFile(source, "corrupted");
  await fs.writeFile(target, "original");
  await assert.rejects(launchPortableUpdate({ source, target, sha256: "0".repeat(64), parentPid: process.pid }), /校验|checksum/);
  assert.equal(await fs.readFile(target, "utf8"), "original");
});

test("a cancelled readiness attempt never replaces the app on a later ordinary parent exit", { skip: process.platform !== "win32" }, async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "paperloom-uncommitted-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const source = path.join(root, "new.exe"), target = path.join(root, "old.exe"), planFile = path.join(root, "attempt.json");
  const cs = path.join(root, "new.cs");
  await fs.writeFile(cs, 'class App { static void Main() {} }');
  execFileSync(path.join(process.env.SystemRoot, "Microsoft.NET/Framework64/v4.0.30319/csc.exe"), ["/nologo", "/target:winexe", `/out:${source}`, cs]);
  await fs.writeFile(target, "original");
  const powershell = path.join(process.env.SystemRoot, "System32/WindowsPowerShell/v1.0/powershell.exe");
  const parent = spawn(powershell, ["-NoProfile", "-Command", "Start-Sleep -Seconds 2"], { windowsHide: true });
  t.after(() => parent.kill());
  await fs.writeFile(planFile, JSON.stringify({ source, target, parentPid: parent.pid, sha256: createHash("sha256").update(await fs.readFile(source)).digest("hex") }));
  const child = spawn(powershell, ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", require.resolve("./portable-update.ps1"), "-PlanFile", planFile], { windowsHide: true, stdio: "ignore" });
  t.after(() => child.kill());
  const closed = new Promise((resolve) => child.on("exit", resolve));
  const deadline = Date.now() + 5000;
  while (!await fs.stat(`${planFile}.ready`).catch(() => null)) {
    assert.ok(Date.now() < deadline, "helper readiness timed out");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  await fs.writeFile(`${planFile}.cancel`, "cancel");
  await closed;
  assert.equal(await fs.readFile(target, "utf8"), "original");
});
