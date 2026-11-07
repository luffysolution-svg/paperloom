import { useRef, useState } from "react";
import { toast } from "sonner";
import { useCredentialsServices } from "./credentials-context.js";

export function useCredentialSave(action: (() => Promise<boolean>) | undefined, successMessage: string) {
  const { view, feature } = useCredentialsServices();
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);

  async function save() {
    if (inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    try {
      if (await action?.()) {
        const manager = feature?.serviceProfiles;
        const profileState = manager?.getState?.();
        const active = profileState?.profiles?.find((profile) => profile.id === profileState.activeId);
        if (manager && active) {
          void manager.save(active.name, active.id).catch(() => {
            toast.error("当前配置方案同步失败，请点击“更新当前方案”重试");
          });
        }
        toast.success(successMessage);
      } else {
        toast.error(view.store.getSnapshot().dialogStatus?.message || "保存失败，请重试");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败，请重试");
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  return { saving, save };
}
