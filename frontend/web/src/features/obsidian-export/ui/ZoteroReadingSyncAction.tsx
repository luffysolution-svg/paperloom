import { useState } from "react";
import { Button } from "@retainpdf/ui";
import { syncObsidianReading } from "@/platform/api/index.js";

type Props = {
  jobId: string;
  vaultId: string;
  folder: string;
  byCollection: boolean;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  setError: (message: string) => void;
};

export function ZoteroReadingSyncAction({ jobId, vaultId, folder, byCollection, busy, setBusy, setError }: Props) {
  const [message, setMessage] = useState("");

  const sync = async () => {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const result = await syncObsidianReading(jobId, { vault_id: vaultId, folder, folder_by_collection: byCollection });
      const note = result.note_status === "created" ? "已创建阅读笔记" : result.note_status === "updated" ? "已更新阅读笔记" : "阅读笔记无改动";
      setMessage(note + "，已回写 " + result.fields_written.length + " 项书目属性。");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Button type="button" variant="secondary" disabled={busy || !vaultId} onClick={() => void sync()}>
        将已有笔记回写 Zotero
      </Button>
      {message ? <p role="status">{message}</p> : null}
    </div>
  );
}
