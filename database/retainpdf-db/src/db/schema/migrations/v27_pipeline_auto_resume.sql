-- 自动续跑次数（崩溃循环熔断）。
--
-- 启动恢复 / 运行期巡检发现「running 却没有 driver」、又有可续的 attempt 时，会把任务放回
-- queued 自动续跑。一份能把运行时整个弄崩的输入会让它每次重启都续跑、再崩，没有尽头。
-- 这里记下这个 attempt 被自动续跑了几次、上一次续跑时的进度（已提交单元数 + 已完成阶段数）：
-- 两次之间有新进度就从 1 重新数，连续没有进度地续跑超过上限就按失败收尾
-- （runner 的 MAX_AUTO_RESUMES_WITHOUT_PROGRESS）。手动重试 / 续跑认领的是新 attempt，自然从 0 开始。
ALTER TABLE pipeline_attempts ADD COLUMN auto_resume_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE pipeline_attempts ADD COLUMN auto_resume_progress INTEGER NOT NULL DEFAULT 0;
