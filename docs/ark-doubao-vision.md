# 火山方舟接入教程：用豆包 Seed Vision 识图、Seedream 生图

DSH Ark Toolkit 默认使用字节火山方舟（Volcengine Ark）作为唯一视觉后端：

- **图片理解**（看图问答、OCR、多图对比）：OpenAI 兼容 `/chat/completions`，模型 `doubao-seed-2-0-lite-260215`（豆包 Seed Vision）。
- **文生图**（`ark_generate_image` 工具）：`/images/generations`，模型 `doubao-seedream-5-0-260128`（Seedream），也支持别名 `seedream-5.0-pro`、`seedream-4.5`、`seedream-4.0`。

本教程说明如何申请火山方舟 API Key、在 Ark Toolkit 中配置，并给出可直接运行的 cURL 示例。

## 1. 注册火山引擎并开通方舟

1. 打开 [火山引擎控制台](https://console.volcengine.com/ark)，用手机号或账号登录。没有账号先注册并完成实名认证。
2. 进入 **火山方舟（Ark）** 控制台。首次使用需要开通服务；部分模型需要先在 **模型广场** 领取/开通（如 Doubao Seed Vision、Seedream）。
3. 在左侧 **API Key 管理** 点击 **创建 API Key**，复制生成的 Key（形如 `xxxxxxxx-xxxx-...`）。请妥善保存，只在配置时使用一次。

> 提示：火山方舟按量计费，部分新模型有免费试用额度；具体价格与免费额度以控制台为准。

## 2. 在 Ark Toolkit 中配置

打开 **设置 → 插件 → 插件配置** 并展开 Ark Toolkit 卡片，默认值已经指向火山方舟：

| 字段 | 值 |
| --- | --- |
| Base URL | `https://ark.cn-beijing.volces.com/api/v3` |
| Model | `doubao-seed-2-0-lite-260215`（看图理解） |
| API 协议 | OpenAI Chat Completions |
| API Key | 你的火山方舟 Key |

在 **API 密钥** 里粘贴刚才创建的 Key，点击 **保存设置**。插件会把 Key 保存为 DSH Credential（默认名 `ARK_API_KEY`），随后可以运行 **测试视觉模型** 确认连接。

Seedream 文生图无需额外配置：`ark_generate_image` 工具会使用同一个 Base URL 和同一个 `ARK_API_KEY` 凭据，默认模型为 `doubao-seedream-5-0-260128`。

也可以在 Profile patch 中配置：

```yaml
- id: ark-toolkit
  config:
    provider:
      baseUrl: https://ark.cn-beijing.volces.com/api/v3
      credential: ARK_API_KEY
      model: doubao-seed-2-0-lite-260215
      protocol: openai
```

## 3. 直接调用

### 图片理解（豆包 Seed Vision）

```bash
curl https://ark.cn-beijing.volces.com/api/v3/chat/completions \
  -H "Authorization: Bearer $ARK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "doubao-seed-2-0-lite-260215",
    "messages": [{
      "role": "user",
      "content": [
        {"type": "image_url", "image_url": {"url": "data:image/png;base64,<base64图片>"}},
        {"type": "text", "text": "这张图里有什么？"}
      ]
    }]
  }'
```

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

## 常见问题

| 问题 | 处理方式 |
| --- | --- |
| `401` / Key 无效 | 检查 Key 是否复制完整、有没有多余空格；到控制台 **API Key 管理** 重新创建 |
| 模型不存在或未开通 | 到火山方舟 **模型广场** 开通对应模型（Doubao Seed Vision / Seedream）；不同模型 ID 见控制台 |
| 提示余额不足 | 在火山引擎控制台充值或领取免费额度 |
| `429` 限流 | 按错误信息等待后重试，或在控制台提升配额 |
| 图片理解模型 ID 变化 | 火山方舟会推出新版本模型；Ark Toolkit 的 Model 字段可以随时改成最新的模型 ID |
