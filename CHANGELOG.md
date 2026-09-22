# Changelog

All notable user-facing changes to DSH Ark Toolkit are documented in this file. The project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and uses semantic version tags.

## [0.1.2] - 2026-09-22

### BREAKING

- **跟进 DSH `0.1.7-alpha.1`。** 全部 `@deepseek-ai/dsh-*` peer/dev 依赖升级到 `0.1.7-alpha.1`（`@deepseek-ai/cordis` 升到 `^4.0.3`，`@deepseek-ai/schemastery` 升到 `^3.18.3`），新增 `@deepseek-ai/cordis-plugin-loader@^1.0.4` 作为 peer 依赖（提供 `loader/volatile-update` 事件的类型声明），以及 `@deepseek-ai/dsh-client-ui-settings`、`@deepseek-ai/dsh-client-ui-plugin-manager` 两个客户端 peer（配置页与共享配置表单的提供方）。**插件配置不再有独立命名空间**：DSH `0.1.7` 删除了 `ctx.settings.register()` / `SettingsScope`（`get`/`watch`/`update`/`replace`）与 `settings.yaml`，改为「插件在 profile 补丁里的那一行 `config` 就是它的设置」，按 **profile entry id**（本插件为 `ark-toolkit`）读写。因此 `ARK_TOOLKIT_SETTINGS_NAMESPACE` 更名为 `ARK_TOOLKIT_ENTRY_ID`（与客户端页面的 `ENTRY_ID` 是同一行 id 的两份声明，两半分开编译、必须逐字一致）；旧 `settings.yaml` 里的 `ark-toolkit` 段需要迁移到 profile 补丁该行的 `config`（DSH 自带的迁移逻辑会读一次 `settings.yaml` 并改名为 `settings.yaml.imported`，未被任何插件接受的段只留在改名后的文件里）。

### Changed

- **配置改为响应式 `volatile` 引用，改配置不再重挂载插件。** `Config` 的每个字段都声明 `.volatile()`：DSH 只接受落在 volatile 节点之下的表单写入（否则报 `Config field ... is not volatile`），并把提交后的值就地写进插件持有的引用，而不是卸载重载插件。插件据此在 `loader/volatile-update` 上重建 runtime：先完整准备新一代，成功后原子切换，失败则保留上一代并在日志里说明原因。新增 `readArkToolkitConfig()` 用于把引用读成普通快照。
- **`settings` 从硬依赖变为可选注入。** Ark 工具的可用性不再取决于 profile 是否挂载 settings 服务——配置本来就来自 Loader entry；只有 **插件** 面板里的配置卡片在没有 settings 时降级。`ctx.settings.configure({ auto: false }, ctx.fiber)` 声明本 bundle 自带配置卡片，避免与通用表单重复。
- **配置页改用平台原语：`plugins.item` 页面 + `ctx.configForms`。** 配置界面从「bundle 页面里的自制卡片」改为**本插件在「设置 → 插件」里的独立页面**（`plugins.item` 列表槽，`id` 为 profile entry id `ark-toolkit`，`whileServed` 保证宿主未加载该行时整页不出现），表单用平台的 `SettingsForm` / `SettingsValueField` / `SettingsSecretField` 渲染，读写走 `ctx.configForms.get(entryId)` 的 `mutate`。字段按嵌套路径寻址（如 `['provider','tts','voice']`），一次保存=一次带 revision 栅栏的原子写入，草稿只在保存时才落盘。
- **删掉自带的配置与凭据 HTTP 路由。** `src/web.ts` 不再提供 `action: 'save'` / `action: 'credential'`，也不再从宿主侧读写配置——DSH `0.1.7` 的 Remote `settings` 与 `credentials` 域本身就是带 revision 栅栏、密钥出站单向、且在 wire 边界脱敏的正规路径，私有路由只会是同一条文档的第二条更弱的写入口。`src/settings-form.ts` 随之删除，`src/index.ts` 只保留 `ctx.settings.configure({ auto: false }, ctx.fiber)`（声明本 bundle 自带配置页）。剩下的 `/_dsh/ark-toolkit/settings` 只承载**动作**：健康检查与插件更新。
- **凭据徽标改由 `remote.credentials` 驱动。** API Key / TTS Token 的「已配置 / 只读 / 来源」状态通过 `ctx.remote.credentials.describe()` 读取，写入通过 `credentials.set()`；两者都在浏览器侧完成，密钥永不经过插件的自有路由。粘贴校验（`KEY=value` 整行、引号包裹、非可打印字符）保留在客户端，并在下次编辑时自动清除提示。
- **初始配置非法时响亮失败。** 与 DSH 自家插件一致：schema 通过但 `resolveConfig` 拒绝的初始配置（如 `provider.baseUrl` 不是 http(s)）会**中止插件激活**并报出具体字段，而不是挂载一套永远跑不通的能力。只有*热更新*才走「保留上一代 + 记录错误」。

### Fixed

- **修复健康检查的产物目录永远报错。** Web 卡片里的健康检查使用 `$TMPDIR/dsh-ark-toolkit-health-<pid>` 作为临时工作区，但从未创建它；产物路径策略在暂存前会先解析该工作区，目录不存在即抛错，于是「产物目录」一项无论配置如何都显示 Error。现在先 `mkdir` 再探测，该项如实反映真实工作区。
- **跟进 DSH `0.1.7` 移除 `tool-result` 内容块。** 工具结果不再是 `ContentBlock` 联合的一支，而是独立的 `ToolResultMessage`（直接携带 `toolCallId`/`isError`/`content`）。历史会话里「是否加载过 ark-skills」的判定随之简化：不再遍历消息内容找 `type === 'tool-result'` 的块，改为直接读该消息本身。旧写法在 `0.1.7` 上已无法通过类型检查，强行兼容会让「从历史恢复激活」永久失效。

### Internal

- **`pnpm-workspace.yaml` 同步重生成。** `allowBuilds` 更新为 `@deepseek-ai/dsh-subprocess-local@0.1.7-alpha.1`，`minimumReleaseAgeExclude` 按新 lockfile 的实际解析结果整体重生成（新增 `cordis-plugin-include`、`cosmokit`、`dsh-app-boot`、`dsh-config-editor`、`dsh-session-format-v3-to-v4` 等）；删除旧 lockfile 并用全新元数据重新解析，避免旧 metadata 缓存把自动安装的 peer 解析回 `0.1.6-alpha.2` 形成混装。
- **测试夹具适配新模型。** `tests/client.spec.ts` 用一份内存 `ConfigForm`（`getSnapshot`/`subscribe`/`mutate`）与假 `remote.credentials` 驱动配置页，覆盖「暂存不写盘」「一次保存=一条嵌套路径 mutate」「字段清空→`unset`」「非法数字阻止保存」「宿主拒绝后保留草稿」「凭据只走 credentials 域」「只读文档禁用控件」「`whileServed` 门控」「健康检查与更新动作」等用例；`tests/client-ui-primitives-stub.tsx` 补齐 `SettingsForm` / `SettingsValueField` / `SettingsSecretField` 的 DOM 替身；`tests/web.spec.ts` 收敛为动作路由（运行时状态、健康检查、更新、来源校验），并断言配置写入**不再**经由该路由；`tests/tools.spec.ts` 删除已失效的 settings provider 夹具（插件不再需要它）；`tests/config.spec.ts` 新增 volatile 契约用例（字段必须暴露 `get()`、快照冻结、引用身份稳定、缺省节默认值齐备）。
- **客户端类型面补齐子路径解析。** `tsconfig.client.json` 为 `@deepseek-ai/dsh-client-ui-settings/client`、`@deepseek-ai/dsh-client-ui-plugin-manager/client`、以及 `dsh-api-remotes` 转引的 `@deepseek-ai/dsh-api-gateway/client` 与 `@deepseek-ai/dsh-api-settings-controller/remote` 补上 `paths`：客户端走 node10 解析读不到包的 `exports` 子路径，缺失时类型会**静默退化**成 any（`ctx.configForms`、`ctx.remote.credentials` 都会变成不存在的属性）。

## [0.1.1] - 2026-09-22

### Changed

- **跟进 DSH `0.1.6-alpha.2`。** 全部 `@deepseek-ai/dsh-*` peer/dev 依赖升级到 `0.1.6-alpha.2`（`@deepseek-ai/cordis` 仍为 `^4.0.2`，`@deepseek-ai/schemastery` 仍为 `^3.18.1`）。`pnpm-workspace.yaml` 的 `allowBuilds` 更新为 `koffi@3.3.1`（原 `3.2.1`），`minimumReleaseAgeExclude` 按 lockfile 的实际解析结果整体重生成（`dsh-code-runtime` 已更名为 `dsh-ptc-runtime`，新增 `dsh-compaction`、`dsh-lazy-require`、`dsh-sandbox-policy`、`dsh-session-format*` 等）；删除 lockfile 并用全新元数据重新解析，避免 pnpm 的旧 metadata 缓存把自动安装的 peer 解析回 `0.1.5-rc.2` 形成混装。
- **插件配置卡片迁移到插件页面。** DSH `0.1.6` 下线了 **设置 → 插件 → 插件配置** 标签页与 `settings.plugin.item` 座位，第三方 bundle 的配置改由 **插件** 面板（Plugins）的 `plugins.bundle.config` 槽承载，按 bundle 的**包名**键控并渲染在插件自己的页面上。卡片随之迁移：注册键由 `ark-toolkit` 命名空间改为 `@nextnowlabs/dsh-ark-toolkit`，根元素由 `<li>` 改为块级容器（新座位由页面的 `<section>` 承载，不在 `<ul>` 里），并实现槽位契约的 `page`/`summary` 两种视图；`dsh.client.inject` 与 peerDependencies 中的 `@deepseek-ai/dsh-client-ui-settings` 由 `@deepseek-ai/dsh-client-ui-plugin-manager` 取代。凭据、健康检查、连接与模型测试、插件更新等卡片能力保持不变。

### Fixed

- **CI 的 Profile 验收此前从未真正生效。** 工作流设置的环境变量名是上个版本重命名遗留的 `DSH_VISION_REQUIRE_PROFILE_E2E`，而测试读取的是 `DSH_ARK_REQUIRE_PROFILE_E2E`，因此"必须跑通 Profile 验收"的守卫被静默跳过；现已对齐，并把 CI 安装的 DSH CLI 从 `0.1.2-rc.1` 升到 `0.1.6-alpha.2`。

### Internal

- **适配会话创建改为异步。** DSH `0.1.6` 的 `agents.register()` 改为可 await 的 Cordis effect，`agent/created` 经 serial 派发器异步投递，监听器抛错即否决 Agent 创建。插件的监听器与"从历史恢复激活"逻辑无需改动，但测试必须在 `await ctx.agents.register(agent)` 之后再断言。
- **Profile 验收的脚本化 LLM 改用 Messages 协议。** DSH `0.1.6` 把 `llm-deepseek` 的默认协议从 `chat-completions` 改为 `messages`，验收 fixture 改为应答 `/v1/messages` 的 Anthropic 风格 SSE（`tool_use`/`text` 内容块），工具名断言改读 Messages 扁平的 `tools[].name`。
- **Profile 依赖布局断言更新。** DSH `0.1.6` 不再把宿主作用域的包提升到 `profiles/node_modules`，断言改为"profile 自身的 node_modules 中既无裸 `schemastery`、也无 `@deepseek-ai` 目录"，继续守住"插件不夹带宿主包副本"的可移植性契约。

## [0.1.0] - 2026-09-11

### BREAKING

- **移除图片理解（识图）能力。** DSH `0.1.5-rc.2` 起 DeepSeek 模型原生声明图片输入（如新增默认模型 `deepseek-flash` 的 `inputModalities: ["text", "image"]`），识图不再需要插件代劳。以下内容全部删除：
  - `ark_glance` 工具，以及 `provider.model`（图片理解模型）、`provider.protocol`（OpenAI/Anthropic 视觉协议）、`language`（视觉输出语言）、`maxImageBytes` / `maxImagePixels`（上传前压缩预算）、`imageInputVariants`（文本模型图片变体）、`allowedDirs`（额外输入目录）等配置项；
  - 视觉 API 客户端 `src/vision-api.ts`、图片裁剪/压缩、按内容键控的压缩缓存与 glance 结果去重缓存；
  - 文本模型图片代理路由（`src/image-input-variants.ts`）、粘贴图片接管（`src/paste-images.ts` 与对应客户端代码）、模型选择器变体隐藏（`src/client/model-variants-hider.ts`）与 `display-config` 路由；
  - 健康检查中的“视觉模型”实测项与“测试视觉模型”按钮。
  - 旧配置里的这些字段会被**安全忽略**，不会导致插件加载失败；`ark_glance` 的调用需要改用模型的原生图片输入。
- **Web 客户端不再接管粘贴。** 图片粘贴、历史图片与 `read_image` 全部回到 DSH 原生附件流程；`dsh.client.inject` 移除 `@deepseek-ai/dsh-client-ui-input-trigger`，peerDependencies 移除 `@deepseek-ai/dsh-attachment`。
- **TTS 语音合成与 Seedream 文生图不受影响**，凭据名（`ARK_API_KEY` / `VOLCENGINE_TTS_KEY`）、模型别名与既有参数保持兼容。

### Changed

- **跟进 DSH `0.1.5-rc.2`。** 全部 `@deepseek-ai/dsh-*` peer/dev 依赖升级到 `0.1.5-rc.2`（`@deepseek-ai/schemastery` 随宿主升到 `3.18.2`），`pnpm-workspace.yaml` 的 `allowBuilds`/`minimumReleaseAgeExclude` 同步更新（`koffi` 3.1.5 → 3.2.1）。旧 lockfile 会把 `@deepseek-ai/dsh-sandbox` 解析到不存在的 `^0.1.5` 区间并导致安装失败，需要重新生成 `pnpm-lock.yaml`。
- **适配 DSH 0.1.5 的事件重命名。** 会话事件 `tool/code-dispatch` → `tool/ptc-dispatch`（子调用 id `<parent>:code:<n>` → `<parent>:ptc:<n>`），历史会话的 PTC 模式激活恢复逻辑同步适配。
- **修复设置卡片的事件订阅。** 原先尝试用 `ctx.remote.$on('credentials/updated')` 与不存在的 `settings/changed` / `credentials/changed` 兜底，实际从未生效；现在改用真正的转发事件 `settings/document-updated` 与 `credentials/reference-updated`，保存密钥或改动设置后卡片会正确刷新。
- **设置界面精简。** Ark Toolkit 卡片只保留 Ark 文生图与 TTS 两组服务配置、健康检查与插件更新；高级设置保留凭据名、端点、User-Agent、超时与并发。
- **文档重写。** `docs/ark-doubao-vision.md` → `docs/ark-doubao.md`（只讲 Seedream 文生图），README、安装指南与需求追踪同步更新。

### Fixed

- **超时覆盖排队时间的问题。** 排队等待并发槽位后重新起算执行超时，不再让先前的排队时间吃掉执行预算。

## [0.0.7] - 2026-09-03

### Changed

- **跟进 DSH `0.1.2-rc.1`。** 依赖与代码全面适配新版本 DeepSeek Harness：`@deepseek-ai/dsh-client-runtime`（npm 已停更）从 `dsh.client.inject`、peerDependencies 与客户端代码中移除，`ClientContext` 改用 `@deepseek-ai/cordis` 的 `Context`，`ctx.slots` 类型声明迁移到 `@deepseek-ai/dsh-client-ui-renderer/client`，`ToolCallBlock` 改从 `@deepseek-ai/dsh-client-ui-chat/client` 引入；所有 `@deepseek-ai/dsh-*` peer 依赖与开发依赖升级到 `0.1.2-rc.1`，`@deepseek-ai/cordis` 提升到 `^4.0.2`。
- **设置命名空间改为字符串字面量。** `settingsNamespace('ark-toolkit')` 构造函数已删除，`ARK_TOOLKIT_SETTINGS_NAMESPACE` 直接使用 `'ark-toolkit'` 字符串；Host 侧 `ctx.settings.register` / `replace` 与 `SettingsConflictError` 调用同步适配。
- **`ctx.slash` 遗留服务移除。** 粘贴图片的引用编解码器统一通过 `inputTriggers` 服务注册（旧 `slash` 兼容层与跨服务去重逻辑删除）；`dsh-llm` 默认导出从 `LlmService` 更名为 `LlmRuntime`，`Session.events` 改为 `session.snapshotEvents()`。
- **Profile 验收测试适配 pnpm 11。** `profile-install.e2e` 在初始化 headless Profile 时预置 `pnpm-workspace.yaml` 的 `allowBuilds.sharp`（pnpm 11 对原生构建脚本按工作区门控），并把测试工具清单更新为当前 `ark_glance` / `ark_generate_image` / `ark_speak` 三个工具，移除了已删除的 `vision_*` 本地工具用例。

## [0.0.5] - 2026-08-22

### Changed

- **设置界面迁移为插件配置卡片。** 配置入口从独立设置页（`settings.section` 导航项）迁移到 **设置 → 插件 → 插件配置** 标签页的 `settings.plugin.item` 卡片，按 `ark-toolkit` 设置命名空间键控、仅在该命名空间被 Host 服务时渲染：卡片默认折叠、头部展示凭据状态，保存/健康检查/连接与模型测试/插件更新等能力保持不变。
- **工具与技能统一命名为 `ark_*`。** 模型可见的三个工具从 `vision_glance` / `vision_generate_image` / `vision_speak` 重命名为 `ark_glance` / `ark_generate_image` / `ark_speak`，随附技能从 `vision-skills` 重命名为 `ark-skills`，以与软件包名 `dsh-ark-toolkit` 保持一致。旧技能名（`vision-skills`、`vision-tools`）仍会被识别，用于恢复旧 Session 的激活状态；客户端文案、文档与示例同步更新。
- **DSH rc 版本跟进。** 开发/CI 依赖与 Profile 验收从 `0.1.0-rc.6` 升级到当前 `0.1.0-rc.8`（devDependencies、pnpm-workspace allowBuilds、CI 安装的 DSH CLI、`profile-install.e2e` 的 `REQUIRED_DSH_VERSION`），peer 依赖保持 `^0.1.0-rc.6` 灵活范围以兼容频繁更新的 DSH rc 版本。
- **纯 TypeScript 精简版。** 移除 vendored Python 工具链（`agent-vision-toolkit` 适配层、托管/系统 Python 引导、Pillow/numpy/vtracer 运行时）与全部本地像素工具（`vision_ground`、`vision_detect`、`vision_crop`、`vision_trace`、`vision_pixel_diff`、`vision_long_screenshot_ocr`、`vision_extract_foreground`、`vision_dominant_colors`、`vision_html_screenshot`）。图片理解改为 TS 直连 OpenAI 兼容 `/chat/completions`（或 Anthropic Messages），图片压缩/裁剪改用 Node 原生方案（sharp），不再需要 Python、Chrome 或任何隔离运行环境。仅保留 `ark_glance`（图片理解）、`ark_generate_image`（Seedream 文生图）、`ark_speak`（字节 TTS 语音合成）三个工具。
- **配置精简。** 删除 `runtime` 配置项（`mode`/`agentVisionToolkitPath`/`python`）；健康检查仅保留 Credential、Artifact 目录、服务与模型四项；README 与安装指南同步更新，`docs/python-runtime.md` 删除。
- **修复 TTS 语音合成报错。** `ark_speak` 改用新版控制台 API Key 鉴权（`X-Api-Key`/`X-Api-Resource-Id` 请求头 + `req_params` 请求体），修复服务器返回 `resource id empty`（code 45000000）的问题；SSE 音频事件解析同步改为读取 `data` 字段。

### BREAKING

- `runtime` 配置项与 `VISION_SSL_VERIFY` 环境变量不再生效；`vision_ground`/`vision_detect`/`vision_crop`/`vision_trace`/`vision_pixel_diff`/`vision_long_screenshot_ocr`/`vision_extract_foreground`/`vision_dominant_colors`/`vision_html_screenshot` 工具不再可用。
- **工具与技能重命名。** `vision_glance` → `ark_glance`、`vision_generate_image` → `ark_generate_image`、`vision_speak` → `ark_speak`、`vision-skills` → `ark-skills`；现有 Agent 提示词与脚本中的旧工具名需同步更新。

- **ByteDance-only backend.** The backend switched from the built-in free Gemini/Qwen service to ByteDance Volcengine Ark (`https://ark.cn-beijing.volces.com/api/v3`). Image understanding now uses the Doubao Seed Vision model (`doubao-seed-2-0-lite-260215`) over OpenAI-compatible `/chat/completions`; the Gemini/Qwen/Gemma/Moondream model aliases and the `ANIONEX_FREE_VISION` built-in credential were removed, and the obsolete `workers/moondream-openai-proxy` was deleted. The Ark API key is supplied by the user and stored as the `ARK_API_KEY` DSH Credential.

### Added

- **`ark_generate_image` tool.** Generates images with the ByteDance Seedream model through Ark `/images/generations` (aliases `seedream-5.0-pro`/`seedream-5.0-lite`/`seedream-4.5`/`seedream-4.0`), and delivers each result as a PNG/JPEG workspace Artifact.
- **`ark_speak` tool.** Synthesizes speech with the ByteDance Volcengine Speech TTS V3 service (豆包语音合成模型2.0, resource `seed-tts-2.0`) over the unidirectional SSE endpoint, and delivers MP3/OGG/PCM/WAV audio as a workspace Artifact. The TTS token is stored as the `VOLCENGINE_TTS_KEY` DSH Credential (configurable under `provider.tts`).
- Step-by-step Volcengine Ark tutorial (`docs/ark-doubao-vision.md`) replaces the Groq/Qwen tutorial.

### Removed

- **English documentation.** Removed the English side of the bilingual docs and the stale translation-pair records. The repository now keeps Chinese documentation only, under canonical file names (`README.md` and the `docs/*.md`); `package.json` `files` and `verify:portable` were updated accordingly.

## [0.1.34] - 2026-08-19

### Changed

- **Transparent variant routing is now on by default**: `imageInputVariants.hidden` defaults to `true`, so image-input variant routes keep the original provider and model display names and the model selector shows one entry per model out of the box. Users who prefer the explicit `(Vision Toolkit)` entries can disable the “透明变体路由” setting (advanced settings → image input) to restore the previous behavior.

## [0.1.33] - 2026-08-19

### Added

- **Transparent variant routing** (`imageInputVariants.hidden`, off by default): image-input variant routes keep the original provider/model display names, and the browser hides the upstream text-only twins so the model selector shows one entry per model. Pasted images, image history, and the built-in `read_image` tool keep working on text-only models; opening the selector no longer flashes a duplicate group because hiding is synchronous DOM reconciliation. Disabling the setting restores the explicit `(Vision Toolkit)` entries.
- Settings UI: “透明变体路由” checkbox under advanced settings → image input, with bilingual copy.

### Changed

- Lowered the built-in free vision service daily quota to 100 requests.

### Fixed

- Toggling transparent routing is display-only: it no longer rebuilds or re-verifies the vision runtime.
- The browser display-config cache is invalidated on Settings saves, and an in-flight response can no longer repopulate it with a stale flag.
- Restoring upstream model entries after transparent routing is disabled, and guarding the selector integrator against duplicate installs.

## [0.1.32] - 2026-08-18

### Fixed

- Fixed the compressed-image cache silently missing on Windows when cache file paths exceeded the 260-character `MAX_PATH` limit; cache keys now use shorter 64-bit digests and are versioned as `v2`, so old oversized entries are pruned automatically.
- Made the portable package verification and the test suite Windows-compatible, including `npm.cmd` invocation, path-separator handling, Python bootstrap fixture layout, a profile E2E prompt that avoids newline-carrying argv, and restart-helper test skips where automatic restart is intentionally unavailable.
- Routed Windows `pnpm` batch shims through `cmd.exe` so plugin updates work when the harness resolves `pnpm` to a `pnpm.CMD` path.
- Added a Windows CI job that runs the portable-package build, tests, and verification on `windows-latest`.
- Fixed an intermittent `NO_ADAPTER` failure on image-input variant routes (`vision-toolkit-<provider>`) after adapter re-registration, model switches, or hot reload: wrappers now survive transient registry gaps, are re-registered when the live registry drops them, and self-heal on a periodic sweep.

## [0.1.31] - 2026-08-18

### Changed

- Renamed the bundled Skill from `vision-tools` to `vision-skills`, so the model-facing name describes the capability instead of the underlying tools. Sessions created before the rename still restore activation from legacy `vision-tools` history; new sessions invoke `/vision-skills`.

## [0.1.30] - 2026-08-17

### Changed

- Raised the default vision operation timeout from 15 seconds to 30 seconds for both semaphore queueing and tool execution.
- Removed the practical global ceiling on the built-in free vision service (raised from 5,000 to 1,000,000,000 requests per UTC day) while keeping the per-client daily and burst quotas.

## [0.1.29] - 2026-08-17

### Added

- **Install and use with zero Python setup.** When no system Python 3.11+ is available, the plugin downloads a pinned, sha256-verified standalone Python 3.13 build (about 35 MB) on first use and prepares its isolated runtime with it, so new users no longer need to install Python first. A system Python or an explicit `runtime.python` override still takes precedence, and a committed manifest plus `scripts/python-bootstrap.mjs` keeps the pinned build auditable and updatable.

### Fixed

- Keep the `vision_toolkit_activate` bootstrap callable until the end of the model step when the Skill and the bootstrap are invoked in parallel, preventing a race that surfaced as `unknown tool "vision_toolkit_activate"` while the Skill call was already activating the visual tools.
- Reword the `vision-tools` Skill description so screenshot-to-UI restoration reliably triggers visual-tool activation.

## [0.1.28] - 2026-08-17

### Fixed

- Treat HTTP 403 from `GET /models` as a warning instead of claiming the API key was rejected, because providers such as Groq can restrict the model-list endpoint while real multimodal requests still work. Settings now notes that this warning can be ignored when the real vision-model test reports success.

## [0.1.27] - 2026-08-17

### Added

- Automatically compress input images above `maxImageBytes` (4 MiB default) or `maxImagePixels`, preferring lossless PNG/WebP/GIF re-encodes before lossy quality reduction and, as a last resort, downscaling.
- Accept pasted images up to 20 MiB and compress them on first tool use instead of rejecting anything above `maxImageBytes`.
- Persist compressed copies in a versioned, hash-verified workspace cache so repeated calls reuse the same compressed image.
- Keep original display names on crop/trace/long-OCR/foreground/pixel-diff outputs and preserve EXIF/ICC metadata when re-encoding.

### Fixed

- Reject tampered or symlinked compressed-cache entries and prune stale or oversized cache files.
- Mark JPEG q95 as lossy and try true lossless PNG/WebP re-encodes first for every source format.

## [0.1.26] - 2026-08-17

### Docs

- Documented how and when to configure the Python 3.11+ `runtime.python` override with system interpreters, project-local virtual environments, and the Windows `py` launcher.
- Added reproducible `uv` setup, managed-versus-external dependency guidance, Profile health/model checks, and a `vision_glance` smoke-test workflow.
- Clarified automatic platform temporary-directory authorization, Windows `/tmp/...` mapping, extra `allowedDirs` roots, and ignored project-local `.venv/` directories.

## [0.1.25] - 2026-08-17

### Fixed

- Added the documented `VISION_SSL_VERIFY` escape hatch for trusted self-signed or MITM-proxied vision endpoints, forwarded it through the isolated DSH runtime, and kept TLS certificate verification enabled by default.
- Allowed `vision_toolkit_activate` to mount the visual tool schemas even when the model invokes the bootstrap before loading the `vision-tools` Skill, removing the activation deadlock while preserving Agent-scoped exposure.
- Authorized the platform temporary directory for visual inputs and mapped model-generated `/tmp/...` paths to `%TEMP%` or `%TMP%` on Windows, while retaining realpath fencing and model-visible path guidance.

## [0.1.24] - 2026-08-17

### Fixed

- Kept Vision Toolkit Settings panels, form fields, action buttons, and advanced runtime details within the available Web Settings modal width instead of forcing horizontal overflow and clipping the right column.

## [0.1.23] - 2026-08-17

### Added

- Settings now links to the Groq Qwen3.6-27B tutorial and shows a one-line manual update command with a copy button.

## [0.1.22] - 2026-08-17

### Docs

- Added a step-by-step Groq tutorial (English and 中文) for obtaining a free API key and using Qwen3.6-27B for image understanding, with screenshots and ready-to-run cURL/Python examples.

## [0.1.21] - 2026-08-17

### Changed

- Switched the built-in free vision service to Gemini 3.7 Flash by default; Qwen-compatible requests keep routing through Groq.
- Split grounding prompts by model family so Gemini and Qwen each use their native bounding-box coordinate order.

### Fixed

- Fixed Qwen detection boxes being swapped by prompting Qwen with `x0,y0,x1,y1` and Gemini with `y0,x0,y1,x1`.
- Return the standard non-retryable `rate_limit_exceeded` code when every upstream is cooling down, preventing the 15-second client deadline from hiding an immediate provider-capacity response as a timeout.

## [0.1.20] - 2026-08-17

### Changed

- Allocate Groq accounts through persistent active-request and cooldown state, preferring the least-active available account instead of hashing concurrent requests onto colliding keys.
- Give semaphore queueing and tool execution separate timeout budgets, so waiting for a session slot no longer consumes the 15-second vision inference deadline.

### Fixed

- Cool down rate-limited, unauthorized, and transiently failing Groq accounts before retrying another account, reducing repeated collisions and timeout cascades during concurrent visual grounding.
- Report queue time separately in runtime diagnostics and return an explicit queue-timeout message when the session concurrency gate itself is saturated.

## [0.1.19] - 2026-08-17

### Changed

- Raised the built-in public vision service output ceiling from 512 to 4,096 tokens, leaving enough room under Groq's free-tier token budget for image input while avoiding premature truncation of dense element inventories.

### Fixed

- Parse Qwen-family grounding coordinates as `x0,y0,x1,y1` while retaining Gemini-family `y0,x0,y1,x1` compatibility and an explicit override for custom providers.
- Reject incomplete bounding-box JSON instead of silently returning a misleading partial detection result, and avoid duplicating already-complete detect category instructions.

## [0.1.18] - 2026-08-16

### Changed

- Rebased the model-facing `vision-tools` Skill on the upstream `SKILL.md` and
  all five upstream playbooks, changing only native DSH tool invocation,
  Artifact/resource delivery, progressive exposure, and DSH runtime boundaries.
- Added an exact upstream Skill commit/hash manifest, a reviewable adapter
  patch, and repeatable sync/verification commands so future upstream updates
  fail closed when the adaptation no longer applies cleanly.
- Expanded the built-in free vision service capacity and provider pool to
  reduce peak-time exhaustion without changing the existing client safeguard.
- Replaced the built-in public compatibility key with the project URL while
  continuing to accept the legacy `api_key="free"` value for existing installs.
- Reduced the default vision operation timeout from 60 seconds to 15 seconds.

### Fixed

- Removed the stale single-image restriction from the public Groq vision proxy; one request can now forward up to five images in their original order.
- Returned sanitized Groq validation details and descriptive request-size errors instead of retrying non-retryable failures across every provider account.
- Returned explicit quota `429` responses immediately, including retry guidance, instead of retrying them until the client reported a timeout.

### Removed

- Removed the GitHub Pages workflow: the public project website is
  `agent-vision.anionex.me` and the repository has no Pages site enabled, so the
  job always failed at the Pages configuration step.

## [0.1.17] - 2026-08-16

### Changed

- Clarified in both READMEs that the visual-tool system, its division of responsibilities, and the `vision-tools` Skill are original work, and refreshed the bilingual pairing record.

## [0.1.16] - 2026-08-16

### Changed

- Allowed registry-installed Profiles to install plugin updates even when the running DSH Web process cannot safely restart itself; the Settings page now asks the user to restart DSH Web manually when needed.
- Clarified update status and confirmation text so installation and process restart are reported as separate steps.

## [0.1.15] - 2026-08-16

### Fixed

- Fixed the Settings runtime health check reporting a false artifact-directory failure when DSH Desktop starts from a read-only installation directory. The check now uses the prepared runtime home and validates output readiness independently from session-relative input directories.

## [0.1.14] - 2026-08-16

### Changed

- Switched the built-in free vision service from Cloudflare Workers AI Gemma 4 to Groq Qwen3.6 (`qwen/qwen3.6-27b`), with three server-side API keys rotated across requests and no change to the public OpenAI-compatible endpoint.
- Raised the shared Worker ceiling to 3,000 requests per UTC day and 60 requests per minute to match the combined request capacity of the three Groq free-tier accounts more closely, while keeping the per-client ceiling at 100 requests per day.

## [0.1.13] - 2026-08-16

### Added

- Added `fullPage=true` to `vision_html_screenshot`; the Chrome DevTools Protocol path preserves the requested layout viewport, captures the complete document, and reports `pageHeight` in CSS pixels while leaving fixed-viewport captures unchanged.
- Added a **Plugin updates** Settings card that checks the configured npm registry, installs an explicitly confirmed release into the current registry-backed DSH profile, verifies it, and can restart an explicitly opted-in fixed-port POSIX DSH Web process through an independent readiness/rollback helper. Token-owned cross-process locking, pre-update manifest/lockfile backups, bounded rollback commands, and exact-version recovery protect the Profile across failed installs and restart handoff. Local/workspace/git/URL and otherwise unsafe-to-replace installs remain read-only; Windows, dynamic-port, and manager-owned processes keep restart ownership outside the plugin.

### Fixed

- Fixed managed runtime creation failing with exit status 101 when the Microsoft Store Python is used on Windows: the venv is now created with `--without-pip`, the staged `pyvenv.cfg` `home`/`executable` are rewritten to the app execution alias directory, and pip is bootstrapped explicitly.

## [0.1.12] - 2026-08-16

### Fixed

- Kept persisted v0.1.10 Moondream free-provider settings on the built-in `api_key="free"` path after upgrading, so existing installations do not require a DSH Credential.
- Aligned direct `point` and `detect` task coordinates with the toolkit's 0-1000 grid and rejected malformed structured locations instead of returning false-success responses.

## [0.1.11] - 2026-08-16

### Changed

- Raised the built-in free vision service limits from 30 to 100 requests per client per UTC day, from 120 to 400 requests globally per UTC day, and from 6 to 20 requests per 60 seconds.
- Switched the built-in free vision backend from Moondream 3.1 to Cloudflare Workers AI Gemma 4 (`@cf/google/gemma-4-26b-a4b-it`) while keeping the public OpenAI-compatible endpoint unchanged.

## [0.1.10] - 2026-08-16

### Added

- Added a built-in free Moondream vision provider at `https://vision.anionex.me/v1`, using the OpenAI Chat Completions protocol with `api_key="free"`. Fresh installations can use remote vision tools without configuring a DSH Credential.
- Added an OpenAI-compatible Cloudflare Worker proxy for the bundled service, including bounded image validation, daily and burst quotas, and explicit rate-limit responses.

### Changed

- Changed the default provider to `moondream-3.1` with a 4 MiB per-image limit and a 20,000,000-pixel per-image limit.
- Kept custom OpenAI-compatible and Anthropic providers supported; changing the endpoint, model, or protocol unlocks the API key field and restores normal DSH Credential handling.

### Fixed

- Prevented browser-side or same-origin credential writes from storing a user key under the read-only built-in free provider reference.
- Aligned automatic image-input descriptions with the pinned upstream focus-hint contract: the bridge now derives intent from the current user request or latest assistant paragraph, ignores injected context prefixes, and keys cached evidence by that focus prompt.
- Made shared attachment reads bounded and cancellation-safe so queued descriptions can stop without aborting another consumer that is still using the same image read.

## [0.1.9] - 2026-08-16

### Added

- Added an explicit **Test vision model** Settings action that sends a bundled diagnostic image through the same multimodal runtime path as `vision_glance`, so a successful `/models` response can no longer be mistaken for proof that the configured model and upstream account can process images.

### Changed

- Renamed the lightweight Settings probe to **Test API connection**, made its copy explicit that it only calls `GET /models`, and added a dedicated verified/not-tested/failed Tag to the real vision-model result.

## [0.1.8] - 2026-08-16

### Added

- Pasting an image with a plain text-only model now works like a multimodal model with zero manual steps: the browser integration asks the host with the exact model route, the host answers an auto-switch instruction when the image-input variant exists, and the client switches the session by itself and replays the paste into the composer's native intake (thumbnail, limits, keyboard). A failed switch or an environment that cannot replay clipboard bytes degrades to the paste-to-path takeover with the same files; `imageInputVariants.autoSwitch` (default `true`) turns the auto-switch off.
- Text-only model routes now get `(Vision Toolkit)` image-input variants in the model selector. Selecting a variant keeps the native paste and attachment flow — composer thumbnail and durable session image — and the plugin rewrites image blocks into Vision Toolkit descriptions only on the wire to the model. Variants are registered automatically for every model the host declares text-only and can be disabled or restricted via `imageInputVariants`.
- The browser paste interception now asks the host before taking a paste over: pastes stay native for image-capable models (including the variants) and are converted to workspace paths only for models the host confirms text-only.

## [0.1.7] - 2026-08-15

### Added

- Added a write-only API key field to Web Settings so users can configure online vision without opening the credential file; saved values are never returned to the browser.

### Changed

- Moved the credential reference name into Advanced settings and protected browser credential writes with same-origin, Settings revision, and active-reference checks.

## [0.1.6] - 2026-08-14

### Added

- Added native Anthropic Messages transport with configurable thinking behavior, provider-compatible User-Agent overrides, and matching Web Settings controls.

### Changed

- Restored the user-first Web Settings hierarchy: required provider fields appear first, advanced compatibility and runtime controls are collapsed, and plugin identity, versions, and runtime generation are shown in the footer.
- Replaced internal-facing Settings, health, tool-card, and artifact labels with concise English and Simplified Chinese user copy.

### Fixed

- Keep the DSH Credential, endpoint, protocol, thinking mode, and User-Agent authoritative when the pinned upstream runs beside ignored `.env` files.
- Use Anthropic authentication headers for explicit `/models` connection tests and retry overloaded Anthropic responses with bounded `Retry-After` handling.

## [0.1.5] - 2026-08-14

### Added

- Pasted clipboard images are copied into the active workspace and represented as stable input references, with per-image progress, retry-safe serialization, and removal controls.

### Changed

- Development builds and tests resolve the published DSH `0.1.0-rc.6` package set directly instead of depending on a neighboring Harness checkout.

### Fixed

- Accept low-share `vision_dominant_colors` palette and candidate rows whose histogram bar is empty.
- Use Harness design tokens for every Vision Toolkit surface color, including preview checkerboards, download actions, status indicators, alerts, fields, and pasted-image chips, so light and dark themes remain readable without light-only fallback colors.
- Require the compatible DSH `0.1.0-rc.6` release line so package managers cannot select the broken `dsh-client-runtime@0.0.1-rc.1` release through the `latest` dist-tag.
- Use the published `@deepseek-ai/dsh-client-ui-input-trigger` package while retaining runtime registration compatibility with the earlier `ctx.slash` service alias.
- Publish only rescoped `@deepseek-ai/cordis` imports and declare every directly consumed DSH host/client peer.
- Pin NumPy to the newest release that still supports the documented Python 3.11 minimum, so managed runtime preparation works on Python 3.11.

## [0.1.4] - 2026-08-14

### Changed

- Package metadata (`repository`, `bugs`) points at the public `Anionex/dsh-vision-toolkit` repository; the portable verification gate tracks the current version.

## [0.1.3] - 2026-08-14

### Added

- Web pasted-image degradation (`degradePastedImages`, default off): when the session model cannot accept images, pasted images are saved into the session workspace (`.dsh-vision-toolkit/pastes/`) and handed to the model as file paths, so the agent reads them through the visual tools with a visible tool workflow. Native vision models are preferred and never take this path.

### Fixed

- Upstream `vision_client.py` sends a stable `User-Agent`, avoiding HTTP 403 responses from gateways that reject the urllib default agent; the vendored manifest hash records the patched file.
- Peer dependency ranges were widened for the published prerelease packages. Version 0.1.5 supersedes those ranges because SemVer does not admit the `0.1.0-rc.*` line through a comparator starting at `0.0.1-rc.1`.

## [0.1.2] - 2026-08-11

### Changed

- Repositioned the README, landing page, hero, social preview, package metadata, and About copy around the product's exact role as the native DeepSeek Harness integration for `agent-vision-toolkit`.
- Added direct, prominent links to the upstream repository and first-party project website.
- Added optimized official upstream reference images for infographic restoration, sketch-to-UI restoration, image Q&A, and screenshot-guided debugging, with exact commit provenance and explicit separation from DSH-native proof.
- Set the package homepage to the first-party `agent-vision-toolkit` website and expanded discovery keywords for text-only agents, Agent Skills, and vision-language models.

## [0.1.1] - 2026-08-11

### Changed

- Replaced private-repository GitHub metadata badges with versioned static badges that remain truthful without unauthenticated repository access.
- Gated GitHub-hosted CI and Pages jobs to public repository visibility while keeping the workflows ready for a future visibility change.

### Fixed

- Package homepage and bilingual release guidance now point authenticated users to the private repository instead of an unavailable public Pages site.

## [0.1.0] - 2026-08-10

### Added

- Portable DeepSeek Harness Profile Bundle support for Web and Headless profiles, with committed runtime and client build artifacts.
- Five P0 tools: `vision_glance`, `vision_ground`, `vision_detect`, `vision_trace`, and `vision_crop`.
- Five P1 tools: `vision_pixel_diff`, `vision_long_screenshot_ocr`, `vision_extract_foreground`, `vision_dominant_colors`, and `vision_html_screenshot`.
- Agent-scoped progressive tool exposure through the bundled `vision-tools` Skill and one temporary activation bootstrap.
- Managed and exact external Python runtime modes backed by a pinned, manifest-verified `agent-vision-toolkit` snapshot.
- DSH Credentials integration, hard operation deadlines, cancellation propagation, per-session concurrency, bounded single-task glance reuse, metrics, and stable redacted errors.
- Workspace-fenced Artifact creation for images, SVG, Markdown, and JSON, including signed Web preview/download routes and local open-file fallback.
- Dedicated Web tool cards plus live Settings for configuration, health, connection testing, runtime preparation, and version inspection.
- Reproducible UI restoration acceptance workflow with committed `6.04%` initial and `0%` final pixel-difference evidence.
- Bilingual product, troubleshooting, requirements traceability, and UI restoration documentation.
- Dependency-free portable package CI, structured issue forms, contribution and security policies, support guidance, funding disclosure, project hero, and social-preview asset.

### Fixed

- Headless Chrome rendering now uses a disposable profile, `--use-mock-keychain`, and cleanup that avoids the user's daily Chrome profile and macOS login keychain.
- Failed or obsolete Settings candidates cannot replace the active runtime generation or stored usable configuration.
- SVG output validation fails closed on malformed, unsafe, or semantically invalid vtracer output.
- Runtime teardown cancels in-flight operations before removing Agent-scoped tools, the activation bootstrap, and the Skill.
- The Web client is published through the current nested `dsh.client` manifest and loader-compatible built artifact required by DSH snapshot0810.

[Unreleased]: https://github.com/nextnowlabs/dsh-ark-toolkit/compare/v0.1.34...HEAD
[0.1.34]: https://github.com/nextnowlabs/dsh-ark-toolkit/compare/v0.1.33...v0.1.34
[0.1.33]: https://github.com/nextnowlabs/dsh-ark-toolkit/compare/v0.1.32...v0.1.33
[0.1.32]: https://github.com/nextnowlabs/dsh-ark-toolkit/compare/v0.1.31...v0.1.32
[0.1.31]: https://github.com/nextnowlabs/dsh-ark-toolkit/compare/v0.1.30...v0.1.31
[0.1.30]: https://github.com/nextnowlabs/dsh-ark-toolkit/compare/v0.1.29...v0.1.30
[0.1.29]: https://github.com/nextnowlabs/dsh-ark-toolkit/compare/v0.1.28...v0.1.29
[0.1.28]: https://github.com/nextnowlabs/dsh-ark-toolkit/compare/v0.1.27...v0.1.28
[0.1.27]: https://github.com/nextnowlabs/dsh-ark-toolkit/compare/v0.1.26...v0.1.27
[0.1.26]: https://github.com/nextnowlabs/dsh-ark-toolkit/compare/v0.1.25...v0.1.26
[0.1.25]: https://github.com/nextnowlabs/dsh-ark-toolkit/compare/v0.1.24...v0.1.25
[0.1.24]: https://github.com/nextnowlabs/dsh-ark-toolkit/compare/v0.1.23...v0.1.24
[0.1.23]: https://github.com/nextnowlabs/dsh-ark-toolkit/compare/v0.1.22...v0.1.23
[0.1.22]: https://github.com/nextnowlabs/dsh-ark-toolkit/compare/v0.1.21...v0.1.22
[0.1.21]: https://github.com/nextnowlabs/dsh-ark-toolkit/compare/v0.1.20...v0.1.21
[0.1.20]: https://github.com/nextnowlabs/dsh-ark-toolkit/compare/v0.1.19...v0.1.20
[0.1.19]: https://github.com/nextnowlabs/dsh-ark-toolkit/compare/v0.1.18...v0.1.19
[0.1.18]: https://github.com/nextnowlabs/dsh-ark-toolkit/compare/v0.1.17...v0.1.18
[0.1.17]: https://github.com/nextnowlabs/dsh-ark-toolkit/compare/v0.1.16...v0.1.17
[0.1.16]: https://github.com/nextnowlabs/dsh-ark-toolkit/compare/v0.1.15...v0.1.16
[0.1.15]: https://github.com/nextnowlabs/dsh-ark-toolkit/compare/v0.1.14...v0.1.15
[0.1.14]: https://github.com/nextnowlabs/dsh-ark-toolkit/compare/v0.1.13...v0.1.14
[0.1.13]: https://github.com/nextnowlabs/dsh-ark-toolkit/compare/v0.1.12...v0.1.13
[0.1.12]: https://github.com/nextnowlabs/dsh-ark-toolkit/compare/v0.1.11...v0.1.12
[0.1.11]: https://github.com/nextnowlabs/dsh-ark-toolkit/compare/v0.1.10...v0.1.11
[0.1.10]: https://github.com/nextnowlabs/dsh-ark-toolkit/compare/v0.1.9...v0.1.10
[0.1.9]: https://github.com/nextnowlabs/dsh-ark-toolkit/compare/v0.1.8...v0.1.9
[0.1.8]: https://github.com/nextnowlabs/dsh-ark-toolkit/compare/v0.1.7...v0.1.8
[0.1.7]: https://github.com/nextnowlabs/dsh-ark-toolkit/compare/v0.1.6...v0.1.7
[0.1.6]: https://github.com/nextnowlabs/dsh-ark-toolkit/compare/v0.1.5...v0.1.6
[0.1.5]: https://github.com/nextnowlabs/dsh-ark-toolkit/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/nextnowlabs/dsh-ark-toolkit/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/nextnowlabs/dsh-ark-toolkit/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/nextnowlabs/dsh-ark-toolkit/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/nextnowlabs/dsh-ark-toolkit/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/nextnowlabs/dsh-ark-toolkit/releases/tag/v0.1.0
