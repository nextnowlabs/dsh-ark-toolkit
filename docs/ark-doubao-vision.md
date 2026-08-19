# Volcengine Ark tutorial: Doubao Seed Vision for understanding, Seedream for generation

**English** | [中文](ark-doubao-vision.zh.md)

DSH Vision Toolkit uses ByteDance Volcengine Ark as its only vision backend by default:

- **Image understanding** (Q&A, OCR, UI restoration, grounding): OpenAI-compatible `/chat/completions` with model `doubao-seed-2-0-lite-260215` (Doubao Seed Vision).
- **Text-to-image** (the `vision_generate_image` tool): `/images/generations` with model `doubao-seedream-5-0-260128` (Seedream), plus aliases `seedream-5.0-pro`, `seedream-4.5`, `seedream-4.0`.

This tutorial covers getting a Volcengine Ark API key, configuring Vision Toolkit, and ready-to-run cURL and Python examples.

## 1. Sign up for Volcengine and enable Ark

1. Open the [Volcengine Ark console](https://console.volcengine.com/ark) and sign in (create an account and finish identity verification if needed).
2. Enter the Ark console and enable the service. Some models (Doubao Seed Vision, Seedream) must first be activated under **Model Studio / Model Square**.
3. Under **API Key management**, click **Create API key** and copy the generated key (shaped like `xxxxxxxx-xxxx-...`). Save it somewhere safe and use it only during configuration.

> Note: Ark bills per use; some new models include free-trial quota. See the console for current pricing and free allowances.

## 2. Configure Vision Toolkit

Open **Settings → Vision Toolkit**; the defaults already point to Volcengine Ark:

| Field | Value |
| --- | --- |
| Base URL | `https://ark.cn-beijing.volces.com/api/v3` |
| Model | `doubao-seed-2-0-lite-260215` (image understanding) |
| API protocol | OpenAI Chat Completions |
| API key | your Volcengine Ark key |

Paste the key into the **API key** field and click **Save settings**. The plugin stores the key as a DSH Credential (default name `ARK_API_KEY`); then run **Test vision model** to confirm connectivity.

Seedream generation needs no extra setup: the `vision_generate_image` tool reuses the same Base URL and the same `ARK_API_KEY` credential, defaulting to model `doubao-seedream-5-0-260128`.

You can also configure a Profile patch:

```yaml
- id: vision-toolkit
  config:
    provider:
      baseUrl: https://ark.cn-beijing.volces.com/api/v3
      credential: ARK_API_KEY
      model: doubao-seed-2-0-lite-260215
      protocol: openai
```

## 3. Call the API directly

### Image understanding (Doubao Seed Vision)

```bash
curl https://ark.cn-beijing.volces.com/api/v3/chat/completions \
  -H "Authorization: Bearer $ARK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "doubao-seed-2-0-lite-260215",
    "messages": [{
      "role": "user",
      "content": [
        {"type": "image_url", "image_url": {"url": "data:image/png;base64,<base64 image>"}},
        {"type": "text", "text": "What is in this image?"}
      ]
    }]
  }'
```

### Text-to-image (Seedream)

```bash
curl https://ark.cn-beijing.volces.com/api/v3/images/generations \
  -H "Authorization: Bearer $ARK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "doubao-seedream-5-0-260128",
    "prompt": "An orange cat rolling in the snow, high-resolution photography",
    "size": "2K",
    "n": 1,
    "watermark": false
  }'
```

### Python

```python
import base64
import requests

ARK_BASE = "https://ark.cn-beijing.volces.com/api/v3"
API_KEY = "your Ark key"  # or read from an environment variable

def encode_image(path: str) -> str:
    mime = "image/png" if path.endswith(".png") else "image/jpeg"
    with open(path, "rb") as f:
        return f"data:{mime};base64,{base64.b64encode(f.read()).decode()}"

# Image understanding
resp = requests.post(
    f"{ARK_BASE}/chat/completions",
    headers={"Authorization": f"Bearer {API_KEY}"},
    json={
        "model": "doubao-seed-2-0-lite-260215",
        "messages": [{"role": "user", "content": [
            {"type": "image_url", "image_url": {"url": encode_image("shot.png")}},
            {"type": "text", "text": "What is in this image?"},
        ]}],
    },
    timeout=600,
)
print(resp.json()["choices"][0]["message"]["content"])

# Text-to-image
resp = requests.post(
    f"{ARK_BASE}/images/generations",
    headers={"Authorization": f"Bearer {API_KEY}"},
    json={
        "model": "doubao-seedream-5-0-260128",
        "prompt": "An orange cat rolling in the snow",
        "size": "2K",
        "n": 1,
        "watermark": False,
    },
    timeout=600,
)
print(resp.json()["data"][0]["url"])
```

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `401` / invalid key | Recreate the key under **API Key management**; make sure there are no extra spaces |
| Model missing / not enabled | Activate the model (Doubao Seed Vision / Seedream) under **Model Studio**; use the exact model id shown in the console |
| Insufficient balance | Top up or claim free-trial quota in the Volcengine console |
| `429` rate limit | Retry after the interval in the error, or raise the quota in the console |
| Understanding model id changed | Ark releases newer model versions; update the Model field in Vision Toolkit to the latest id |
