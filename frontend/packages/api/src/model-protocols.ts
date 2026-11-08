export type ApiProtocol = "openai" | "openai_responses" | "anthropic";

export const API_PROTOCOL_LABELS: Record<ApiProtocol, string> = {
  openai: "OpenAI Chat Completions",
  openai_responses: "OpenAI Responses",
  anthropic: "Anthropic Messages",
};
