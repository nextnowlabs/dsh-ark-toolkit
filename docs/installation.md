# 安装与配置指南

本指南说明如何安装 DSH Ark Toolkit 插件、配置字节火山方舟（Volcengine Ark）文生图与火山引擎 TTS 语音合成，并给出完整的 Profile patch 配置参考。所有配置字段都有默认值，绝大多数用户只需要填 API Key。

> 图片**理解**不需要本插件：DeepSeek Harness 里的 DeepSeek 模型已经原生支持图片输入。本插件只负责**生成图片**（Seedream）和**合成语音**（TTS）。

---

## 1. 安装

插件已发布到 npmjs，通过 `dsh` CLI 一行安装到指定 Profile。推荐先装到 Web Profile，Headless Profile 也可安装。

```sh
# 1) 安装到 Web Profile（推荐，可在图形界面里配置与测试）
dsh plugin --profile web add @nextnowlabs/dsh-ark-toolkit

# 2) 安装到 Headless Profile（可选）
dsh plugin --profile headless add @nextnowlabs/dsh-ark-toolkit
```

> 若默认 registry 为镜像源（如 npmmirror）导致安装失败，可显式指定官方源：`dsh plugin --profile web add @nextnowlabs/dsh-ark-toolkit --registry=https://registry.npmjs.org/`。
>
> 源码贡献者如需本地开发/修改插件，可克隆仓库后用本地路径安装：`dsh plugin --profile web add "$PWD"`（此时使用仓库 `lib/` 构建产物，升级时 `git pull` 后重启 Profile 即可）。

安装后**重启正在运行的 Profile**，在 Web 中打开 **插件** 面板，进入 `dsh-ark-toolkit` 页面并展开 Ark Toolkit 卡片。

插件是**原生 Node/TypeScript** 实现：文生图与语音合成都直接调用字节服务的 HTTP 接口，生成图片的尺寸探测使用 Node 原生方案（sharp），安装后即可使用。

---

## 2. 配置字节火山方舟（Seedream 文生图）

插件默认只使用字节火山方舟一家后端：

```text
Base URL: https://ark.cn-beijing.volces.com/api/v3
默认模型（文生图）: doubao-seedream-5-0-260128（Seedream）
API Key: 你自己的火山方舟 Key，保存为 DSH Credential `ARK_API_KEY`
```

- `ark_generate_image` 工具走 OpenAI 兼容的 `/images/generations`，使用字节 Seedream；
- Seedream 别名：`seedream-5.0-pro`、`seedream-5.0-lite`（默认）、`seedream-4.5`、`seedream-4.0`；
- 调用时可以通过 `model` 参数临时覆盖默认模型，也可以直接传完整的 Ark 模型 ID。

### 2.1 获取火山方舟 API Key

1. 打开 [火山引擎控制台](https://console.volcengine.com/ark)，注册并完成实名认证；
2. 进入火山方舟（Ark）控制台，开通服务，并在模型广场开通 Seedream 系列；
3. 在 **API Key 管理** 创建 API Key。

**图文教程：** [申请火山方舟 API Key，并用豆包 Seedream 生成图片](ark-doubao.md)。

### 2.2 填写 API Key

在 **插件** 面板 `dsh-ark-toolkit` 页面的 Ark Toolkit 卡片 **API 密钥** 里粘贴火山方舟 API Key，点击保存。插件把它保存为 DSH Credential（默认名 `ARK_API_KEY`），Settings 只保存 Credential 引用，不会回显密钥。

保存后运行 **测试 API 连接**，确认方舟端点可达。

---

## 3. 配置 TTS 语音合成（ark_speak）

`ark_speak` 工具走火山引擎语音技术的 TTS V3 接口（`openspeech.bytedance.com` 单向 SSE 流式），默认使用豆包语音合成模型 2.0（资源 ID `seed-tts-2.0`）。

| 字段 | 默认值 |
| --- | --- |
| TTS 端点 | `https://openspeech.bytedance.com/api/v3/tts/unidirectional/sse` |
| DSH Credential | `VOLCENGINE_TTS_KEY` |
| 资源 ID（App ID） | `seed-tts-2.0` |
| 默认音色 | `zh_female_shuangkuaisisi_uranus_bigtts`（爽快思思 2.0） |

TTS 使用**独立的 Token**（App Token），与火山方舟 API Key 不同：

1. 打开 [火山引擎语音技术控制台](https://console.volcengine.com/speech)，创建/进入语音合成应用；
2. 在应用详情里找到 **App ID**（资源 ID，默认已是 `seed-tts-2.0`）和 **Token**；
3. 把 Token 保存为 DSH Credential `VOLCENGINE_TTS_KEY`。

调用 `ark_speak` 时还可以通过参数临时指定音色、格式（`mp3`/`ogg_opus`/`pcm`/`wav`）、采样率、语速、音量、音调、情感（`happy`/`sad`/`neutral`）和语言（`zh-cn`/`en`/`ja`）。完整音色列表见火山引擎官方《在线音色列表》（如 Vivi 2.0 `zh_female_vv_uranus_bigtts`、小何 2.0 等）。

---

## 4. 完整配置参考（Profile patch）

除在 Web Settings 里配置外，所有字段都支持在 Profile patch 中覆盖。下面是包含全部常用字段的示例：

```yaml
- id: ark-toolkit
  config:
    # —— 字节火山方舟（ark_generate_image 文生图）——
    provider:
      baseUrl: https://ark.cn-beijing.volces.com/api/v3
      credential: ARK_API_KEY
      # userAgent: 可覆盖出站 User-Agent
      # —— TTS 语音合成（ark_speak）——
      tts:
        baseUrl: https://openspeech.bytedance.com/api/v3/tts/unidirectional/sse
        credential: VOLCENGINE_TTS_KEY
        resource: seed-tts-2.0
        voice: zh_female_shuangkuaisisi_uranus_bigtts
    # —— 单次远程调用预算（毫秒）——
    timeoutMs: 600000
    # —— 会话内并发工具执行上限 ——
    concurrency: 4
```

### 4.1 配置字段速查

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `provider.baseUrl` | `https://ark.cn-beijing.volces.com/api/v3` | 方舟服务地址，插件会拼接 `/images/generations` |
| `provider.credential` | `ARK_API_KEY` | 保存火山方舟 API Key 的 DSH Credential 名 |
| `provider.userAgent` | 浏览器 UA | 出站请求 User-Agent |
| `provider.tts.baseUrl` | `https://openspeech.bytedance.com/api/v3/tts/unidirectional/sse` | TTS V3 端点 |
| `provider.tts.credential` | `VOLCENGINE_TTS_KEY` | 保存 TTS Token 的 DSH Credential 名 |
| `provider.tts.resource` | `seed-tts-2.0` | TTS 资源/App ID |
| `provider.tts.voice` | `zh_female_shuangkuaisisi_uranus_bigtts` | 默认音色 |
| `timeoutMs` | `600000` | 单次远程调用超时 |
| `concurrency` | `4` | 会话内并发工具执行上限 |

> 升级到 0.1.0 后，旧配置里的 `provider.model`、`provider.protocol`、`language`、`maxImageBytes`、`maxImagePixels`、`imageInputVariants`、`allowedDirs` 已随图片理解能力一并移除；它们会被安全忽略，不会导致插件加载失败。

---

## 5. 验证配置

- **Web：** 打开 **插件** 面板 `dsh-ark-toolkit` 页面的 Ark Toolkit 卡片，运行 **检查本地环境**（凭据与输出目录）或 **测试 API 连接**（请求方舟 `/models`）；
- **命令行：** 检查 Profile 的健康检查结果，确认 Credential 已配置、Artifact 目录可写、服务检查为 `ok`；
- **直接调用：** 在会话里调用 `ark_generate_image` / `ark_speak` 验证生成能力。

---

## 6. 常见配置问题

| 问题 | 处理方式 |
| --- | --- |
| 方舟返回 401/403 | 确认 `ARK_API_KEY` 已保存且没有多余空格；在火山引擎控制台 **API Key 管理** 重新创建 |
| 方舟返回 429/限流 | 按错误信息等待后重试，或在控制台查看配额并升级额度 |
| 模型不存在或未开通 | 到火山方舟 **模型广场** 开通对应 Seedream 模型；模型 ID 以控制台为准 |
| 提示 Credential 缺失 | 在设置里填写 API Key，并确认 Credential 名称与配置一致（`ARK_API_KEY` / `VOLCENGINE_TTS_KEY`） |
| 产物无法预览或下载 | 使用“打开文件”或结果中的工作区路径；预览 URL 只在 Web 路由可用时存在 |
