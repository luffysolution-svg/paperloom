import * as MockJobsArtifacts from "../mocks/jobs-artifacts.js";
import {
  fetchJobArtifacts as _canonFetchJobArtifacts,
  fetchJobArtifactsManifest as _canonFetchJobArtifactsManifest,
  fetchJobMarkdown as _canonFetchJobMarkdown,
} from "@retainpdf/api/jobs-artifacts";
import { mockable } from "./_mockable.js";

export type { JobArtifactLinks } from "@retainpdf/api/jobs-artifacts";
// Mock manifests already carry the complete artifact set; avoid a second
// network-shaped projection that the mock backend does not expose.
export const fetchJobArtifacts = mockable(_canonFetchJobArtifacts, () => null);
export const fetchJobArtifactsManifest = mockable(_canonFetchJobArtifactsManifest, MockJobsArtifacts.fetchJobArtifactsManifest);
export const fetchJobMarkdown = mockable(_canonFetchJobMarkdown, MockJobsArtifacts.fetchJobMarkdown);
