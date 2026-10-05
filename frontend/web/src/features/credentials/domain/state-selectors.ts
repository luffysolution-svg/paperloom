import type {
  CredentialsFields,
  OcrTokenOptions,
} from "./state-types.js";
import { normalizeOcrProvider } from "@/platform/config/providers.js";

export function ocrTokenFromCredentials(
  credentials: Partial<CredentialsFields> = {},
  { defaultPaddleToken, providerId }: OcrTokenOptions = {},
): string {
  if (normalizeOcrProvider(providerId || credentials.ocrProvider) === "mineru") {
    return credentials.mineruToken || "";
  }
  const token = credentials.paddleToken;
  if (token) {
    return token;
  }
  return defaultPaddleToken?.() || "";
}

export function hasCompleteCredentials(
  credentials: Partial<CredentialsFields> = {},
  options: OcrTokenOptions = {},
): boolean {
  return Boolean(
    (credentials.ocrCredentialRef || ocrTokenFromCredentials(credentials, options))
    && (credentials.modelApiKey || credentials.translationCredentialRef),
  );
}
