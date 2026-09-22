# 火山方舟接入教程：用豆包 Seedream 生成图片

DSH Ark Toolkit 的在线能力全部走字节火山方舟（Volcengine Ark）：

- **文生图**（`ark_generate_image` 工具）：OpenAI 兼容 `/images/generations`，默认模型 `doubao-seedream-5-0-260128`（Seedream），也支持别名 `seedream-5.0-pro`、`seedream-5.0-lite`、`seedream-4.5`、`seedream-4.0`。
- **语音合成**（`ark_speak` 工具）：独立的火山引擎语音技术服务，见 [安装与配置指南](installation.md) 的 TTS 章节。

> 图片**理解**不需要本插件：DeepSeek Harness 里的 DeepSeek 模型已经原生支持图片输入，直接把图片交给模型即可。

本教程说明如何申请火山方舟 API Key、在 Ark Toolkit 中配置，并给出可直接运行的 cURL 示例。

## 1. 注册火山引擎并开通方舟

1. 打开 [火山引擎控制台](https://console.volcengine.com/ark)，用手机号或账号登录。没有账号先注册并完成实名认证。
2. 进入 **火山方舟（Ark）** 控制台。首次使用需要开通服务；部分模型需要先在 **模型广场** 领取/开通（如 Seedream 系列）。
3. 在左侧 **API Key 管理** 点击 **创建 API Key**，复制生成的 Key（形如 `xxxxxxxx-xxxx-...`）。请妥善保存，只在配置时使用一次。

> 提示：火山方舟按量计费，部分新模型有免费试用额度；具体价格与免费额度以控制台为准。

## 2. 在 Ark Toolkit 中配置

打开 **插件** 面板中的 `dsh-ark-toolkit` 页面并展开 Ark Toolkit 卡片，默认值已经指向火山方舟：

| 字段 | 值 |
| --- | --- |
| Base URL | `https://ark.cn-beijing.volces.com/api/v3` |
| 默认 Seedream 模型 | `doubao-seedream-5-0-260128` |
| API Key | 你的火山方舟 Key |

在 **API 密钥** 里粘贴刚才创建的 Key，点击 **保存设置**。插件会把 Key 保存为 DSH Credential（默认名 `ARK_API_KEY`），随后可以运行 **测试 API 连接** 确认可达性。

也可以在 Profile patch 中配置：

```yaml
- id: ark-toolkit
  config:
    provider:
      baseUrl: https://ark.cn-beijing.volces.com/api/v3
      credential: ARK_API_KEY
```

## 3. 直接调用

### 文生图（Seedream）

```bash
curl https://ark.cn-beijing.volces.com/api/v3/images/generations \
  -H "Authorization: Bearer $ARK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "doubao-seedream-5-0-260128",
    "prompt": "一只在雪地里打滚的橘猫，高清摄影",
    "size": "2K",
    "n": 1,
    "watermark": false
  }'
```

指定宽高比时，Ark Toolkit 会发送 `extra_parameters.aspect_ratio`：

```bash
curl https://ark.cn-beijing.volces.com/api/v3/images/generations \
  -H "Authorization: Bearer $ARK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "doubao-seedream-5-0-pro-260628",
    "prompt": "A mountain landscape at sunset",
    "size": "2K",
    "n": 1,
    "watermark": false,
    "extra_parameters": {"aspect_ratio": "16:9"}
  }'
```

## 常见问题

| 问题 | 处理方式 |
| --- | --- |
| `401` / Key 无效 | 检查 Key 是否复制完整、有没有多余空格；到控制台 **API Key 管理** 重新创建 |
| 模型不存在或未开通 | 到火山方舟 **模型广场** 开通对应模型（Seedream 系列）；不同模型 ID 见控制台 |
| 提示余额不足 | 在火山引擎控制台充值或领取免费额度 |
| `429` 限流 | 按错误信息等待后重试，或在控制台提升配额 |
| 想换 Seedream 版本 | 调用 `ark_generate_image` 时传 `model` 参数，或使用别名 `seedream-5.0-pro` / `seedream-5.0-lite` / `seedream-4.5` / `seedream-4.0` |
