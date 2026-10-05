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
export const resumeJob = mockable(_canonResumeJob, MockJobsActions.resumeJob);
export const cancelJob = mockable(_canonCancelJob, MockJobsActions.cancelJob);
export const cancelOcrJob = mockable(_canonCancelOcrJob, MockJobsActions.cancelOcrJob);
export const resolveOcrAmbiguity = mockable(_canonResolveOcrAmbiguity, MockJobsActions.resolveOcrAmbiguity);
export const rerunJob = mockable(_canonRerunJob, MockJobsActions.rerunJob);
export const retryJobStage = mockable(_canonRetryJobStage, MockJobsActions.retryJobStage);
