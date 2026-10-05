// ProviderPanels 家族共享的纯展示辅助。

export function storedSecretPlaceholder(label: string) {
  return `${label} 使用旧配置，请填写本机 Key`;
}

export function resetHandlerFor(handlers) {
  return handlers?.resetOcrValidation || handlers?.resetPaddleValidation;
}
