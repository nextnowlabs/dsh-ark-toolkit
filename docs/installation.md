# 安装与配置指南

本指南说明如何安装 DSH Vision Toolkit 插件、配置字节火山方舟（Volcengine Ark）视觉后端与 TTS 语音合成，并给出完整的 Profile patch 配置参考。所有配置字段都有默认值，绝大多数用户只需要填 API Key。

---

## 1. 安装

插件通过 `dsh` CLI 安装到指定 Profile。推荐先装到 Web Profile，Headless Profile 也可安装。

```sh
# Web Profile（推荐，可在图形界面里配置与测试）
dsh plugin --profile web add @anionex/dsh-vision-toolkit

# Headless Profile
dsh plugin --profile headless add @anionex/dsh-vision-toolkit
```

如果默认 npm registry 访问不稳定，可以显式指定 registry：

```sh
dsh plugin --profile web add @anionex/dsh-vision-toolkit@latest --registry=https://registry.npmjs.org/
```

安装后**重启正在运行的 Profile**，在 Web 中打开 **设置 → 视觉工具**。

插件是**纯 TypeScript** 实现，不需要 Python、Chrome 或任何隔离运行环境：图片理解直接调用视觉模型服务，图片压缩等本地处理使用 Node 原生方案（sharp），安装后即可使用。

---

## 2. 配置视觉后端（图片理解 + Seedream 文生图）

插件默认只使用字节火山方舟一家后端：

```text
Base URL: https://ark.cn-beijing.volces.com/api/v3
模型（看图理解）: doubao-seed-2-0-lite-260215（豆包 Seed Vision）
模型（文生图）:   doubao-seedream-5-0-260128（Seedream）
API Key: 你自己的火山方舟 Key，保存为 DSH Credential `ARK_API_KEY`
```

- 图片理解（看图问答、OCR、多图对比）走火山方舟 OpenAI 兼容的 `/chat/completions`，使用豆包 Seed Vision；
- `vision_generate_image` 工具走 `/images/generations`，使用字节 Seedream；
- Seedream 别名：`seedream-5.0-pro`、`seedream-5.0-lite`（默认）、`seedream-4.5`、`seedream-4.0`。

### 2.1 获取火山方舟 API Key

1. 打开 [火山引擎控制台](https://console.volcengine.com/ark)，注册并完成实名认证；
2. 进入火山方舟（Ark）控制台，开通服务，并在模型广场开通 Doubao Seed Vision / Seedream；
3. 在 **API Key 管理** 创建 API Key。

**图文教程：** [申请火山方舟 API Key，并用豆包 Seed Vision / Seedream 做图片理解与生成](ark-doubao-vision.md)。

### 2.2 填写 API Key

在 **设置 → 视觉工具** 的 **API 密钥** 里粘贴火山方舟 API Key，点击保存。插件把它保存为 DSH Credential（默认名 `ARK_API_KEY`），Settings 只保存 Credential 引用，不会回显密钥。

保存后运行 **测试视觉模型**，确认连接成功。

---

## 3. 配置 TTS 语音合成（vision_speak）

`vision_speak` 工具走火山引擎语音技术的 TTS V3 接口（`openspeech.bytedance.com` 单向 SSE 流式），默认使用豆包语音合成模型 2.0（资源 ID `seed-tts-2.0`）。

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

调用 `vision_speak` 时还可以通过参数临时指定音色、格式（`mp3`/`ogg_opus`/`pcm`/`wav`）、采样率、语速、音量、音调、情感（`happy`/`sad`/`neutral`）和语言（`zh-cn`/`en`/`ja`）。完整音色列表见火山引擎官方《在线音色列表》（如 Vivi 2.0 `zh_female_vv_uranus_bigtts`、小何 2.0 等）。

---

## 4. 完整配置参考（Profile patch）

除在 Web Settings 里配置外，所有字段都支持在 Profile patch 中覆盖。下面是包含全部常用字段的示例：

```yaml
- id: vision-toolkit
  config:
    # —— 视觉后端（字节火山方舟）——
    provider:
      baseUrl: https://ark.cn-beijing.volces.com/api/v3
      credential: ARK_API_KEY
      model: doubao-seed-2-0-lite-260215
      protocol: openai            # openai | anthropic
      anthropicThinking: omit     # omit | disabled | adaptive（仅 anthropic 协议）
      # userAgent: 可覆盖出站 User-Agent
      # —— TTS 语音合成（vision_speak）——
      tts:
        baseUrl: https://openspeech.bytedance.com/api/v3/tts/unidirectional/sse
        credential: VOLCENGINE_TTS_KEY
        resource: seed-tts-2.0
        voice: zh_female_shuangkuaisisi_uranus_bigtts
    # —— 输出语言 ——
    language: zh                  # zh | en
    # —— 单次远程调用预算（毫秒）——
    timeoutMs: 30000
    # —— 图片输入限制（自动压缩/缩放）——
    maxImageBytes: 4194304        # 4 MiB
    maxImagePixels: 20000000      # 2000 万像素
    # —— 会话内并发工具执行上限 ——
    concurrency: 4
    # —— 允许读取的工作区之外目录 ——
    allowedDirs: []
    # —— 图片输入变体（粘贴/历史图片/read_image）——
    imageInputVariants:
      enabled: true
      providers: []               # 显式声明哪些模型带图片输入，留空则自动判定
      autoSwitch: true
      hidden: true                # 模型选择器只显示每个模型一项
```

### 4.1 配置字段速查

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `provider.baseUrl` | `https://ark.cn-beijing.volces.com/api/v3` | 视觉服务地址，插件会拼接 `/chat/completions`、`/images/generations` |
| `provider.credential` | `ARK_API_KEY` | 保存火山方舟 API Key 的 DSH Credential 名 |
| `provider.model` | `doubao-seed-2-0-lite-260215` | 图片理解模型 |
| `provider.protocol` | `openai` | 接口协议：OpenAI Chat Completions 或 Anthropic Messages |
| `provider.anthropicThinking` | `omit` | Anthropic thinking 字段行为 |
| `provider.userAgent` | 浏览器 UA | 出站请求 User-Agent |
| `provider.tts.baseUrl` | `https://openspeech.bytedance.com/api/v3/tts/unidirectional/sse` | TTS V3 端点 |
| `provider.tts.credential` | `VOLCENGINE_TTS_KEY` | 保存 TTS Token 的 DSH Credential 名 |
| `provider.tts.resource` | `seed-tts-2.0` | TTS 资源/App ID |
| `provider.tts.voice` | `zh_female_shuangkuaisisi_uranus_bigtts` | 默认音色 |
| `language` | `zh` | 视觉输出语言 |
| `timeoutMs` | `30000` | 单次远程调用超时 |
| `maxImageBytes` | `4194304` | 输入图片最大字节数，超限自动无损压缩 |
| `maxImagePixels` | `20000000` | 输入图片最大像素数，超限自动缩放 |
| `concurrency` | `4` | 会话内并发工具执行上限 |
| `allowedDirs` | `[]` | 允许读取的工作区之外目录 |
| `imageInputVariants.*` | 见上 | 图片输入变体行为 |

---

## 5. 验证配置

- **Web：** 打开 **设置 → 视觉工具**，运行 **测试视觉模型**，会发起一次真实的图片请求来确认端到端可用；
- **命令行：** 检查 Profile 的健康检查结果，确认 Credential 已配置、Artifact 目录可写、服务与模型检查为 `ok`；
- **直接调用：** 在会话里粘贴一张图片并提问，或调用 `vision_generate_image` / `vision_speak` 验证生成能力。

---

## 6. 常见配置问题

| 问题 | 处理方式 |
| --- | --- |
| `Vision API returned an incompatible response structure` | 通常是 API 地址少了路径前缀。LM Studio、Ollama 等本地 OpenAI 兼容服务需填写 `http://127.0.0.1:1234/v1`（带 `/v1`） |
| 火山方舟返回 429/限流 | 按错误信息等待后重试，或在控制台查看配额并升级额度 |
| 提示 Credential 缺失 | 在设置里填写 API Key，并确认 Credential 名称与配置一致（`ARK_API_KEY` / `VOLCENGINE_TTS_KEY`） |
| 图片过大或像素超限 | 插件会自动压缩/缩放后再上传；超出压缩下限时会明确报字节或像素限制错误 |
