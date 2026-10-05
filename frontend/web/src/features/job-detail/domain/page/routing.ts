import { defaultJobDetailConfigPort } from "./config-port.js";
import { parseDetailJobId } from "@/platform/navigation/pages.js";

export { firstNonEmpty as firstNonEmptyText, firstJobIdFromPayload } from "@retainpdf/domain/job";

export function getJobIdFromQuery() {
  return parseDetailJobId();
}

export function buildReaderPageUrl(jobId) {
  return defaultJobDetailConfigPort.buildReaderPageUrl(jobId);
}

export function buildDetailPageUrl(jobId) {
  return defaultJobDetailConfigPort.buildDetailPageUrl(jobId);
}
