// HomeAskComposer 凭据缺失横幅

export type HomeAskComposerBannerProps = {
  message: string;
  onOpenSettings: () => void;
};

export function HomeAskComposerBanner({
  message,
  onOpenSettings,
}: HomeAskComposerBannerProps) {
  return (
    <div className="home-ask-key-banner" role="alert">
      <p>{message}</p>
      <button
        type="button"
        className="home-ask-key-banner-btn"
        onClick={onOpenSettings}
      >
        打开设置
      </button>
    </div>
  );
}
