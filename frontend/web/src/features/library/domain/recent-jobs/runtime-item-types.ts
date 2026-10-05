// recent-jobs 卡片运行时形状（纯类型，无逻辑）。

export interface StageProgress {
  current?: number | null;
  total?: number | null;
  percent?: number | null;
  unit?: string | null;
  [key: string]: unknown;
}

export interface StageSnapshot {
  stageKey?: string;
  source?: string;
  publicStage?: string;
  lane?: string;
  substage?: string;
  detail?: string;
  progress?: StageProgress;
  [key: string]: unknown;
}

export interface RuntimeStatus {
  stageKey?: string;
  publicStage?: string;
  source?: string;
  lane?: string;
  substage?: string;
  detail?: string;
  progress?: StageProgress;
  [key: string]: unknown;
}

/** 图书馆 / recent-jobs 卡片条目(运行时合并态) */
export interface LibraryJobItem {
  job_id?: string;
  document_id?: string;
  active_job_id?: string;
  source_job_id?: string;
  id?: string;
  status?: string;
  stage?: string;
  display_stage?: string;
  lane?: string;
  substage?: string;
  stage_detail?: string;
  workflow?: string;
  job_type?: string;
  title?: string;
  display_name?: string;
  source_file_name?: string;
  page_count?: number | null;
  cover_url?: string;
  thumbnail_url?: string;
  created_at?: string;
  updated_at?: string;
  progress?: StageProgress;
  runtime_status?: RuntimeStatus;
  background_stages?: unknown[];
  stage_snapshot?: StageSnapshot;
  book_summary?: {
    source_file_name?: string;
    page_count?: number | null;
    [key: string]: unknown;
  };
  library_only?: boolean;
  output_pdf_ready?: boolean;
  markdown_ready?: boolean;
  bundle_ready?: boolean;
  [key: string]: unknown;
}

export interface StageAdapterPort {
  adaptJobStageSnapshot?: (job: LibraryJobItem) => StageSnapshot | null | undefined;
}

export interface RuntimeItemOptions {
  stageAdapterPort?: StageAdapterPort;
}
