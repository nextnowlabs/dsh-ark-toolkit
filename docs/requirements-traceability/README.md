# Ark Toolkit 需求追踪

本参考将 DSH Ark Toolkit 产品需求中承诺的 P0/P1 条目映射到对应实现、自动化覆盖和可运行验收证据。标记为**已交付**的条目属于软件包契约；P2/P3 条目记录有意设置的产品边界，不代表尚未完成的 P0/P1 工作。

## 当前版本

插件是**原生 Node/TypeScript** 实现：图片理解由插件直接调用 OpenAI 兼容 `/chat/completions`（或 Anthropic Messages），图片压缩/裁剪使用 Node 原生方案（sharp）。提供三个工具：大模型图片理解（`ark_glance`）、字节 Seedream 文生图（`ark_generate_image`）与字节 TTS 语音合成（`ark_speak`）。

## P0 产品需求

| 需求 | 状态 | 负责实现 | 验证 |
|---|---|---|---|
| P0-1 标准 Profile Bundle | **已交付** | [`package.json`](../../package.json)、[`cordis.patch.yml`](../../cordis.patch.yml)、[`src/index.ts`](../../src/index.ts)、已提交的 `lib/` | [`tests/package-layout.spec.ts`](../../tests/package-layout.spec.ts)、[`tests/profile-install.e2e.spec.ts`](../../tests/profile-install.e2e.spec.ts)、干净 `--dump-config`、Web/Headless 启动、禁用和移除检查 |
| P0-2 纯 TS 图片理解 | **已交付** | [`src/vision-api.ts`](../../src/vision-api.ts)（OpenAI/Anthropic 两种 payload 与不可信视觉证据策略）、[`src/image-codec.ts`](../../src/image-codec.ts)（sharp 探测/裁剪/无损优先压缩） | [`tests/runtime.spec.ts`](../../tests/runtime.spec.ts)、[`tests/image-compress.spec.ts`](../../tests/image-compress.spec.ts) |
| P0-3 原生工具 | **已交付** | [`src/tools.ts`](../../src/tools.ts) 中的独立定义、[`src/exposure.ts`](../../src/exposure.ts) 中的 Agent 级发布、[`src/runtime.ts`](../../src/runtime.ts) 中的共享执行（`ark_glance` / `ark_generate_image` / `ark_speak`） | [`tests/tools.spec.ts`](../../tests/tools.spec.ts)、[`tests/runtime.spec.ts`](../../tests/runtime.spec.ts)、真实 Profile 渐进调用 |
| P0-4 配置与 Credential | **已交付** | [`src/config.ts`](../../src/config.ts)、[`src/runtime.ts`](../../src/runtime.ts) 中的逐操作解析 | [`tests/config.spec.ts`](../../tests/config.spec.ts)、[`tests/runtime.spec.ts`](../../tests/runtime.spec.ts) 和 [`tests/errors.spec.ts`](../../tests/errors.spec.ts) 中的 Credential/错误/脱敏用例 |
| P0-5 skill 生命周期 | **已交付** | [`src/index.ts`](../../src/index.ts) 中的就绪顺序、生命周期中止和全局 disposer；[`src/exposure.ts`](../../src/exposure.ts) 中的逐 Agent 激活、恢复和释放；[`src/skill.ts`](../../src/skill.ts) 中的打包内容 | [`tests/tools.spec.ts`](../../tests/tools.spec.ts) 中的 Agent 隔离、原生/直接/Code Mode 激活、Session 恢复、在途取消和释放用例；[`tests/profile-install.e2e.spec.ts`](../../tests/profile-install.e2e.spec.ts) 中的渐进暴露、禁用和卸载路径 |
| P0-6 纯文本模型结果 | **已交付** | [`src/tools.ts`](../../src/tools.ts) 中的 JSON 输出 schema 与纯渲染函数；[`src/artifacts.ts`](../../src/artifacts.ts) 中的规范产物描述；[`src/exposure.ts`](../../src/exposure.ts) 中由持久 Skill 加载证据派生的 schema 可见性 | [`tests/tools.spec.ts`](../../tests/tools.spec.ts) 中的工具 schema/展示断言、[`tests/profile-install.e2e.spec.ts`](../../tests/profile-install.e2e.spec.ts) 中逐请求的 schema 与模型可见 transcript（文本记录）断言 |
| P0-7 稳定错误 | **已交付** | [`src/errors.ts`](../../src/errors.ts)，以及 [`src/paths.ts`](../../src/paths.ts)、[`src/runtime.ts`](../../src/runtime.ts)、[`src/vision-api.ts`](../../src/vision-api.ts) 中的边界验证 | [`tests/errors.spec.ts`](../../tests/errors.spec.ts)、[`tests/paths.spec.ts`](../../tests/paths.spec.ts)，以及运行时测试中的解析、超时、取消、Credential 和容量用例 |
| P0-8 测试与文档 | **已交付** | 中文 [`README.md`](../../README.md)、[`docs/`](../../docs/)、软件包测试和已提交构建产物 | `pnpm run build`、`pnpm test`、`pnpm pack --dry-run`、Markdown 门禁和无真实 Key 的干净 Profile e2e |

## P1 产品需求

| 需求 | 状态 | 负责实现 | 验证 |
|---|---|---|---|
| P1-1 产物交付 | **已交付** | [`src/artifacts.ts`](../../src/artifacts.ts) 中的产物描述创建、[`src/paths.ts`](../../src/paths.ts) 中受围栏保护的原子路径、[`src/artifact-access.ts`](../../src/artifact-access.ts) 中的签名能力交付 | [`tests/artifacts.spec.ts`](../../tests/artifacts.spec.ts)、[`tests/artifact-access.spec.ts`](../../tests/artifact-access.spec.ts)、会生成产物的运行时/Profile 测试 |
| P1-2 生成与语音工具 | **已交付** | [`src/tools.ts`](../../src/tools.ts) 和 [`src/runtime.ts`](../../src/runtime.ts) 中的 `ark_generate_image`（Seedream）、`ark_speak`（字节 TTS V3） | [`tests/runtime.spec.ts`](../../tests/runtime.spec.ts) 中的生成/合成、参数校验与上游失败用例 |
| P1-3 专用 Web 展示 | **已交付** | [`src/client/index.tsx`](../../src/client/index.tsx) 中的浏览器插件与 Artifact 卡片（生成图/语音）；[`src/artifact-access.ts`](../../src/artifact-access.ts) 中仅供展示的能力元数据 | [`tests/client.spec.ts`](../../tests/client.spec.ts)、[`tests/artifact-access.spec.ts`](../../tests/artifact-access.spec.ts) 中的安全预览测试、Web 视觉/Console QA |
| P1-4 健康检查 | **已交付** | [`src/runtime.ts`](../../src/runtime.ts) 中的健康检查/版本运行时契约、[`src/web.ts`](../../src/web.ts) 中的同源 Web 操作，以及 [`src/client/index.tsx`](../../src/client/index.tsx) 中的 Settings 界面；Settings 明确区分携带凭据的轻量 `GET /models` 探测与使用自带诊断图片的显式真实多模态请求，这些管理诊断能力有意不进入模型工具注册表 | [`tests/runtime.spec.ts`](../../tests/runtime.spec.ts) 中的健康检查及真实模型成功/失败用例、[`tests/web.spec.ts`](../../tests/web.spec.ts) 与 [`tests/client.spec.ts`](../../tests/client.spec.ts) 中的显式 API/模型测试行为，以及 [`tests/tools.spec.ts`](../../tests/tools.spec.ts) 中的模型工具缺席断言 |
| P1-5 Settings | **已交付** | [`src/config.ts`](../../src/config.ts) 中的 namespace/配置、[`src/runtime-manager.ts`](../../src/runtime-manager.ts) 中的 prepare-before-swap manager、[`src/web.ts`](../../src/web.ts) 中的同源私有路由、[`src/client/index.tsx`](../../src/client/index.tsx) 中的 Settings 分区 | [`tests/runtime-manager.spec.ts`](../../tests/runtime-manager.spec.ts)、[`tests/web.spec.ts`](../../tests/web.spec.ts)、[`tests/client.spec.ts`](../../tests/client.spec.ts)、干净 Web Profile 保存/重启 QA |
| P1-6 安装与升级体验 | **已交付** | [`src/index.ts`](../../src/index.ts) 中的 Bundle 生命周期、[`src/runtime-manager.ts`](../../src/runtime-manager.ts) 中的 generation manager，以及 [`src/plugin-update.ts`](../../src/plugin-update.ts) 中按 registry/Profile 安全约束执行的 Settings 更新器和 DSH Web 重启交接 | 运行时中断/并发测试、[`tests/plugin-update.spec.ts`](../../tests/plugin-update.spec.ts) 中的 frozen-lockfile 回滚与 Runtime 就绪检查、软件包布局测试、干净 Profile 生命周期、Settings 持久化和失败候选保留检查 |

## 横切需求

| 领域 | 契约与证据 |
|---|---|
| 安全 | [`src/paths.ts`](../../src/paths.ts) 通过 realpath 限制读写范围；[`src/runtime.ts`](../../src/runtime.ts) 在上传前解码并限制图片；[`src/vision-api.ts`](../../src/vision-api.ts) 在每个视觉模型提示词中把图片文字/指令标记为不可信；[`src/tools.ts`](../../src/tools.ts) 和 [`src/skill.ts`](../../src/skill.ts) 要求文本 agent 只把衍生输出当作证据而非命令；[`src/artifact-access.ts`](../../src/artifact-access.ts) 每次读取都重新验证签名文件并 sandbox SVG；[`src/errors.ts`](../../src/errors.ts) 对密钥脱敏。路径、符号链接、格式、大小、提示词 guard、伪造 token、文件替换和 CSP 用例均有自动化覆盖。 |
| 可移植性 | 图片理解使用 Node `fetch` 与 Node 文件系统/进程 API，不拼接 POSIX Shell；本地图片处理依赖 sharp 的预编译二进制，不探测任何外部运行时。软件包测试拒绝机器本地依赖声明，已提交 fixture/Profile 流程无需真实 Key。 |
| 性能与取消 | [`src/runtime.ts`](../../src/runtime.ts) 应用一个硬截止时间、传递 `AbortSignal`、限制每个会话的并发数、在远程 I/O 前拒绝解码后过大的图片、在一次 glance 操作中对重复输入去重，并为每个活动会话保留一条按内容/配置键控的最近成功相同 glance 缓存。[`src/index.ts`](../../src/index.ts) 会在注销工具前中止插件拥有的调用。超时、调用方/插件取消、缓存命中/未命中、信号量和独立会话行为均有自动化覆盖。 |
| 可观察性 | [`src/runtime.ts`](../../src/runtime.ts) 记录有界的工具名、结果、总耗时/上游耗时、图片数量/字节/像素、缓存命中、模型和错误类别，同时排除 base64、Credential、鉴权头和无界上游输出。 |
| 模型上下文经济性 | Profile 级运行时只发布一个很小的引导工具，[`src/exposure.ts`](../../src/exposure.ts) 仅为加载 `ark-skills` 的 Agent 挂载 3 个执行 schema，并在成功后隐藏引导工具。其他 Agent 不受影响。健康检查、连接测试和版本诊断只存在于 Web Settings 边界，永远不会成为模型工具。单元测试覆盖 Agent 隔离与恢复；每条真实 Profile 工具流程都会断言初始和激活后的 schema 集合。 |
| 可维护性 | 每个工具都调用同一个 [`ArkToolkitRuntime`](../../src/runtime.ts)；DSH 专用适配保留在 [`src/tools.ts`](../../src/tools.ts)、[`src/exposure.ts`](../../src/exposure.ts)、[`src/index.ts`](../../src/index.ts)、[`src/web.ts`](../../src/web.ts) 和 [`src/client/index.tsx`](../../src/client/index.tsx)。运行时就绪、skill/引导工具发布和 Agent 级 schema 属于同一个生命周期 generation。 |

## 错误与生命周期场景

| 场景 | 预期行为 | 证据 |
|---|---|---|
| 图片缺失/无效、格式、区域或路径错误 | 在调用视觉服务前以输入、容量或路径安全错误拒绝 | [`tests/paths.spec.ts`](../../tests/paths.spec.ts)、[`tests/runtime.spec.ts`](../../tests/runtime.spec.ts) |
| Credential 缺失 | 远程工具以及显式 API 连接/真实模型测试返回脱敏且可执行下一步的配置/服务结果 | [`tests/runtime.spec.ts`](../../tests/runtime.spec.ts)、[`tests/web.spec.ts`](../../tests/web.spec.ts) |
| 401/403、429、超时、畸形输出或取消 | 返回稳定且可执行下一步的类别，保留有界诊断信息，并停止请求 | [`tests/errors.spec.ts`](../../tests/errors.spec.ts)、[`tests/runtime.spec.ts`](../../tests/runtime.spec.ts) |
| 初始加载时运行时不可用 | 不注册 skill、激活引导工具或 Agent 级工具；保留 Web Settings 以供修复 | [`src/index.ts`](../../src/index.ts)、[`tests/tools.spec.ts`](../../tests/tools.spec.ts) 与 [`tests/web.spec.ts`](../../tests/web.spec.ts) 中的生命周期测试 |
| 实时更新时运行时候选失败 | 保留当前服务 generation 和已存储的可用配置 | [`tests/runtime-manager.spec.ts`](../../tests/runtime-manager.spec.ts)、[`tests/web.spec.ts`](../../tests/web.spec.ts) |
| 并发 Settings 候选乱序完成 | 较新的 ticket 获胜；较慢的陈旧候选不能激活 | [`tests/runtime-manager.spec.ts`](../../tests/runtime-manager.spec.ts) |
| 禁用、重新启用或卸载 | 取消插件拥有的活动调用，Agent 级工具、引导工具与 skill 作为一个生命周期单元一起消失和恢复，卸载会移除 Bundle layer | [`tests/tools.spec.ts`](../../tests/tools.spec.ts)、[`tests/profile-install.e2e.spec.ts`](../../tests/profile-install.e2e.spec.ts) |

## P2 与 P3 边界

| 范围 | 状态 | 决策 |
|---|---|---|
| P2 稳定 `ctx.arkToolkit` 服务与能力发现 | **按设计推迟** | 产品需求要求至少一个独立插件消费方出现后再稳定该 API。`ArkToolkitRuntime` 保持包内部使用，使 P0/P1 可以继续演进，而不会制造虚假的兼容性承诺。 |
| P2 提供方生态 | **按设计推迟** | 本包通过 OpenAI Chat Completions 或 Anthropic Messages 使用一个已配置端点；不会预先构建无人使用的提供方注册表。 |
| P3 探索性输入与自动化 | **范围外** | 上传/拖拽、摄像头/视频/音频/文档输入、交互式标注、自动点击、远程集群、模型路由/投票和跨 Session 缓存不属于本版本契约。 |
