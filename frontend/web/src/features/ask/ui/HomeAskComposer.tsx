// 主页 AI 输入条：@ 选文档 / 合集 + chips + 发送
//
// 负责组合各子块；状态与交互逻辑见 use-home-ask-composer，
// 副作用（document 监听 / CustomEvent）见 use-home-ask-composer-effects。

import { useRef, useState, type ReactNode } from "react";
import { ImagePlus, X } from "lucide-react";
import { HomeAskComposerBanner } from "./HomeAskComposerBanner.js";
import { HomeAskComposerChips } from "./HomeAskComposerChips.js";
import { HomeAskComposerInput } from "./HomeAskComposerInput.js";
import { HomeAskComposerPicker } from "./HomeAskComposerPicker.js";
import { HomeAskComposerToolbar } from "./HomeAskComposerToolbar.js";
import { useHomeAskComposer } from "./use-home-ask-composer.js";
import {
  openBrowserCredentials,
  useHomeAskComposerOutsideClose,
} from "./use-home-ask-composer-effects.js";
import type { HomeAskScope } from "../domain/types.js";

export type HomeAskComposerProps = {
  disabled?: boolean;
  isRunning?: boolean;
  /** 当前 Agent 运行模式缺少对应凭据或仍在加载时禁用发送 */
  credentialBlocked?: boolean;
  credentialMessage?: string;
  scopes: HomeAskScope[];
  onScopesChange: (next: HomeAskScope[]) => void;
  onSend: (question: string, attachments?: Record<string, unknown>[]) => void;
  /** 从线程里「引用」过来的文字，插到草稿最前面。 */
  quoteRequest?: { id: string; text: string } | null;
  onStop?: () => void;
  /** hero：空态居中大输入；dock：对话底栏 */
  variant?: "hero" | "dock";
  aiSelector?: ReactNode;
  imageSupported?: boolean;
};

export function HomeAskComposer({
  disabled = false,
  isRunning = false,
  credentialBlocked = false,
  credentialMessage = "请先完成 AI Agent 配置",
  scopes,
  onScopesChange,
  onSend,
  quoteRequest = null,
  onStop,
  variant = "dock",
  aiSelector,
  imageSupported = true,
}: HomeAskComposerProps) {
  const [images, setImages] = useState<{ name: string; data: string; mime_type: string }[]>([]);
  const [imageError, setImageError] = useState("");
  const [imageBusy, setImageBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  async function addImages(files: File[]) {
    if (!imageSupported) { setImageError("当前 Agent 未提供图片输入，请切换服务后添加图片。"); return; }
    setImageError(""); setImageBusy(true);
    try {
      const added = [];
      for (const file of files.slice(0, Math.max(0, 4 - images.length))) {
        if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 10_000_000) throw new Error("请使用小于 10 MB 的 PNG、JPEG 或 WebP 图片。");
        const bitmap = await createImageBitmap(file);
        const ratio = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement("canvas"); canvas.width = Math.round(bitmap.width * ratio); canvas.height = Math.round(bitmap.height * ratio);
        canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
        const data = canvas.toDataURL("image/webp", 0.88).split(",")[1];
        added.push({ name: file.name, mime_type: "image/webp", data });
      }
      setImages((previous) => [...previous, ...added].slice(0, 4));
    } catch (error) { setImageError((error as Error).message); }
    finally { setImageBusy(false); }
  }
  const {
    text,
    pickerOpen,
    highlight,
    filtered,
    loadingOpts,
    optionsLoaded,
    textareaRef,
    listId,
    inputDisabled,
    canSend,
    scopeHint,
    closePicker,
    pickScope,
    handleSend,
    onKeyDown,
    handleTextChange,
    syncAtState,
    setHighlight,
  } = useHomeAskComposer({
    disabled,
    isRunning,
    credentialBlocked,
    credentialMessage,
    scopes,
    onScopesChange,
    onSend: (question) => { onSend(question, images); setImages([]); },
    quoteRequest,
  });

  useHomeAskComposerOutsideClose({
    active: pickerOpen,
    anchorRef: textareaRef,
    onClose: closePicker,
  });

  return (
    <div className={`home-ask-composer home-ask-composer-${variant}`}
      onDragOver={(event) => { if (event.dataTransfer.types.includes("Files")) event.preventDefault(); }}
      onDrop={(event) => { if (event.dataTransfer.files.length && !isRunning) { event.preventDefault(); void addImages(Array.from(event.dataTransfer.files)); } }}
      onPaste={(event) => { const files = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith("image/")); if (files.length && !isRunning) { event.preventDefault(); void addImages(files); } }}>
      {credentialBlocked ? (
        <HomeAskComposerBanner
          message={credentialMessage}
          onOpenSettings={openBrowserCredentials}
        />
      ) : null}
      {scopes.length > 0 ? (
        <HomeAskComposerChips
          scopes={scopes}
          disabled={disabled}
          isRunning={isRunning}
          onScopesChange={onScopesChange}
        />
      ) : null}

      <div className="home-ask-composer-shell">
        {images.length ? <div className="home-ask-attachments">{images.map((image, index) => <div className="home-ask-attachment" key={`${image.name}-${index}`}>
          <img src={`data:${image.mime_type};base64,${image.data}`} alt={image.name} /><button type="button" aria-label={`移除 ${image.name}`} disabled={isRunning} onClick={() => setImages((items) => items.filter((_, i) => i !== index))}><X size={12} /></button>
        </div>)}</div> : null}
        {imageError ? <p role="alert" className="home-ask-attachment-error">{imageError}</p> : null}
        <HomeAskComposerInput
          textareaRef={textareaRef}
          text={text}
          inputDisabled={inputDisabled}
          scopeCount={scopes.length}
          variant={variant}
          onTextChange={handleTextChange}
          onSyncCaret={syncAtState}
          onKeyDown={onKeyDown}
        />

        {pickerOpen ? (
          <HomeAskComposerPicker
            listId={listId}
            loadingOpts={loadingOpts}
            optionsLoaded={optionsLoaded}
            filtered={filtered}
            highlight={highlight}
            scopeCount={scopes.length}
            onHighlight={setHighlight}
            onPick={pickScope}
          />
        ) : null}

        <HomeAskComposerToolbar
          attachmentControl={<><input hidden ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(event) => { void addImages(Array.from(event.target.files || [])); event.target.value = ""; }} />
            <button type="button" className="home-ask-attach" aria-label="添加图片" title={imageSupported ? "添加图片，也可粘贴或拖入" : "当前 Agent 未提供图片输入"} disabled={isRunning || imageBusy || !imageSupported || images.length >= 4} onClick={() => fileRef.current?.click()}><ImagePlus size={17} /></button></>}
          aiSelector={aiSelector}
          scopeHint={scopeHint}
          isRunning={isRunning}
          canSend={canSend && !imageBusy}
          onStop={onStop}
          onSend={handleSend}
        />
      </div>
    </div>
  );
}
