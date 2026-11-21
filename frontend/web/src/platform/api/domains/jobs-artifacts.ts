import * as MockJobsArtifacts from "../mocks/jobs-artifacts.js";
import {
  fetchJobArtifactsManifest as _canonFetchJobArtifactsManifest,
  fetchJobMarkdown as _canonFetchJobMarkdown,
} from "@retainpdf/api/jobs-artifacts";
import { mockable } from "./_mockable.js";

export type { JobArtifactLinks } from "@retainpdf/api/jobs-artifacts";
export const fetchJobArtifactsManifest = mockable(_canonFetchJobArtifactsManifest, MockJobsArtifacts.fetchJobArtifactsManifest);
export const fetchJobMarkdown = mockable(_canonFetchJobMarkdown, MockJobsArtifacts.fetchJobMarkdown);
