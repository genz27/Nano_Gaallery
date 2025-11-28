# Gz'nano (Gemini Nano Gallery)

这是一个基于 Google Gemini API (Nano / Nano Pro) 的极简黑白风格绘图应用。
采用 **Cloudflare Workers** 单文件部署方案，无需构建，无需服务器，复制粘贴即可运行。

**开源地址**: [https://github.com/genz27/Nano_Gaallery](https://github.com/genz27/Nano_Gaallery)

## ✨ 特性

- **极简设计**: 纯粹的黑白 UI，专注于创作。
- **多模型支持**: 支持 `Gemini Nano (Flash)` 和 `Gemini Nano Pro`。
- **高清分辨率**: Pro 模式下支持 1K / 2K / 4K 分辨率选择。
- **多模态垫图**: 支持上传多张参考图进行生图/改图。
- **本地画廊**: 使用 IndexedDB 本地存储历史生成记录，刷新不丢失，支持大量图片存储。
- **安全防护**: 支持设置访问密码 (Access Code)，保护您的 API Key 配额。
- **自定义代理**: 支持配置自定义 API Base URL。

## 🚀 部署教程 (30秒完成)

### 1. 创建 Worker
登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)，进入 **Workers & Pages** -> **Create application** -> **Create Worker**，点击 Deploy。

### 2. 粘贴代码
点击 **Edit code**，将本项目中的 `worker.js` 文件内容**全选复制**，覆盖编辑器中原有的代码，点击 **Deploy** 保存。

### 3. 配置环境变量
返回 Worker 的详情页面，点击 **Settings** -> **Variables and Secrets** -> **Add**，添加以下变量：

| 变量名 | 必填 | 说明 | 示例值 |
| :--- | :---: | :--- | :--- |
| `GEMINI_API_KEY` | ✅ | 您的 Google Gemini API Key | `AIzaSy...` |
| `ACCESS_CODE` | ❌ | (可选) 设置访问密码，保护您的站点 | `123456` |
| `GEMINI_BASE_URL` | ❌ | (可选) 自定义 API 接口地址，用于反代 | `https://my-proxy.com` |

> 注意：`GEMINI_BASE_URL` 末尾不要带 `/`。如果不填，默认使用 `https://generativelanguage.googleapis.com`。

### 4. 访问
点击 Worker 的 URL 即可开始使用！

## 🛠️ 本地开发

本项目是一个单文件 Worker 应用，主要逻辑位于 `worker.js`。前端部分基于 React，以字符串形式内嵌在 Worker 代码中。
