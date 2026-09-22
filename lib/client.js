window.__ModuleLoader__.load({ id: "@nextnowlabs/dsh-ark-toolkit", factory: (require) => {
var __modules = Object.create(null); var __cache = Object.create(null);
__modules["./index.js"] = function(module, exports, require, __load_) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inject = exports.ArkSettingsController = void 0;
exports.decodeArkResult = decodeArkResult;
exports.apply = apply;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * DSH Ark Toolkit browser plugin: dedicated Tool cards plus the bundle
 * configuration card on the bundle's page in the Plugins panel, with health
 * checks, connection tests, and safe Artifact previews.
 */
const react_1 = require("react");
const dsh_client_ui_primitives_1 = require("@deepseek-ai/dsh-client-ui-primitives");
const NS = 'ark-toolkit';
/** This bundle's package name; the key the Plugins page dispatches for its config slot. */
const ARK_TOOLKIT_PACKAGE = '@nextnowlabs/dsh-ark-toolkit';
const SETTINGS_ROUTE = '/_dsh/ark-toolkit/settings';
const PRESENTATION_META_KEY = '$dshArkToolkit';
const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
// Keep these browser defaults aligned with src/defaults.ts without importing server-side config.
const ARK_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';
const ARK_CREDENTIAL = 'ARK_API_KEY';
const ARK_SEEDREAM_MODEL = 'doubao-seedream-5-0-260128';
const TTS_BASE_URL = 'https://openspeech.bytedance.com/api/v3/tts/unidirectional/sse';
const TTS_CREDENTIAL = 'VOLCENGINE_TTS_KEY';
const TTS_RESOURCE = 'seed-tts-2.0';
const TTS_VOICE = 'zh_female_shuangkuaisisi_uranus_bigtts';
const ARK_TUTORIAL_URL = 'https://github.com/nextnowlabs/dsh-ark-toolkit/blob/main/docs/ark-doubao.md';
const en = {
    settingsTitle: 'Volcengine Ark Toolkit',
    settingsIntro: 'Configure the ByteDance models and API keys used by image generation and speech synthesis.',
    collapse: 'Collapse',
    expand: 'Expand',
    externalNotice: 'Image generation (ark_generate_image) and speech synthesis (ark_speak) send your prompt or text to the configured ByteDance services; the resulting file is written into the session workspace.',
    ark: 'Ark image generation',
    arkHint: 'Doubao Seedream model and Ark API key used by the ark_generate_image tool.',
    arkTutorial: 'Getting a Volcengine Ark API key and calling Doubao Seedream: step-by-step tutorial →',
    baseUrl: 'Base URL',
    apiKey: 'API key',
    apiKeyPlaceholderMissing: 'Paste the API key',
    apiKeyPlaceholderConfigured: 'Saved; leave blank to keep it',
    apiKeyHint: 'The key is stored in DSH Credentials and is never shown again after saving.',
    apiKeyLocked: 'The current key comes from a read-only source and cannot be replaced here.',
    apiKeyBlank: 'The API key cannot contain only spaces.',
    apiKeyInvalid: 'Paste only the key, without a variable name, quotes, spaces, or line breaks.',
    credential: 'Credential name',
    credentialHint: 'This is the DSH credential reference that stores the Volcengine Ark API key used by image generation.',
    model: 'Seedream model',
    modelHint: 'The ark_generate_image default; a tool call can still override it per request.',
    userAgent: 'User-Agent',
    tts: 'Speech (TTS)',
    ttsHint: 'ByteDance Volcengine Speech service used by the ark_speak tool, with its own app token independent of the Ark key.',
    ttsBaseUrl: 'TTS base URL',
    ttsCredential: 'TTS credential name',
    ttsResource: 'TTS resource / App ID',
    ttsVoice: 'Default voice',
    ttsKey: 'TTS app token',
    ttsKeyHint: 'The token is stored in DSH Credentials and is never shown again after saving.',
    limits: 'Limits',
    timeout: 'Request timeout (ms)',
    concurrency: 'Concurrent calls per session',
    save: 'Save and apply',
    saving: 'Validating runtime…',
    reload: 'Reload',
    saved: 'Settings validated and applied.',
    readOnly: 'Service settings are read-only. A writable API key can still be saved.',
    configured: 'Configured',
    missing: 'Missing',
    source: 'Source',
    sourceHint: '{source}: {value}',
    sourceEnv: 'Environment variable',
    sourceFile: 'Credential file',
    health: 'Health',
    runHealth: 'Run health check',
    testConnection: 'Test API connection',
    testing: 'Checking…',
    connectionHint: 'The health check inspects local readiness. The API connection test only queries GET /models on the configured Ark endpoint.',
    saveBeforeTesting: 'Save service changes before testing the connection.',
    advanced: 'Advanced settings',
    advancedHint: 'Credential names, endpoints, User-Agent, and request limits. Most users never need these.',
    pluginVersion: 'Plugin',
    activeGeneration: 'Runtime generation',
    activeGenerationValue: 'Generation {generation}',
    updates: 'Plugin updates',
    updatesHint: 'Check npm for a newer release, install it into this DSH profile, and restart DSH Web automatically.',
    manualUpdate: 'Manual update',
    manualUpdateHint: 'Run this command in your terminal to install the latest release into this DSH profile.',
    copy: 'Copy',
    copied: 'Copied',
    checkUpdate: 'Check for updates',
    checkingUpdate: 'Checking for updates…',
    updateAvailable: 'Update available',
    updateAvailableDetail: 'Version {version} is available. It will restart DSH Web automatically when safe; otherwise you will be asked to restart it manually.',
    upToDate: 'Up to date',
    upToDateDetail: 'Version {version} is the latest release.',
    updateNow: 'Install update',
    updatingPlugin: 'Installing update…',
    updateConfirm: 'Install Ark Toolkit {version} now? DSH Web will restart automatically when supported; otherwise a manual restart will be required.',
    restarting: 'Version {version} was installed. Waiting for DSH Web to restart…',
    manualRestartRequired: 'Version {version} was installed. Restart DSH Web through your usual command or process manager to activate it.',
    updateProfile: 'Profile',
    updateInstalled: 'Installed',
    updateLatest: 'Latest',
    updateUnsupported: 'In-app updates are unavailable for this installation.',
    updateReasonProfileNotFound: 'The running plugin could not be matched to a DSH profile installation.',
    updateReasonNotDependency: 'The plugin is not a direct dependency of this DSH profile.',
    updateReasonLocalSource: 'This profile uses a local, workspace, URL, or git installation; update that source manually so local work is not overwritten.',
    updateReasonReadOnly: 'The profile package manifest is read-only.',
    updateReasonPnpm: 'pnpm is unavailable in the DSH execution environment.',
    updateReasonPlatform: 'Automatic restart is unavailable on this operating system.',
    updateReasonRestartUnmanaged: 'Detached self-restart is disabled. Use a supported process manager, or explicitly opt in with DSH_ARK_TOOLKIT_ALLOW_DETACHED_RESTART=1 for an unsupervised Web process.',
    updateReasonRestartAddress: 'Automatic restart is unavailable when DSH Web uses an unknown or dynamically allocated port. Start it with a fixed --port value.',
    updateSaveFirst: 'Save or discard the current Settings and API key changes before updating the plugin.',
    restartTimedOut: 'DSH Web did not return with the target plugin version. Check the restart log and restart the Web profile through its original process manager.',
    restartRolledBack: 'The new plugin did not become ready, so the previous version was restored. Check the restart log before trying again.',
    runtimeUnavailable: 'Runtime unavailable',
    runtimeCandidateRejected: 'Last runtime candidate was rejected; the active generation remains available.',
    runtimeReady: 'Ready',
    runtimePureNode: 'Pure Node',
    retry: 'Retry',
    open: 'Open file',
    download: 'Download',
    previewUnavailable: 'HTTP preview is unavailable in this host; use Open file.',
    running: 'Running…',
    failed: 'Failed',
    artifact: 'Artifact',
    artifacts: 'Artifacts',
    noResult: 'Structured result unavailable; inspect the raw Tool result.',
    healthy: 'Healthy',
    degraded: 'Needs attention',
    notTested: 'Not tested',
    generateImageTitle: 'Generated image',
    speakTitle: 'Synthesized speech',
    artifactTitle: 'Ark Artifact',
    artifactSeedreamImage: 'Seedream generated image',
    artifactTtsSpeech: 'ByteDance TTS synthesized speech',
    healthCredential: 'Ark credential',
    healthTtsCredential: 'TTS credential',
    healthArtifactDirectory: 'Artifact directory',
    healthService: 'Ark service',
    statusOk: 'OK',
    statusWarning: 'Warning',
    statusError: 'Error',
    statusNotTested: 'Not tested',
    positiveInteger: '{field} must be a positive integer.',
    healthCredentialMissing: 'Credential {credential} is not configured.',
    healthCredentialReady: 'Credential {credential} is available.',
    healthCredentialFailed: 'Could not read credential {credential}.',
    healthDirectoryWritable: '{directory} is writable: {path}',
    healthDirectoryNotWritable: '{directory} is not writable: {path}',
    healthArtifactDirectoryFailed: 'Could not prepare the artifact directory.',
    healthConnectionNotTested: 'API connection not tested. Use Test API connection to query /models.',
    healthConnectionCredentialMissing: 'Connection test skipped because the credential is unavailable.',
    healthServiceResponded: 'Service responded at {endpoint} (HTTP {status}).',
    healthServiceRejectedCredential: 'Service rejected the configured credential (HTTP {status}).',
    healthServiceForbidden: 'Service is reachable, but GET /models is restricted (HTTP {status}). This is often an account or model-list permission limit, not an invalid key.',
    healthServiceNoModels: 'Service is reachable but does not support GET /models (HTTP {status}).',
    healthServiceRateLimited: 'Service is reachable, but the connection test was rate-limited (HTTP 429).',
    healthServiceHttpFailed: 'Connection test failed with HTTP {status}.',
    healthServiceUnreachable: 'Could not reach {endpoint}.',
};
const zh = {
    settingsTitle: '火山引擎',
    settingsIntro: '配置文生图与语音合成使用的字节模型和 API 密钥。',
    collapse: '收起',
    expand: '展开',
    externalNotice: '文生图（ark_generate_image）和语音合成（ark_speak）会把提示词或文本发送到下方配置的字节服务；生成的文件会写入当前会话工作区。',
    ark: '火山方舟文生图',
    arkHint: 'ark_generate_image 工具使用的豆包 Seedream 模型与方舟 API 密钥。',
    arkTutorial: '申请火山方舟 API Key 并用豆包 Seedream 生成图片：图文教程 →',
    baseUrl: 'API 地址',
    apiKey: 'API 密钥',
    apiKeyPlaceholderMissing: '粘贴 API 密钥',
    apiKeyPlaceholderConfigured: '已保存；留空表示不修改',
    apiKeyHint: '密钥会保存到 DSH 凭据存储，保存后不会在页面中回显。',
    apiKeyLocked: '当前密钥来自只读配置，无法在此替换。',
    apiKeyBlank: 'API 密钥不能只包含空格。',
    apiKeyInvalid: '请只粘贴密钥本身，不要包含变量名、引号、空格或换行。',
    credential: '凭据名称',
    credentialHint: '这是保存火山方舟 API 密钥的 DSH 凭据名称，供文生图使用。',
    model: 'Seedream 模型',
    modelHint: 'ark_generate_image 的默认模型；调用时仍可单独覆盖。',
    userAgent: 'User-Agent',
    tts: '语音合成（TTS）',
    ttsHint: 'ark_speak 工具使用的字节火山语音服务，App Token 与方舟文生图密钥相互独立。',
    ttsBaseUrl: 'TTS 接口地址',
    ttsCredential: 'TTS 凭据名称',
    ttsResource: 'TTS 资源 ID（App ID）',
    ttsVoice: '默认音色',
    ttsKey: 'TTS App Token',
    ttsKeyHint: 'Token 会保存到 DSH 凭据存储，保存后不会在页面中回显。',
    limits: '请求限制',
    timeout: '单次请求超时（毫秒）',
    concurrency: '单个会话最多并发任务数',
    save: '保存设置',
    saving: '正在检查并应用…',
    reload: '重新加载',
    saved: '设置已保存并生效。',
    readOnly: '服务设置来自只读配置；如果 API 密钥可写，仍可在此保存密钥。',
    configured: '已就绪',
    missing: '未配置',
    source: '配置来源',
    sourceHint: '{source}：{value}',
    sourceEnv: '环境变量',
    sourceFile: '凭据文件',
    health: '运行检查',
    runHealth: '检查本地环境',
    testConnection: '测试 API 连接',
    testing: '检查中…',
    connectionHint: '“检查本地环境”只检查本机就绪情况；“测试 API 连接”只请求配置的方舟地址上的 GET /models。',
    saveBeforeTesting: '修改服务配置后，请先保存，再执行连接测试。',
    advanced: '高级设置',
    advancedHint: '凭据名称、服务地址、User-Agent 和请求限制。一般无需修改。',
    pluginVersion: '插件版本',
    activeGeneration: '本次运行已应用',
    activeGenerationValue: '{generation} 次',
    updates: '插件更新',
    updatesHint: '检查 npm 新版本，自动更新当前 DSH Profile 中的插件，然后重启 DSH Web。',
    manualUpdate: '手动更新',
    manualUpdateHint: '在终端运行以下命令，将当前 DSH Profile 更新到最新版本。',
    copy: '复制',
    copied: '已复制',
    checkUpdate: '检查更新',
    checkingUpdate: '正在检查更新…',
    updateAvailable: '发现新版本',
    updateAvailableDetail: '可更新到 {version}。能安全自重启时会自动重启，否则安装完成后会提示你手动重启。',
    upToDate: '已是最新版',
    upToDateDetail: '当前 {version} 已是最新正式版本。',
    updateNow: '安装更新',
    updatingPlugin: '正在安装更新…',
    updateConfirm: '现在安装 Ark Toolkit {version} 吗？支持安全自重启时会自动重启，否则需要你手动重启 DSH Web。',
    restarting: '已安装 {version}，正在等待 DSH Web 重启…',
    manualRestartRequired: '已安装 {version}。请按你平时的方式手动重启 DSH Web，重启后新版本生效。',
    updateProfile: 'Profile',
    updateInstalled: '当前版本',
    updateLatest: '最新版本',
    updateUnsupported: '当前安装方式不支持页面内更新。',
    updateReasonProfileNotFound: '无法把正在运行的插件匹配到某个 DSH Profile 安装。',
    updateReasonNotDependency: '该插件不是当前 DSH Profile 的直接依赖。',
    updateReasonLocalSource: '当前使用本地、workspace、URL 或 git 安装；为避免覆盖本地修改，请手动更新对应来源。',
    updateReasonReadOnly: '当前 Profile 的 package.json 不可写。',
    updateReasonPnpm: 'DSH 运行环境中找不到 pnpm。',
    updateReasonPlatform: '当前操作系统不支持安全的自动重启。',
    updateReasonRestartUnmanaged: '默认禁用脱离原进程管理器的自重启。仅对无人监管的 Web 进程明确设置 DSH_ARK_TOOLKIT_ALLOW_DETACHED_RESTART=1 后开放。',
    updateReasonRestartAddress: 'DSH Web 使用未知端口或动态端口时无法安全自动重启。请用固定的 --port 值启动。',
    updateSaveFirst: '更新插件前，请先保存或放弃当前 Settings 和 API 密钥修改。',
    restartTimedOut: 'DSH Web 未能以目标插件版本恢复。请检查重启日志，并通过原进程管理器重启 Web Profile。',
    restartRolledBack: '新插件未能就绪，系统已恢复上一版本。再次尝试前请检查重启日志。',
    runtimeUnavailable: '运行环境尚未就绪',
    runtimeCandidateRejected: '新设置未能生效，仍在使用上一次可用的设置。',
    runtimeReady: '已就绪',
    runtimePureNode: '纯 Node',
    retry: '重试',
    open: '在工作区中打开',
    download: '下载',
    previewUnavailable: '此页面无法直接预览该文件，请在工作区中打开。',
    running: '运行中…',
    failed: '运行失败',
    artifact: '生成文件',
    artifacts: '个生成文件',
    noResult: '未能读取结果，请查看工具的原始输出。',
    healthy: '一切正常',
    degraded: '有项目需要处理',
    notTested: '尚未检查',
    generateImageTitle: '生成的图片',
    speakTitle: '合成语音',
    artifactTitle: '生成文件',
    artifactSeedreamImage: 'Seedream 生成的图片',
    artifactTtsSpeech: '字节 TTS 语音合成',
    healthCredential: '方舟凭据',
    healthTtsCredential: 'TTS 凭据',
    healthArtifactDirectory: '输出目录',
    healthService: '方舟服务',
    statusOk: '正常',
    statusWarning: '注意',
    statusError: '异常',
    statusNotTested: '未检查',
    positiveInteger: '{field}必须填写正整数。',
    healthCredentialMissing: '尚未配置凭据 {credential}。',
    healthCredentialReady: '已找到凭据 {credential}。',
    healthCredentialFailed: '无法读取凭据 {credential}。',
    healthDirectoryWritable: '{directory}可写：{path}',
    healthDirectoryNotWritable: '{directory}不可写：{path}',
    healthArtifactDirectoryFailed: '无法准备输出目录。',
    healthConnectionNotTested: '尚未测试 API 连接。点击“测试 API 连接”可请求 /models。',
    healthConnectionCredentialMissing: 'API 密钥不可用，未执行连接测试。',
    healthServiceResponded: '服务已响应：{endpoint}（HTTP {status}）。',
    healthServiceRejectedCredential: '服务拒绝了当前 API 密钥（HTTP {status}）。',
    healthServiceForbidden: '服务可以访问，但对 GET /models 的访问被限制（HTTP {status}）。这通常是账号或模型列表权限限制，不代表密钥无效。',
    healthServiceNoModels: '服务可以访问，但不支持 GET /models（HTTP {status}）。',
    healthServiceRateLimited: '服务可以访问，但本次连接测试触发了限流（HTTP 429）。',
    healthServiceHttpFailed: '连接测试失败（HTTP {status}）。',
    healthServiceUnreachable: '无法连接到 {endpoint}。',
};
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function textOfContent(block) {
    if (!('kind' in block))
        return '';
    return block.content
        .filter((entry) => entry.type === 'text')
        .map(entry => entry.text)
        .join('\n');
}
/** Decode canonical presentation metadata with a JSON-text fallback. */
function decodeArkResult(block) {
    if (!('kind' in block) || block.isError)
        return undefined;
    if (isRecord(block.meta))
        return block.meta;
    const text = textOfContent(block).trim();
    if (text.length === 0)
        return undefined;
    try {
        const parsed = JSON.parse(text);
        return isRecord(parsed) ? parsed : undefined;
    }
    catch {
        return undefined;
    }
}
function accessMap(value) {
    const map = new Map();
    if (value === undefined)
        return map;
    const envelope = value[PRESENTATION_META_KEY];
    if (!isRecord(envelope) || envelope.schemaVersion !== 1 || !Array.isArray(envelope.artifacts))
        return map;
    for (const entry of envelope.artifacts) {
        if (!isRecord(entry) || typeof entry.path !== 'string' || typeof entry.previewUrl !== 'string' || typeof entry.downloadUrl !== 'string')
            continue;
        map.set(entry.path, entry);
    }
    return map;
}
function artifactFrom(value) {
    if (!isRecord(value))
        return undefined;
    if (typeof value.path !== 'string'
        || typeof value.filename !== 'string'
        || typeof value.mimeType !== 'string'
        || (value.kind !== 'image' && value.kind !== 'svg' && value.kind !== 'markdown' && value.kind !== 'json' && value.kind !== 'audio')
        || typeof value.description !== 'string'
        || typeof value.sourceTool !== 'string'
        || (value.previewIntent !== 'image' && value.previewIntent !== 'svg' && value.previewIntent !== 'text' && value.previewIntent !== 'download')
        || typeof value.bytes !== 'number')
        return undefined;
    return value;
}
function collectArtifacts(value, found = new Map(), depth = 0) {
    if (depth > 16)
        return [...found.values()];
    const artifact = artifactFrom(value);
    if (artifact !== undefined) {
        found.set(artifact.path, artifact);
        return [...found.values()];
    }
    if (Array.isArray(value)) {
        for (const entry of value)
            collectArtifacts(entry, found, depth + 1);
    }
    else if (isRecord(value)) {
        for (const entry of Object.values(value))
            collectArtifacts(entry, found, depth + 1);
    }
    return [...found.values()];
}
function formatBytes(bytes) {
    if (bytes < 1024)
        return `${bytes} B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function statusText(block, t) {
    if (!('kind' in block))
        return t('running');
    if (block.isError)
        return textOfContent(block).split('\n')[0] || t('failed');
    return undefined;
}
/** Small inline glyph for the Ark Tool cards. */
function ArkIcon() {
    return ((0, jsx_runtime_1.jsx)("svg", { viewBox: "0 0 16 16", width: "16", height: "16", "aria-hidden": "true", fill: "none", stroke: "currentColor", strokeWidth: "1.35", strokeLinecap: "round", strokeLinejoin: "round", children: (0, jsx_runtime_1.jsx)("path", { d: "M3 5V3h2M11 3h2v2M13 11v2h-2M5 13H3v-2M5 8h6" }) }));
}
function ToolShell({ block, title, summary, icon, children, t, }) {
    const [open, setOpen] = (0, react_1.useState)(true);
    const status = statusText(block, t);
    const expandable = children !== undefined && children !== null;
    return ((0, jsx_runtime_1.jsxs)("section", { className: "dvt-tool", "data-state": !('kind' in block) ? 'running' : block.isError ? 'error' : 'success', children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", className: "dvt-tool-head", onClick: () => { if (expandable)
                    setOpen(value => !value); }, "aria-expanded": expandable ? open : undefined, children: [(0, jsx_runtime_1.jsx)("span", { className: "dvt-tool-icon", children: icon }), (0, jsx_runtime_1.jsx)("span", { className: "dvt-tool-title", children: title }), summary !== undefined && summary.length > 0 ? (0, jsx_runtime_1.jsx)("span", { className: "dvt-tool-sep", "aria-hidden": "true", children: "\u00B7" }) : null, summary !== undefined ? (0, jsx_runtime_1.jsx)("span", { className: "dvt-tool-summary", children: summary }) : null, status !== undefined ? (0, jsx_runtime_1.jsx)("span", { className: "dvt-tool-status", children: status }) : null, expandable ? (0, jsx_runtime_1.jsx)("span", { className: "dvt-chevron", "data-open": open || undefined, children: "\u2304" }) : null] }), expandable && open ? (0, jsx_runtime_1.jsx)("div", { className: "dvt-tool-body", children: children }) : null] }));
}
function ArtifactActions({ artifact, grant, openFile, t }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "dvt-actions", children: [(0, jsx_runtime_1.jsx)(dsh_client_ui_primitives_1.Button, { size: "sm", variant: "outline", onClick: () => { openFile(artifact.path); }, children: t('open') }), grant === undefined ? null : (0, jsx_runtime_1.jsx)("a", { className: "dvt-download", href: grant.downloadUrl, download: artifact.filename, children: t('download') })] }));
}
function ArtifactPreview({ artifact, grant, openFile, t }) {
    const canPreview = grant !== undefined && (artifact.kind === 'image' || artifact.kind === 'svg');
    const description = artifactDescription(artifact.description, t);
    return ((0, jsx_runtime_1.jsxs)("article", { className: "dvt-artifact", children: [canPreview
                ? artifact.kind === 'svg'
                    ? (0, jsx_runtime_1.jsx)("iframe", { className: "dvt-preview dvt-svg", sandbox: "", src: grant.previewUrl, title: description })
                    : (0, jsx_runtime_1.jsx)("img", { className: "dvt-preview", src: grant.previewUrl, alt: description, loading: "lazy" })
                : null, (0, jsx_runtime_1.jsxs)("div", { className: "dvt-artifact-meta", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: artifact.filename }), (0, jsx_runtime_1.jsx)("span", { children: description }), (0, jsx_runtime_1.jsxs)("small", { children: [artifact.mimeType, " \u00B7 ", formatBytes(artifact.bytes)] })] }), (0, jsx_runtime_1.jsx)(ArtifactActions, { artifact: artifact, grant: grant, openFile: openFile, t: t })] }), !canPreview && grant === undefined ? (0, jsx_runtime_1.jsx)("p", { className: "dvt-muted", children: t('previewUnavailable') }) : null] }));
}
const ARTIFACT_DESCRIPTION_KEYS = {
    'Seedream generated image': 'artifactSeedreamImage',
    'ByteDance TTS speech': 'artifactTtsSpeech',
};
function artifactDescription(description, t) {
    const key = ARTIFACT_DESCRIPTION_KEYS[description];
    if (key !== undefined) {
        const translated = t(key);
        return translated === key ? description : translated;
    }
    return description;
}
function ArtifactView({ block, openFile, toolName, t = key => en[key] }) {
    const value = decodeArkResult(block);
    const artifacts = collectArtifacts(value);
    const grants = accessMap(value);
    const title = toolName === 'ark_generate_image' ? t('generateImageTitle')
        : toolName === 'ark_speak' ? t('speakTitle')
            : t('artifactTitle');
    return ((0, jsx_runtime_1.jsx)(ToolShell, { block: block, title: title, summary: artifacts.length > 0 ? `${artifacts.length} ${t('artifacts')}` : undefined, icon: (0, jsx_runtime_1.jsx)(ArkIcon, {}), t: t, children: artifacts.length === 0 ? (0, jsx_runtime_1.jsx)("p", { className: "dvt-muted", children: t('noResult') }) : (0, jsx_runtime_1.jsx)("div", { className: "dvt-stack", children: artifacts.map(artifact => (0, jsx_runtime_1.jsx)(ArtifactPreview, { artifact: artifact, grant: grants.get(artifact.path), openFile: openFile, t: t }, artifact.path)) }) }));
}
async function apiRequest(init) {
    const response = await fetch(SETTINGS_ROUTE, { credentials: 'same-origin', ...init });
    const body = await response.json();
    if (!response.ok || !body.ok) {
        const failure = body;
        throw new Error(failure.error?.message ?? `Ark Toolkit request failed with HTTP ${response.status}`);
    }
    return body.value;
}
/** Small external store shared by the Settings route and pushed invalidations. */
class ArkSettingsController {
    state = { status: 'idle' };
    listeners = new Set();
    generation = 0;
    subscribe = (listener) => {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    };
    snapshot = () => this.state;
    set(next) {
        this.state = next;
        for (const listener of this.listeners)
            listener();
    }
    async load() {
        const generation = ++this.generation;
        this.set({ ...this.state, status: 'loading', error: undefined, message: undefined });
        try {
            const snapshot = await apiRequest();
            if (generation !== this.generation)
                return;
            this.set({
                status: 'ready',
                snapshot,
                health: this.state.health,
                update: this.state.update,
                restart: this.state.restart,
            });
        }
        catch (error) {
            if (generation !== this.generation)
                return;
            this.set({ ...this.state, status: 'error', error: error instanceof Error ? error.message : String(error) });
        }
    }
    refreshIfLoaded() {
        if (this.state.status === 'idle' || this.state.action === 'save')
            return;
        void this.load();
    }
    async save(value, expectedRevision, credentialValue, credentialTtsValue, writeSettings) {
        this.set({ ...this.state, action: 'save', error: undefined, message: undefined });
        let snapshot = this.state.snapshot;
        try {
            if (writeSettings) {
                snapshot = await apiRequest({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'save', expectedRevision, value }),
                });
            }
            if (snapshot === undefined)
                throw new Error('Ark Toolkit Settings are unavailable');
            if (credentialValue !== undefined) {
                try {
                    snapshot = await apiRequest({
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'credential',
                            expectedRevision: snapshot.settings.revision,
                            ref: snapshot.credential.ref,
                            value: credentialValue,
                        }),
                    });
                }
                catch (error) {
                    this.set({
                        status: 'ready',
                        snapshot,
                        health: this.state.health,
                        update: this.state.update,
                        restart: this.state.restart,
                        error: error instanceof Error ? error.message : String(error),
                    });
                    return false;
                }
            }
            if (credentialTtsValue !== undefined) {
                try {
                    snapshot = await apiRequest({
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'credential',
                            expectedRevision: snapshot.settings.revision,
                            ref: snapshot.credentialTts.ref,
                            value: credentialTtsValue,
                        }),
                    });
                }
                catch (error) {
                    this.set({
                        status: 'ready',
                        snapshot,
                        health: this.state.health,
                        update: this.state.update,
                        restart: this.state.restart,
                        error: error instanceof Error ? error.message : String(error),
                    });
                    return false;
                }
            }
            this.set({
                status: 'ready',
                snapshot,
                health: this.state.health,
                update: this.state.update,
                restart: this.state.restart,
                message: 'saved',
            });
            return true;
        }
        catch (error) {
            this.set({ ...this.state, action: undefined, error: error instanceof Error ? error.message : String(error) });
            return false;
        }
        finally {
            this.set({ ...this.state, action: undefined });
        }
    }
    async runHealth(mode) {
        this.set({ ...this.state, action: mode, error: undefined, message: undefined });
        try {
            const health = await apiRequest({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'health', testConnection: mode === 'connection' }),
            });
            this.set({ ...this.state, action: undefined, health });
        }
        catch (error) {
            this.set({ ...this.state, action: undefined, error: error instanceof Error ? error.message : String(error) });
        }
    }
    async checkUpdate() {
        this.set({ ...this.state, action: 'check-update', error: undefined, message: undefined });
        try {
            const update = await apiRequest({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'check-update' }),
            });
            this.set({ ...this.state, action: undefined, update });
        }
        catch (error) {
            this.set({ ...this.state, action: undefined, error: error instanceof Error ? error.message : String(error) });
        }
    }
    async applyUpdate(expectedVersion) {
        this.set({ ...this.state, action: 'apply-update', error: undefined, message: undefined });
        try {
            const result = await apiRequest({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'apply-update', expectedVersion }),
            });
            this.set({
                ...this.state,
                action: undefined,
                restart: result,
                message: result.restarting ? 'restarting' : 'manual-restart-required',
            });
        }
        catch (error) {
            this.set({ ...this.state, action: undefined, error: error instanceof Error ? error.message : String(error) });
        }
    }
    reportRestartTimeout(message) {
        this.set({ ...this.state, restart: undefined, message: undefined, error: message });
    }
}
exports.ArkSettingsController = ArkSettingsController;
function draftOf(value) {
    return {
        baseUrl: value.provider?.baseUrl ?? ARK_BASE_URL,
        credential: value.provider?.credential ?? ARK_CREDENTIAL,
        userAgent: value.provider?.userAgent ?? DEFAULT_USER_AGENT,
        ttsBaseUrl: value.provider?.tts?.baseUrl ?? TTS_BASE_URL,
        ttsCredential: value.provider?.tts?.credential ?? TTS_CREDENTIAL,
        ttsResource: value.provider?.tts?.resource ?? TTS_RESOURCE,
        ttsVoice: value.provider?.tts?.voice ?? TTS_VOICE,
        timeoutMs: String(value.timeoutMs ?? 600000),
        concurrency: String(value.concurrency ?? 4),
    };
}
function positiveInteger(raw, label, t) {
    const value = Number(raw);
    if (!Number.isSafeInteger(value) || value <= 0)
        throw new Error(t('positiveInteger', { field: label }));
    return value;
}
function apiKeyFailure(value, t) {
    if (value.length === 0)
        return undefined;
    const trimmed = value.trim();
    if (trimmed.length === 0)
        return t('apiKeyBlank');
    const quoted = trimmed.length > 1 && ['"', '\'', '`'].includes(trimmed[0] ?? '') && trimmed.endsWith(trimmed[0] ?? '');
    const environmentLine = /^[A-Z][A-Z0-9_]*=[^=]/u.test(trimmed);
    if (quoted || environmentLine || !/^[\x21-\x7E]+$/u.test(trimmed))
        return t('apiKeyInvalid');
    return undefined;
}
function valueOf(draft, t) {
    return {
        provider: {
            baseUrl: draft.baseUrl.trim(),
            credential: draft.credential.trim(),
            userAgent: draft.userAgent.trim(),
            tts: {
                baseUrl: draft.ttsBaseUrl.trim(),
                credential: draft.ttsCredential.trim(),
                resource: draft.ttsResource.trim(),
                voice: draft.ttsVoice.trim(),
            },
        },
        timeoutMs: positiveInteger(draft.timeoutMs, t('timeout'), t),
        concurrency: positiveInteger(draft.concurrency, t('concurrency'), t),
    };
}
function settingsDraftChanged(draft, saved, t) {
    try {
        return JSON.stringify(valueOf(draft, t)) !== JSON.stringify(valueOf(draftOf(saved), t));
    }
    catch {
        return true;
    }
}
function Field({ label, children, hint }) {
    return (0, jsx_runtime_1.jsxs)("label", { className: "dvt-field", children: [(0, jsx_runtime_1.jsx)("span", { children: label }), children, hint === undefined ? null : (0, jsx_runtime_1.jsx)("small", { children: hint })] });
}
/**
 * This bundle's configuration on its page in the Plugins panel, registered
 * under the bundle's package name. The card keeps its own collapsible head
 * because that head carries the credential-state pill and the collapse
 * control; the page draws the plugin title, icon, and crumb above it. The body
 * keeps the staged form, health checks, and update controls.
 */
function SettingsCard({ controller, t, view = 'page' }) {
    const [open, setOpen] = (0, react_1.useState)(false);
    const state = (0, react_1.useSyncExternalStore)(controller.subscribe, controller.snapshot, controller.snapshot);
    const snapshot = state.snapshot;
    const status = snapshot === undefined
        ? undefined
        : !snapshot.runtime.ready
            ? { label: t('runtimeUnavailable'), tone: 'error' }
            : snapshot.credential.configured
                ? { label: t('configured'), tone: 'ok' }
                : { label: t('missing'), tone: 'error' };
    // The bundle slot only ever dispatches `page`; the one-liner stays available
    // so the same registration satisfies both halves of the slot contract.
    if (view === 'summary')
        return status === undefined ? null : (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: status.label });
    return ((0, jsx_runtime_1.jsxs)("div", { className: "dvt-plugin-card", "data-open": open || undefined, children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", className: "dvt-card-head", "aria-expanded": open, "aria-label": `${t(open ? 'collapse' : 'expand')}: ${t('settingsTitle')}`, onClick: () => { setOpen(value => !value); }, children: [(0, jsx_runtime_1.jsxs)("span", { className: "dvt-card-head-text", children: [(0, jsx_runtime_1.jsx)("strong", { children: t('settingsTitle') }), (0, jsx_runtime_1.jsx)("small", { children: t('settingsIntro') })] }), status === undefined ? null : (0, jsx_runtime_1.jsx)("span", { className: "dvt-card-pill", "data-status": status.tone, children: status.label }), (0, jsx_runtime_1.jsx)("span", { className: "dvt-card-chevron", "aria-hidden": "true", children: "\u2304" })] }), (0, jsx_runtime_1.jsx)("div", { className: "dvt-card-body", hidden: !open, children: (0, jsx_runtime_1.jsx)(LoadedSettings, { controller: controller, t: t }) })] }));
}
const HEALTH_NAME_KEYS = {
    credential: 'healthCredential',
    ttsCredential: 'healthTtsCredential',
    artifactDirectory: 'healthArtifactDirectory',
    service: 'healthService',
};
const HEALTH_STATUS_KEYS = {
    ok: 'statusOk',
    warning: 'statusWarning',
    error: 'statusError',
    not_tested: 'statusNotTested',
};
function healthDetail(detail, t) {
    let match = /^credential (.+) is not configured$/u.exec(detail);
    if (match !== null)
        return t('healthCredentialMissing', { credential: match[1] });
    match = /^credential (.+) is resolvable$/u.exec(detail);
    if (match !== null)
        return t('healthCredentialReady', { credential: match[1] });
    match = /^credential (.+) could not be resolved$/u.exec(detail);
    if (match !== null)
        return t('healthCredentialFailed', { credential: match[1] });
    match = /^Artifact directory is writable: (.+)$/u.exec(detail);
    if (match !== null)
        return t('healthDirectoryWritable', { directory: t('healthArtifactDirectory'), path: match[1] });
    match = /^Artifact directory is not writable: (.+)$/u.exec(detail);
    if (match !== null)
        return t('healthDirectoryNotWritable', { directory: t('healthArtifactDirectory'), path: match[1] });
    if (detail === 'Artifact directory could not be prepared')
        return t('healthArtifactDirectoryFailed');
    if (detail === 'Connection was not tested; pass testConnection=true to query the configured /models endpoint')
        return t('healthConnectionNotTested');
    if (detail === 'Connection test skipped because the configured credential is unavailable')
        return t('healthConnectionCredentialMissing');
    match = /^Service responded at (.+) \(HTTP (\d+)\)$/u.exec(detail);
    if (match !== null)
        return t('healthServiceResponded', { endpoint: match[1], status: match[2] });
    match = /^Service rejected the configured credential \(HTTP (\d+)\)$/u.exec(detail);
    if (match !== null)
        return t('healthServiceRejectedCredential', { status: match[1] });
    match = /^Service is reachable but restricted GET \/models \(HTTP (\d+)\); the credential may still be valid for image generation$/u.exec(detail);
    if (match !== null)
        return t('healthServiceForbidden', { status: match[1] });
    match = /^Service is reachable but does not expose GET \/models \(HTTP (\d+)\)$/u.exec(detail);
    if (match !== null)
        return t('healthServiceNoModels', { status: match[1] });
    if (detail === 'Service is reachable but rate-limited the connection test (HTTP 429)')
        return t('healthServiceRateLimited');
    match = /^Service connection test failed with HTTP (\d+)$/u.exec(detail);
    if (match !== null)
        return t('healthServiceHttpFailed', { status: match[1] });
    match = /^Service could not be reached at (.+)$/u.exec(detail);
    if (match !== null)
        return t('healthServiceUnreachable', { endpoint: match[1] });
    return detail;
}
function credentialSource(source, t) {
    if (source === 'env')
        return t('sourceEnv');
    if (source === 'file')
        return t('sourceFile');
    return source;
}
const UPDATE_REASON_KEYS = {
    'profile-not-found': 'updateReasonProfileNotFound',
    'not-direct-dependency': 'updateReasonNotDependency',
    'unsupported-install-source': 'updateReasonLocalSource',
    'profile-read-only': 'updateReasonReadOnly',
    'pnpm-unavailable': 'updateReasonPnpm',
    'unsupported-platform': 'updateReasonPlatform',
    'restart-unmanaged': 'updateReasonRestartUnmanaged',
    'restart-address-unavailable': 'updateReasonRestartAddress',
};
function wait(delayMs) {
    return new Promise(resolve => { setTimeout(resolve, delayMs); });
}
function LoadedSettings({ controller, t }) {
    const state = (0, react_1.useSyncExternalStore)(controller.subscribe, controller.snapshot, controller.snapshot);
    const snapshot = state.snapshot;
    const [draft, setDraft] = (0, react_1.useState)(undefined);
    const [apiKey, setApiKey] = (0, react_1.useState)('');
    const [ttsKey, setTtsKey] = (0, react_1.useState)('');
    const [draftError, setDraftError] = (0, react_1.useState)(undefined);
    const [copiedCommand, setCopiedCommand] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => { if (state.status === 'idle')
        void controller.load(); }, [controller, state.status]);
    (0, react_1.useEffect)(() => {
        if (snapshot !== undefined)
            setDraft(draftOf(snapshot.settings.value));
    }, [snapshot]);
    (0, react_1.useEffect)(() => {
        const restart = state.restart;
        if (restart === undefined || !restart.restarting)
            return;
        let cancelled = false;
        void (async () => {
            await wait(restart.retryAfterMs);
            const deadline = Date.now() + 390_000;
            let outageSeen = false;
            while (!cancelled && Date.now() < deadline) {
                try {
                    const current = await apiRequest();
                    if (current.release.pluginVersion === restart.toVersion) {
                        window.location.reload();
                        return;
                    }
                    if (outageSeen && current.release.pluginVersion === restart.fromVersion) {
                        controller.reportRestartTimeout(t('restartRolledBack'));
                        return;
                    }
                }
                catch {
                    // The expected outage while the replacement process starts.
                    outageSeen = true;
                }
                await wait(1_000);
            }
            if (!cancelled)
                controller.reportRestartTimeout(t('restartTimedOut'));
        })();
        return () => { cancelled = true; };
    }, [controller, state.restart, t]);
    if (state.status === 'idle' || (state.status === 'loading' && snapshot === undefined)) {
        return (0, jsx_runtime_1.jsx)("div", { className: "dvt-settings", children: (0, jsx_runtime_1.jsx)("div", { className: "dvt-loading", children: t('testing') }) });
    }
    if (snapshot === undefined || draft === undefined) {
        return (0, jsx_runtime_1.jsxs)("div", { className: "dvt-settings", children: [(0, jsx_runtime_1.jsx)("div", { className: "dvt-alert error", children: state.error ?? t('runtimeUnavailable') }), (0, jsx_runtime_1.jsx)(dsh_client_ui_primitives_1.Button, { variant: "outline", onClick: () => { void controller.load(); }, children: t('retry') })] });
    }
    const update = (key, value) => setDraft(current => current === undefined ? current : { ...current, [key]: value });
    const save = () => {
        try {
            const keyFailure = apiKeyFailure(apiKey, t);
            if (keyFailure !== undefined) {
                setDraftError(keyFailure);
                return;
            }
            const credentialValue = apiKey.length === 0 ? undefined : apiKey.trim();
            const credentialTtsValue = ttsKey.length === 0 ? undefined : ttsKey.trim();
            setDraftError(undefined);
            void controller.save(valueOf(draft, t), snapshot.settings.revision, credentialValue, credentialTtsValue, snapshot.writable).then(saved => { if (saved) {
                setApiKey('');
                setTtsKey('');
            } });
        }
        catch (error) {
            setDraftError(error instanceof Error ? error.message : String(error));
        }
    };
    const busy = state.action !== undefined;
    const credentialMatchesSnapshot = draft.credential.trim() === snapshot.credential.ref;
    const ttsCredentialMatchesSnapshot = draft.ttsCredential.trim() === snapshot.credentialTts.ref;
    const keyLocked = credentialMatchesSnapshot
        && !snapshot.credential.writable;
    const ttsKeyLocked = ttsCredentialMatchesSnapshot
        && !snapshot.credentialTts.writable;
    const canSave = snapshot.writable || (apiKey.length > 0 && !keyLocked) || (ttsKey.length > 0 && !ttsKeyLocked);
    const runtimeErrorTitle = snapshot.runtime.ready ? t('runtimeCandidateRejected') : t('runtimeUnavailable');
    const pluginUpdate = state.update;
    const updateCapability = pluginUpdate ?? snapshot.release.update;
    const latestVersion = pluginUpdate?.latestVersion;
    const updateReason = updateCapability.reason === undefined ? undefined : t(UPDATE_REASON_KEYS[updateCapability.reason]);
    const updateCheckSupported = updateCapability.checkSupported ?? updateCapability.supported;
    const updateHasUnsavedChanges = apiKey.length > 0 || ttsKey.length > 0 || settingsDraftChanged(draft, snapshot.settings.value, t);
    const manualUpdateProfile = updateCapability.profile ?? 'web';
    const manualUpdateCommand = `dsh plugin --profile ${manualUpdateProfile} add @nextnowlabs/dsh-ark-toolkit@latest --registry=https://registry.npmjs.org/`;
    const copyManualUpdate = () => {
        void navigator.clipboard?.writeText(manualUpdateCommand)
            .then(() => {
            setCopiedCommand(true);
            window.setTimeout(() => setCopiedCommand(false), 2_000);
        })
            .catch(() => { });
    };
    const applyUpdate = () => {
        if (latestVersion === undefined)
            return;
        if (!window.confirm(t('updateConfirm', { version: latestVersion })))
            return;
        void controller.applyUpdate(latestVersion);
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "dvt-settings", children: [(0, jsx_runtime_1.jsx)("div", { className: "dvt-alert notice", children: t('externalNotice') }), !snapshot.writable ? (0, jsx_runtime_1.jsx)("div", { className: "dvt-alert warning", children: t('readOnly') }) : null, draftError === undefined ? null : (0, jsx_runtime_1.jsx)("div", { className: "dvt-alert error", children: draftError }), state.error === undefined ? null : (0, jsx_runtime_1.jsx)("div", { className: "dvt-alert error", children: state.error }), state.message === 'saved' ? (0, jsx_runtime_1.jsx)("div", { className: "dvt-alert success", children: t('saved') }) : null, state.message === 'restarting' && state.restart !== undefined ? (0, jsx_runtime_1.jsx)("div", { className: "dvt-alert success", children: t('restarting', { version: state.restart.toVersion }) }) : null, state.message === 'manual-restart-required' && state.restart !== undefined ? (0, jsx_runtime_1.jsx)("div", { className: "dvt-alert success", children: t('manualRestartRequired', { version: state.restart.toVersion }) }) : null, snapshot.runtime.lastError === undefined ? null : (0, jsx_runtime_1.jsxs)("div", { className: "dvt-alert error", children: [(0, jsx_runtime_1.jsx)("strong", { children: runtimeErrorTitle }), (0, jsx_runtime_1.jsx)("span", { children: snapshot.runtime.lastError })] }), (0, jsx_runtime_1.jsxs)("section", { className: "dvt-panel dvt-essential", children: [(0, jsx_runtime_1.jsxs)("div", { className: "dvt-panel-title", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h3", { children: t('ark') }), (0, jsx_runtime_1.jsx)("p", { children: t('arkHint') })] }), (0, jsx_runtime_1.jsx)("span", { className: `dvt-badge ${snapshot.credential.configured ? 'ok' : 'error'}`, children: snapshot.credential.configured ? t('configured') : t('missing') })] }), (0, jsx_runtime_1.jsx)("p", { className: "dvt-tutorial-link", children: (0, jsx_runtime_1.jsx)("a", { href: ARK_TUTORIAL_URL, target: "_blank", rel: "noreferrer", children: t('arkTutorial') }) }), (0, jsx_runtime_1.jsx)("div", { className: "dvt-form-grid", children: (0, jsx_runtime_1.jsx)(Field, { label: t('apiKey'), hint: keyLocked ? t('apiKeyLocked') : snapshot.credential.source === undefined ? t('apiKeyHint') : `${t('apiKeyHint')} ${t('sourceHint', { source: t('source'), value: credentialSource(snapshot.credential.source, t) })}`, children: (0, jsx_runtime_1.jsx)(dsh_client_ui_primitives_1.Input, { "aria-label": t('apiKey'), type: "password", autoComplete: "new-password", disabled: busy || keyLocked, placeholder: snapshot.credential.configured ? t('apiKeyPlaceholderConfigured') : t('apiKeyPlaceholderMissing'), value: apiKey, onChange: (event) => { setApiKey(event.target.value); setDraftError(undefined); } }) }) })] }), (0, jsx_runtime_1.jsxs)("section", { className: "dvt-panel dvt-essential", children: [(0, jsx_runtime_1.jsxs)("div", { className: "dvt-panel-title", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h3", { children: t('tts') }), (0, jsx_runtime_1.jsx)("p", { children: t('ttsHint') })] }), (0, jsx_runtime_1.jsx)("span", { className: `dvt-badge ${snapshot.credentialTts.configured ? 'ok' : 'error'}`, children: snapshot.credentialTts.configured ? t('configured') : t('missing') })] }), (0, jsx_runtime_1.jsxs)("div", { className: "dvt-form-grid", children: [(0, jsx_runtime_1.jsx)(Field, { label: t('ttsVoice'), children: (0, jsx_runtime_1.jsx)(dsh_client_ui_primitives_1.Input, { value: draft.ttsVoice, onChange: (event) => { update('ttsVoice', event.target.value); } }) }), (0, jsx_runtime_1.jsx)(Field, { label: t('ttsKey'), hint: ttsKeyLocked ? t('apiKeyLocked') : snapshot.credentialTts.source === undefined ? t('ttsKeyHint') : `${t('ttsKeyHint')} ${t('sourceHint', { source: t('source'), value: credentialSource(snapshot.credentialTts.source, t) })}`, children: (0, jsx_runtime_1.jsx)(dsh_client_ui_primitives_1.Input, { "aria-label": t('ttsKey'), type: "password", autoComplete: "new-password", disabled: busy || ttsKeyLocked, placeholder: snapshot.credentialTts.configured ? t('apiKeyPlaceholderConfigured') : t('apiKeyPlaceholderMissing'), value: ttsKey, onChange: (event) => { setTtsKey(event.target.value); setDraftError(undefined); } }) })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "dvt-save-row", children: [(0, jsx_runtime_1.jsx)(dsh_client_ui_primitives_1.Button, { variant: "primary", disabled: !canSave || busy, onClick: save, children: state.action === 'save' ? t('saving') : t('save') }), (0, jsx_runtime_1.jsx)(dsh_client_ui_primitives_1.Button, { variant: "outline", disabled: busy, onClick: () => { void controller.load(); }, children: t('reload') })] }), (0, jsx_runtime_1.jsxs)("section", { className: "dvt-panel", children: [(0, jsx_runtime_1.jsxs)("div", { className: "dvt-panel-title", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h3", { children: t('health') }), (0, jsx_runtime_1.jsx)("p", { children: t('connectionHint') })] }), (0, jsx_runtime_1.jsxs)("div", { className: "dvt-actions", children: [(0, jsx_runtime_1.jsx)(dsh_client_ui_primitives_1.Button, { size: "sm", variant: "outline", disabled: busy || !snapshot.runtime.ready, onClick: () => { void controller.runHealth('health'); }, children: state.action === 'health' ? t('testing') : t('runHealth') }), (0, jsx_runtime_1.jsx)(dsh_client_ui_primitives_1.Button, { size: "sm", variant: "primary", disabled: busy || !snapshot.runtime.ready, onClick: () => { void controller.runHealth('connection'); }, children: state.action === 'connection' ? t('testing') : t('testConnection') })] })] }), (0, jsx_runtime_1.jsx)("p", { className: "dvt-muted", children: t('saveBeforeTesting') }), state.health === undefined ? (0, jsx_runtime_1.jsx)("p", { className: "dvt-muted", children: t('notTested') }) : (0, jsx_runtime_1.jsx)("div", { className: "dvt-health-grid", children: Object.entries(state.health.checks).map(([name, check]) => ((0, jsx_runtime_1.jsxs)("div", { "data-status": check.status, children: [(0, jsx_runtime_1.jsx)("span", { children: t(HEALTH_NAME_KEYS[name] ?? 'health') }), (0, jsx_runtime_1.jsx)("strong", { children: t(HEALTH_STATUS_KEYS[check.status]) }), (0, jsx_runtime_1.jsx)("p", { children: healthDetail(check.detail, t) })] }, name))) })] }), (0, jsx_runtime_1.jsxs)("section", { className: "dvt-panel dvt-update-panel", children: [(0, jsx_runtime_1.jsxs)("div", { className: "dvt-panel-title", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h3", { children: t('updates') }), (0, jsx_runtime_1.jsx)("p", { children: t('updatesHint') })] }), (0, jsx_runtime_1.jsx)("span", { className: `dvt-badge ${pluginUpdate?.updateAvailable ? 'warning' : pluginUpdate !== undefined && pluginUpdate.supported ? 'ok' : ''}`, children: pluginUpdate?.updateAvailable ? t('updateAvailable') : pluginUpdate !== undefined && pluginUpdate.supported ? t('upToDate') : t('pluginVersion') })] }), (0, jsx_runtime_1.jsxs)("div", { className: "dvt-update-grid", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { children: t('updateInstalled') }), (0, jsx_runtime_1.jsx)("strong", { children: snapshot.release.pluginVersion })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { children: t('updateLatest') }), (0, jsx_runtime_1.jsx)("strong", { children: latestVersion ?? '—' })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { children: t('updateProfile') }), (0, jsx_runtime_1.jsx)("strong", { children: updateCapability.profile ?? '—' })] })] }), !updateCapability.supported ? (0, jsx_runtime_1.jsxs)("div", { className: "dvt-alert warning", children: [(0, jsx_runtime_1.jsx)("strong", { children: t('updateUnsupported') }), (0, jsx_runtime_1.jsx)("span", { children: updateReason })] }) : null, updateCapability.supported && updateHasUnsavedChanges ? (0, jsx_runtime_1.jsx)("div", { className: "dvt-alert warning", children: t('updateSaveFirst') }) : null, pluginUpdate?.supported && pluginUpdate.updateAvailable && latestVersion !== undefined ? (0, jsx_runtime_1.jsx)("p", { className: "dvt-muted", children: t('updateAvailableDetail', { version: latestVersion }) }) : null, pluginUpdate?.supported && !pluginUpdate.updateAvailable && latestVersion !== undefined ? (0, jsx_runtime_1.jsx)("p", { className: "dvt-muted", children: t('upToDateDetail', { version: latestVersion }) }) : null, (0, jsx_runtime_1.jsx)("p", { className: "dvt-muted", children: t('manualUpdateHint') }), (0, jsx_runtime_1.jsxs)("div", { className: "dvt-manual-update", children: [(0, jsx_runtime_1.jsx)("code", { children: manualUpdateCommand }), (0, jsx_runtime_1.jsx)(dsh_client_ui_primitives_1.Button, { size: "sm", variant: "outline", onClick: copyManualUpdate, children: copiedCommand ? t('copied') : t('copy') })] }), (0, jsx_runtime_1.jsxs)("div", { className: "dvt-actions", children: [(0, jsx_runtime_1.jsx)(dsh_client_ui_primitives_1.Button, { variant: "outline", disabled: busy || !updateCheckSupported || state.restart !== undefined, onClick: () => { void controller.checkUpdate(); }, children: state.action === 'check-update' ? t('checkingUpdate') : t('checkUpdate') }), pluginUpdate?.supported && pluginUpdate.updateAvailable && latestVersion !== undefined ? (0, jsx_runtime_1.jsx)(dsh_client_ui_primitives_1.Button, { variant: "primary", disabled: busy || state.restart !== undefined || updateHasUnsavedChanges, onClick: applyUpdate, children: state.action === 'apply-update' ? t('updatingPlugin') : t('updateNow') }) : null] })] }), (0, jsx_runtime_1.jsxs)("details", { className: "dvt-advanced", children: [(0, jsx_runtime_1.jsxs)("summary", { children: [(0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("strong", { children: t('advanced') }), (0, jsx_runtime_1.jsx)("small", { children: t('advancedHint') })] }), (0, jsx_runtime_1.jsx)("span", { className: "dvt-details-chevron", "aria-hidden": "true", children: "\u2304" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "dvt-advanced-body", children: [(0, jsx_runtime_1.jsxs)("section", { className: "dvt-panel", children: [(0, jsx_runtime_1.jsx)("div", { className: "dvt-panel-title", children: (0, jsx_runtime_1.jsx)("h3", { children: t('ark') }) }), (0, jsx_runtime_1.jsxs)("div", { className: "dvt-form-grid", children: [(0, jsx_runtime_1.jsx)(Field, { label: t('credential'), hint: t('credentialHint'), children: (0, jsx_runtime_1.jsx)(dsh_client_ui_primitives_1.Input, { "aria-label": t('credential'), readOnly: true, value: draft.credential }) }), (0, jsx_runtime_1.jsx)(Field, { label: t('baseUrl'), children: (0, jsx_runtime_1.jsx)(dsh_client_ui_primitives_1.Input, { readOnly: true, value: draft.baseUrl }) }), (0, jsx_runtime_1.jsx)(Field, { label: t('model'), hint: t('modelHint'), children: (0, jsx_runtime_1.jsx)(dsh_client_ui_primitives_1.Input, { readOnly: true, value: ARK_SEEDREAM_MODEL }) }), (0, jsx_runtime_1.jsx)(Field, { label: t('userAgent'), children: (0, jsx_runtime_1.jsx)(dsh_client_ui_primitives_1.Input, { readOnly: true, value: draft.userAgent }) })] })] }), (0, jsx_runtime_1.jsxs)("section", { className: "dvt-panel", children: [(0, jsx_runtime_1.jsx)("div", { className: "dvt-panel-title", children: (0, jsx_runtime_1.jsx)("h3", { children: t('tts') }) }), (0, jsx_runtime_1.jsxs)("div", { className: "dvt-form-grid", children: [(0, jsx_runtime_1.jsx)(Field, { label: t('ttsBaseUrl'), children: (0, jsx_runtime_1.jsx)(dsh_client_ui_primitives_1.Input, { readOnly: true, value: draft.ttsBaseUrl }) }), (0, jsx_runtime_1.jsx)(Field, { label: t('ttsCredential'), children: (0, jsx_runtime_1.jsx)(dsh_client_ui_primitives_1.Input, { "aria-label": t('ttsCredential'), readOnly: true, value: draft.ttsCredential }) }), (0, jsx_runtime_1.jsx)(Field, { label: t('ttsResource'), children: (0, jsx_runtime_1.jsx)(dsh_client_ui_primitives_1.Input, { value: draft.ttsResource, onChange: (event) => { update('ttsResource', event.target.value); } }) })] })] }), (0, jsx_runtime_1.jsxs)("section", { className: "dvt-panel", children: [(0, jsx_runtime_1.jsx)("div", { className: "dvt-panel-title", children: (0, jsx_runtime_1.jsx)("h3", { children: t('limits') }) }), (0, jsx_runtime_1.jsxs)("div", { className: "dvt-form-grid", children: [(0, jsx_runtime_1.jsx)(Field, { label: t('timeout'), children: (0, jsx_runtime_1.jsx)(dsh_client_ui_primitives_1.Input, { inputMode: "numeric", value: draft.timeoutMs, onChange: (event) => { update('timeoutMs', event.target.value); } }) }), (0, jsx_runtime_1.jsx)(Field, { label: t('concurrency'), children: (0, jsx_runtime_1.jsx)(dsh_client_ui_primitives_1.Input, { inputMode: "numeric", value: draft.concurrency, onChange: (event) => { update('concurrency', event.target.value); } }) })] })] })] })] }), (0, jsx_runtime_1.jsx)("footer", { className: "dvt-settings-footer", children: (0, jsx_runtime_1.jsxs)("div", { className: "dvt-release", children: [(0, jsx_runtime_1.jsxs)("span", { children: [t('pluginVersion'), " ", (0, jsx_runtime_1.jsx)("strong", { children: snapshot.release.pluginVersion })] }), (0, jsx_runtime_1.jsxs)("span", { children: [t('activeGeneration'), " ", (0, jsx_runtime_1.jsx)("strong", { children: t('activeGenerationValue', { generation: snapshot.runtime.generation }) })] })] }) })] }));
}
const CSS = `
.dvt-tool{margin:4px 0;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1);overflow:hidden;box-shadow:var(--dsw-shadow-lv1)}
.dvt-tool-head{width:100%;min-height:38px;display:flex;align-items:center;gap:7px;padding:8px 10px;border:0;background:transparent;color:inherit;text-align:left;cursor:pointer;font:inherit}.dvt-tool-head:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}.dvt-tool-icon{width:20px;height:20px;display:grid;place-items:center;border-radius:6px;color:var(--dsw-alias-state-business-primary);background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 12%,transparent);flex:none}.dvt-tool-title{font-size:12px;font-weight:650;white-space:nowrap}.dvt-tool-sep{opacity:.35}.dvt-tool-summary{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:var(--dsw-alias-label-secondary)}.dvt-tool-status{margin-left:auto;font-size:11px;color:var(--dsw-alias-label-secondary);max-width:45%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dvt-tool[data-state=error] .dvt-tool-status{color:var(--dsw-alias-state-error-primary)}.dvt-chevron{margin-left:auto;transition:transform .16s ease;opacity:.55}.dvt-chevron[data-open=true]{transform:rotate(180deg)}.dvt-tool-body{padding:0 10px 10px}.dvt-stack{display:grid;gap:10px}.dvt-muted{margin:0;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.5}
.dvt-artifact{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;overflow:hidden;background:var(--dsw-alias-bg-layer-1)}.dvt-preview{display:block;width:100%;max-height:360px;object-fit:contain;background:repeating-conic-gradient(var(--dsw-alias-bg-module-platform) 0 25%,var(--dsw-alias-bg-layer-1) 0 50%) 50%/18px 18px;border:0}.dvt-svg{height:280px}.dvt-artifact-meta{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 10px}.dvt-artifact-meta>div:first-child{min-width:0;display:grid;gap:2px}.dvt-artifact-meta strong{font-size:12px;overflow:hidden;text-overflow:ellipsis}.dvt-artifact-meta span,.dvt-artifact-meta small{font-size:10px;color:var(--dsw-alias-label-secondary)}.dvt-actions{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.dvt-download{display:inline-flex;align-items:center;height:28px;padding:0 12px;border-radius:999px;background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground);text-decoration:none;font-size:12px;font-weight:600}.dvt-download:hover{background:var(--dsw-alias-button-primary-hover)}.dvt-download:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}.dvt-artifact>.dvt-muted{padding:0 10px 10px}
.dvt-tutorial-link{margin:0;font-size:12px;line-height:1.5}.dvt-tutorial-link a{color:var(--dsw-alias-state-business-primary);text-decoration:none;font-weight:600}.dvt-tutorial-link a:hover{text-decoration:underline}.dvt-manual-update{display:flex;align-items:center;gap:8px;padding:9px 10px;border-radius:9px;background:var(--dsw-alias-bg-layer-2)}.dvt-manual-update code{flex:1;min-width:0;overflow:auto;white-space:nowrap;font-size:11px;color:var(--dsw-alias-label-primary)}.dvt-plugin-card{list-style:none;margin:0;display:grid;border:1px solid var(--dsw-alias-border-l1);border-radius:14px;background:var(--dsw-alias-bg-layer-1);overflow:hidden;color:var(--dsw-alias-label-primary);box-sizing:border-box}.dvt-card-head{display:flex;align-items:center;gap:10px;width:100%;padding:12px 14px;border:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}.dvt-card-head:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}.dvt-card-head-text{display:grid;gap:2px;flex:1;min-width:0}.dvt-card-head-text strong{font-size:13px;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dvt-card-head-text small{font-size:12px;color:var(--dsw-alias-label-secondary);line-height:1.5}.dvt-card-pill{display:inline-flex;align-items:center;gap:6px;padding:2px 10px;border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 12%,transparent);color:var(--dsw-alias-state-success-primary);font-size:11px;font-weight:600;white-space:nowrap}.dvt-card-pill::before{content:"";width:7px;height:7px;border-radius:50%;background:currentColor}.dvt-card-pill[data-status=error]{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,transparent);color:var(--dsw-alias-state-error-primary)}.dvt-card-chevron{font-size:14px;opacity:.55;transition:transform .15s ease}.dvt-plugin-card[data-open] .dvt-card-chevron{transform:rotate(180deg)}.dvt-card-body{padding:0 14px 14px;min-width:0}
.dvt-panel{border:1px solid var(--dsw-alias-border-l1);border-radius:14px;background:var(--dsw-alias-bg-layer-1);padding:14px 15px;display:grid;gap:12px}.dvt-panel-title{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.dvt-panel-title h3{margin:0;font-size:13px}.dvt-panel-title p{margin:3px 0 0;font-size:11px;line-height:1.5;color:var(--dsw-alias-label-secondary)}.dvt-badge{display:inline-flex;align-items:center;padding:2px 10px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);font-size:11px;font-weight:600;white-space:nowrap}.dvt-badge.ok{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 12%,transparent);color:var(--dsw-alias-state-success-primary)}.dvt-badge.error{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,transparent);color:var(--dsw-alias-state-error-primary)}.dvt-badge.warning{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 14%,transparent);color:var(--dsw-alias-state-warn-label)}
.dvt-settings{display:grid;gap:12px}.dvt-form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}.dvt-field{display:grid;gap:5px;font-size:12px}.dvt-field>span{font-weight:600}.dvt-field small{font-size:10px;line-height:1.45;color:var(--dsw-alias-label-secondary)}.dvt-save-row{display:flex;gap:8px;flex-wrap:wrap}.dvt-alert{padding:9px 11px;border-radius:10px;font-size:12px;line-height:1.5;display:grid;gap:3px}.dvt-alert.notice{background:var(--dsw-alias-bg-layer-2)}.dvt-alert.warning{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 12%,transparent)}.dvt-alert.error{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,transparent)}.dvt-alert.success{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 12%,transparent)}
.dvt-update-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}.dvt-update-grid>div{padding:9px 10px;border-radius:9px;background:var(--dsw-alias-bg-layer-2);display:grid;gap:3px}.dvt-update-grid span{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-secondary)}.dvt-update-grid strong{font-size:13px}
.dvt-settings-footer{display:flex;justify-content:space-between;gap:14px;font-size:11px;color:var(--dsw-alias-label-secondary)}
.dvt-release{display:flex;gap:14px;flex-wrap:wrap}.dvt-release span{white-space:nowrap}.dvt-essential{border-color:color-mix(in srgb,var(--dsw-alias-state-business-primary) 30%,var(--dsw-alias-border-l1));box-shadow:var(--dsw-shadow-lv1),0 0 0 3px color-mix(in srgb,var(--dsw-alias-state-business-primary) 5%,transparent)}.dvt-advanced{border:1px solid var(--dsw-alias-border-l1);border-radius:14px;background:var(--dsw-alias-bg-layer-1);overflow:hidden}.dvt-advanced>summary{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:14px 15px;cursor:pointer;list-style:none}.dvt-advanced>summary::-webkit-details-marker{display:none}.dvt-advanced>summary>span:first-child{display:grid;gap:3px}.dvt-advanced>summary strong{font-size:13px}.dvt-advanced>summary small{font-size:10px;line-height:1.45;color:var(--dsw-alias-label-secondary);font-weight:400}.dvt-details-chevron{font-size:15px;opacity:.55;transition:transform .16s ease}.dvt-advanced[open] .dvt-details-chevron{transform:rotate(180deg)}.dvt-advanced-body{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;padding:0 12px 12px}.dvt-advanced-body>.dvt-panel{box-shadow:none}
.dvt-health-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px}.dvt-health-grid>div{padding:9px 10px;border-radius:9px;background:var(--dsw-alias-bg-layer-2);border-left:3px solid var(--dsw-alias-border-l4)}.dvt-health-grid>div[data-status=ok]{border-left-color:var(--dsw-alias-state-success-primary)}.dvt-health-grid>div[data-status=warning],.dvt-health-grid>div[data-status=not_tested]{border-left-color:var(--dsw-alias-state-warn-primary)}.dvt-health-grid>div[data-status=error]{border-left-color:var(--dsw-alias-state-error-primary)}.dvt-health-grid span{font-size:10px;text-transform:capitalize}.dvt-health-grid strong{float:right;font-size:9px;text-transform:uppercase;color:var(--dsw-alias-label-secondary)}.dvt-health-grid p{clear:both;margin:5px 0 0;font-size:10px;line-height:1.4;color:var(--dsw-alias-label-secondary)}.dvt-loading{padding:24px;border-radius:12px;background:var(--dsw-alias-bg-layer-2);font-size:12px;color:var(--dsw-alias-label-secondary)}
@media(max-width:720px){.dvt-settings-footer{display:grid}.dvt-release{width:auto}.dvt-form-grid,.dvt-update-grid{grid-template-columns:1fr}.dvt-artifact-meta{align-items:flex-start;flex-direction:column}.dvt-panel-title{flex-direction:column}}
`;
function installStyles() {
    const id = `${ARK_TOOLKIT_PACKAGE}/client`;
    const existing = document.querySelector(`style[data-plugin-css="${id}"]`);
    if (existing !== null)
        return () => { };
    const style = document.createElement('style');
    style.dataset.plugin = ARK_TOOLKIT_PACKAGE;
    style.dataset.pluginCss = id;
    style.textContent = CSS;
    document.head.appendChild(style);
    return () => { style.remove(); };
}
/** Required client services. */
exports.inject = ['slots', 'locale', 'remote'];
/** Register dedicated Tool views and the Ark Toolkit plugin-configuration card. */
function apply(ctx) {
    ctx.effect(installStyles, 'dsh-ark-toolkit: styles');
    ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'dsh-ark-toolkit: locale');
    const t = ctx.locale.bind(NS);
    const injected = () => ({ t });
    const entries = [
        ['ark_generate_image', ArtifactView],
        ['ark_speak', ArtifactView],
    ];
    ctx.slots.inject('tool.call.toolview', function* () {
        for (const [key, component] of entries) {
            yield ctx.slots.register({ name: 'tool.call.toolview', key, inject: injected }, component);
        }
    });
    const controller = new ArkSettingsController();
    ctx.effect(() => {
        // Both signals arrive over the Remote transport: a committed Settings
        // document (any namespace) and a changed Credential reference. Comparing
        // against the served credential names keeps unrelated stores quiet.
        const disposers = [
            ctx.remote.$on('settings/document-updated', (namespace) => {
                if (namespace === NS)
                    controller.refreshIfLoaded();
            }),
            ctx.remote.$on('credentials/reference-updated', (ref) => {
                const current = controller.snapshot().snapshot;
                const updated = String(ref);
                if (current?.credential.ref === updated || current?.credentialTts.ref === updated)
                    controller.refreshIfLoaded();
            }),
            ctx.on('connection/reset', () => { controller.refreshIfLoaded(); }),
        ];
        return () => { for (const dispose of disposers)
            dispose(); };
    }, 'dsh-ark-toolkit: Settings invalidations');
    // The Plugins panel renders one bundle page per installed bundle and
    // dispatches `plugins.bundle.config` with `entryKey = <package name>`, so the
    // card is keyed by this bundle's package name (not the settings namespace).
    ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({
        name: 'plugins.bundle.config',
        key: ARK_TOOLKIT_PACKAGE,
        inject: () => ({ controller, t }),
    }, SettingsCard));
}
};
function __resolve(from, request) {
  if (!request.startsWith(".")) return request;
  var parts = from.slice(2).split("/"); parts.pop();
  for (var part of request.split("/")) { if (part === "." || part === "") continue; if (part === "..") parts.pop(); else parts.push(part); }
  return "./" + parts.join("/");
}
function __load(id) {
  if (__modules[id] === undefined) return require(id);
  if (__cache[id] !== undefined) return __cache[id].exports;
  var module = __cache[id] = { exports: {} };
  __modules[id](module, module.exports, require, function(request) { var resolved = __resolve(id, request); return __modules[resolved] === undefined ? require(request) : __load(resolved); });
  return module.exports;
}
return __load("./index.js"); } });
//# sourceMappingURL=client.js.map
