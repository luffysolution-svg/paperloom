const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { randomUUID } = require("crypto");

async function launchPortableUpdate(plan, beforeCommit = async () => {}) {
  const cacheDir = path.dirname(plan.source);
  const script = path.join(cacheDir, "portable-update.ps1");
  const planFile = path.join(cacheDir, `portable-update-${randomUUID()}.json`);
  await fs.promises.copyFile(path.join(__dirname, "portable-update.ps1"), script);
  await fs.promises.writeFile(planFile, JSON.stringify(plan), "utf8");
  const powershell = path.join(process.env.SystemRoot || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
  const child = spawn(powershell, ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", script, "-PlanFile", planFile, "-Launch"], {
    windowsHide: true, stdio: "ignore",
  });
  let spawnError;
  child.once("error", (error) => { spawnError = error; });
  child.unref();
  const deadline = Date.now() + 5 * 60 * 1000;
  try {
    while (Date.now() < deadline) {
      if (spawnError) throw spawnError;
      if (fs.existsSync(`${planFile}.ready`)) {
        await beforeCommit();
        await fs.promises.writeFile(`${planFile}.apply`, "apply", "utf8");
        return planFile;
      }
      if (fs.existsSync(`${planFile}.result.json`)) {
        const result = JSON.parse(await fs.promises.readFile(`${planFile}.result.json`, "utf8"));
        throw new Error(result.error || "便携版更新失败");
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error("便携版更新助手未就绪，软件未退出");
  } catch (error) {
    await fs.promises.writeFile(`${planFile}.cancel`, "cancel", "utf8");
    throw error;
  }
}

module.exports = { launchPortableUpdate };
