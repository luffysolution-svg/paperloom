# 发布文件与核对顺序

正式发布前必须完成完整测试、密钥扫描、许可核对和对应源码验证。构建成功不等于已经批准发布。

## 文件放在哪里

- 源码：`frontend/`、`backend/`、`database/`、`contracts/`。
- 用户文档：根目录三种语言 README、`docs/core/`；部署入口为 `ops/deployment/docker/delivery/`。
- 项目治理：`LICENSE`、`LICENSE-MIT`、`CORRESPONDING_SOURCE.md`、`CONTRIBUTING.md`、`SECURITY.md`、`CODE_OF_CONDUCT.md`、`THIRD_PARTY_NOTICES.md`。
- 许可与素材来源：`resources/licenses/`、`resources/fonts/`、README 截图来源记录。真实论文 fixtures 的再分发权限需单独核对。
- 运行数据：`data/`、`var/`、Docker 数据卷；本地验证、备份、候选包和扫描日志：`tmp/`。这些不进入公开仓库或 Release。

## 正式产物

按本次实际验收的平台选择发布范围。不要把未构建、未安装验证的平台写成已发布。

| 产物 | 必须核对 |
| --- | --- |
| Windows NSIS / portable | 新版本号、嵌入的 `app.asar` 与 Rust/Python 代码、运行时及许可文件、安装后启动、解析/翻译/导出；如未签名应说明 |
| macOS DMG / Linux DEB | 对应平台构建、动态库与 Python/Typst/Node、安装后功能验收 |
| Docker app / web | 同一源码版本的两个镜像、`/ready`、同源 API、凭据不输出到浏览器、上传与卷持久化、公开匿名拉取；只标记实际验证的架构 |
| 对应源码 | 与 release tag 一致的完整仓库源码、锁文件、构建输入与许可，以及精确匹配的 PyMuPDF 1.26.5 上游源码；不得包含本地凭据或运行数据 |
| 清单与校验和 | 每个文件的版本、平台、长度、SHA-256；校验和必须在最终构建完成后生成 |

当前 `0.1.2` 文件只能作为本地候选核对，因为仓库已有 `v0.1.2` tag。不要覆盖它，也不要把带有未提交修改的包标成该 tag 的正式产物。

## 源码归档工具

正式桌面 Release 流程会从已提交 tag 生成完整的 `PaperLoom-<version>-source.tar.gz`，并下载、校验和附加精确匹配的 `PyMuPDF-1.26.5-source.tar.gz`。固定来源与 SHA-256 见根目录 `CORRESPONDING_SOURCE.md`。

`build_source_archive.py` 仍用于构建和验证独立后端源码包；它打包的是 **已提交 HEAD**，即使传 `--allow-dirty` 也不会带入未提交功能。因此不能用它生成本轮工作树候选包后宣称与新安装版一致。

```bash
python3 ops/release/build_source_archive.py
```

归档包含 Rust / Python 后端、数据库、字体与许可，以及 Docker 构建 retainpdf2doc 所需的根 npm 锁文件和 workspace manifests。`backend/dist/` 是本地生成目录，不提交。

本地工作树候选快照必须另外记录每个文件的哈希，以及 `includes_uncommitted_changes=true`。它可以用于核对，不能代替发布 revision。历史凭据扫描还需针对最终公开的 git 历史运行；当前源码零命中不能证明旧历史安全。

## 发布动作

版本号、commit、push、tag、GitHub Release 和镜像／产物上传属于正式发布阶段，需维护者明确授权。发布流程不能绕过完整测试、密钥扫描或 AGPL 对应源码门禁。
