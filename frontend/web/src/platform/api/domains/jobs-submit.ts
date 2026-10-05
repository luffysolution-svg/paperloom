import * as MockJobsSubmit from "../mocks/jobs-submit.js";
import { submitJobRequest as _canonSubmitJobRequest } from "@retainpdf/api/jobs-submit";
import { mockable } from "./_mockable.js";

export const submitJobRequest = mockable(_canonSubmitJobRequest, MockJobsSubmit.submitJobRequest);
