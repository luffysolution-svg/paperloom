const fs = require("node:fs");
const path = require("node:path");

async function openBackupLocation(dataRoot, args, shell) {
  const directory = path.join(dataRoot, "backups", args?.previous === true ? "before-restore" : "");
  const name = args?.name;
  if (name !== undefined) {
    if (args?.previous || typeof name !== "string" || !/^paperloom-backup-[a-zA-Z0-9.-]+\.zip$/.test(name)) {
      throw new Error("备份文件名无效");
    }
    const file = path.join(directory, name);
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("备份文件不存在");
    shell.showItemInFolder(file);
    return { path: file };
  }
  fs.mkdirSync(directory, { recursive: true });
  const error = await shell.openPath(directory);
  if (error) throw new Error(error);
  return { path: directory };
}

module.exports = { openBackupLocation };
