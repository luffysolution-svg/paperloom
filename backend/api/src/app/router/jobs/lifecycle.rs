//! 任务：有哪些任务、建一个、看一个、删一个。

use crate::app::AppState;
use crate::routes::jobs::lifecycle;

crate::endpoints! {
    state: AppState;
    /// 新建任务（翻译、只做 OCR、重新渲染……，按请求里的 workflow 分）
    POST "/api/v1/jobs" => lifecycle::create_job, signed;
    /// 任务列表
    GET "/api/v1/jobs" => lifecycle::list_jobs, signed;
    /// 任务详情：状态、进度、产物链接、能做的操作
    GET "/api/v1/jobs/:job_id" => lifecycle::get_job, signed;
    /// 删一个任务和它的 OCR 子任务，书留着（OCR 任务也能删；运行中要 force，被别的任务用着 409）
    DELETE "/api/v1/jobs/:job_id" => lifecycle::delete_job, signed;
}
