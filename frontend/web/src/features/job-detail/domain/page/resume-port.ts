import { defaultJobDetailDataPort } from "./data-port.js";

/** 恢复端口依赖：断点续跑 POST /jobs/:id/actions/resume（按 job_id） */
export interface JobDetailResumePortDeps {
  apiPrefix?: string;
  resumeJob: (jobId: string, apiPrefix: string) => Promise<unknown>;
}

export interface JobDetailResumeSubmitOptions {
  jobId?: string;
}

export function createJobDetailResumePort({
  apiPrefix = "",
  resumeJob,
}: JobDetailResumePortDeps) {
  return {
    async submit({ jobId = "" }: JobDetailResumeSubmitOptions = {}) {
      const resolvedJobId = `${jobId || ""}`.trim();
      if (!resolvedJobId) {
        throw new Error("缺少 job_id，无法从断点恢复。");
      }
      return resumeJob(resolvedJobId, apiPrefix);
    },
  };
}

export const defaultJobDetailResumePort = createJobDetailResumePort({
  apiPrefix: defaultJobDetailDataPort.apiPrefix,
  resumeJob: defaultJobDetailDataPort.resumeJob,
});
