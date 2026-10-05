import { isMockMode } from "@/platform/config/runtime.js";
import { parseReaderParams } from "@/platform/navigation/pages.js";

function defaultSearch() {
  return globalThis.window?.location?.search || "";
}

export function resolveMockScenario({
  search = defaultSearch(),
  fallback = "running",
}: any = {}) {
  return parseReaderParams(search).mock || fallback;
}

export function createWorkflowConfigPort({
  isMock = isMockMode,
  search = defaultSearch,
}: any = {}) {
  function mockScenario() {
    return resolveMockScenario({ search: search() });
  }

  return Object.freeze({
    isMock,
    mockScenario,
  });
}

export const defaultWorkflowConfigPort = createWorkflowConfigPort();
