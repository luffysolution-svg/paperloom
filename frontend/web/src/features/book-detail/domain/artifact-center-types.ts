import type { DocumentJobSummary } from "@/features/library/domain.js";

export type ArtifactCenterGroupId = "source" | "ocr" | "translation" | "diagnostics" | "agent";

export type ArtifactManifestItem = {
  artifact_key?: string;
  artifact_group?: string;
  artifact_kind?: string;
  ready?: boolean;
  file_name?: string | null;
  filename?: string | null;
  content_type?: string;
  size_bytes?: number | null;
  updated_at?: string | null;
  resource_url?: string | null;
  resource_path?: string | null;
  attempt?: number | null;
  current_attempt?: number | null;
  [key: string]: unknown;
};

export type ArtifactManifest = {
  job_id?: string;
  items?: ArtifactManifestItem[];
};

export type ArtifactResourceLink = {
  ready?: boolean;
  path?: string;
  url?: string;
  file_name?: string | null;
  size_bytes?: number | null;
};

export type ArtifactLinks = {
  pdf_ready?: boolean;
  markdown_ready?: boolean;
  bundle_ready?: boolean;
  pdf_url?: string;
  markdown_url?: string;
  bundle_url?: string;
  normalized_document_url?: string;
  normalization_report_url?: string;
  pdf?: ArtifactResourceLink;
  markdown?: ArtifactResourceLink & {
    raw_path?: string;
    raw_url?: string;
  };
  bundle?: ArtifactResourceLink;
  normalized_document?: ArtifactResourceLink;
  normalization_report?: ArtifactResourceLink;
};

export type ArtifactCenterItem = {
  id: string;
  group: ArtifactCenterGroupId;
  label: string;
  filename: string;
  kind: string;
  url: string;
  sizeBytes: number | null;
  generatedAt: string;
  attempt: number | null;
  jobId: string;
  workflow: string;
  previewable: boolean;
};

export type ArtifactCenterJob = {
  jobId: string;
  workflow: string;
  status: string;
  generatedAt: string;
  attempt: number | null;
  previewable: boolean;
};

export type AgentArtifactProjection = {
  operation_id?: string;
  status?: string;
  current_attempt?: number;
  updated_at?: string;
  candidate?: {
    version_id?: string;
    url?: string;
  } | null;
};

export type ArtifactCenterSection = {
  id: ArtifactCenterGroupId;
  label: string;
  description: string;
  items: ArtifactCenterItem[];
  jobs: ArtifactCenterJob[];
};

export type ArtifactQuickDownloadId = "source" | "markdown" | "translated" | "comparison" | "word";
export type ArtifactQuickDownloads = Record<ArtifactQuickDownloadId, ArtifactCenterItem | null>;

export type BuildArtifactCenterInput = {
  documentId: string;
  source?: {
    filename?: string;
    url?: string;
    sizeBytes?: number | null;
    generatedAt?: string;
  } | null;
  jobs?: DocumentJobSummary[];
  manifests?: Record<string, ArtifactManifest | null | undefined>;
  agentOperations?: AgentArtifactProjection[];
};
