import * as MockJobsActions from "../mocks/jobs-actions.js";
import {
  cancelJob as _canonCancelJob,
  cancelOcrJob as _canonCancelOcrJob,
  fetchJobDiagnostics as _canonFetchJobDiagnostics,
  fetchJobStageActions as _canonFetchJobStageActions,
  fetchResumePlan as _canonFetchResumePlan,
  resolveOcrAmbiguity as _canonResolveOcrAmbiguity,
  resumeJob as _canonResumeJob,
  rerunJob as _canonRerunJob,
  retryJobStage as _canonRetryJobStage,
} from "@retainpdf/api/jobs-actions";
import { mockable } from "./_mockable.js";
import { apiBase } from "@retainpdf/api/http";
import { API_PREFIX } from "../../config/api-constants.js";
import { withCurrentTranslationSecret } from "../translation-secret.js";

export type {
  JobRetryStage,
  JobStageActionsView,
  JobStageRetryActionView,
  JobDiagnosticsView,
  OcrAmbiguityReceiptField,
  OcrAmbiguityResolutionKind,
  OcrAmbiguityResolutionRequest,
  OcrAmbiguityResolutionView,
  OcrAmbiguityView,
} from "@retainpdf/api/jobs-actions";

export const fetchJobDiagnostics = mockable(_canonFetchJobDiagnostics, MockJobsActions.fetchJobDiagnostics);
export const fetchJobStageActions = mockable(_canonFetchJobStageActions, MockJobsActions.fetchJobStageActions);
export const fetchResumePlan = mockable(_canonFetchResumePlan, MockJobsActions.fetchResumePlan);
export const resumeJob = mockable(async (jobId: string, apiPrefix?: string, body: Record<string, unknown> = {}) => (
  _canonResumeJob(jobId, apiPrefix, await withCurrentTranslationSecret(jobId, apiPrefix, body))
), MockJobsActions.resumeJob);
export const cancelJob = mockable(_canonCancelJob, MockJobsActions.cancelJob);
export const cancelOcrJob = mockable(_canonCancelOcrJob, MockJobsActions.cancelOcrJob);
export const resolveOcrAmbiguity = mockable(_canonResolveOcrAmbiguity, MockJobsActions.resolveOcrAmbiguity);
export const rerunJob = mockable(async (actionUrl: string, body: Record<string, unknown> = {}) => {
  const url = new URL(actionUrl, typeof window === "undefined" ? apiBase() : window.location.href);
  const match = /\/jobs\/([^/]+)\/rerun\/?$/.exec(url.pathname);
  const ownedOrigin = url.origin === new URL(apiBase()).origin
    || (typeof window !== "undefined" && url.origin === window.location.origin);
  if (match && ownedOrigin) {
    body = await withCurrentTranslationSecret(decodeURIComponent(match[1]), API_PREFIX, body);
  }
  return _canonRerunJob(actionUrl, body);
}, MockJobsActions.rerunJob);
export const retryJobStage = mockable(async (jobId: string, apiPrefix: string | undefined, stage: string, payload: Record<string, unknown> = {}) => (
  _canonRetryJobStage(jobId, apiPrefix, stage, await withCurrentTranslationSecret(jobId, apiPrefix, payload))
), MockJobsActions.retryJobStage);
