# Gemini Nano Gallery (Worker Version)

这是一个基于 Google Gemini API (Nano / Nano Pro) 的极简黑白风格绘图应用。
采用 **Cloudflare Workers** 单文件部署方案，无需构建，无需服务器，复制粘贴即可运行。

**开源地址**: [https://github.com/genz27/Nano_Gaallery](https://github.com/genz27/Nano_Gaallery)

## ✨ 特性

- **极简设计**: 纯粹的黑白 UI，专注于创作。
- **多模型支持**: 支持 `Gemini Nano (Flash)` 和 `Gemini Nano Pro`。
- **高清分辨率**: Pro 模式下支持 1K / 2K / 4K 分辨率选择。
- **多模态垫图**: 支持上传多张参考图进行生图/改图。
- **本地画廊**: 使用 IndexedDB 本地存储历史生成记录，刷新不丢失，支持大量图片存储。
- **隐私安全**: API Key 存储在 Cloudflare 后台，前端无法查看。

## 🚀 部署教程 (30秒完成)

### 1. 创建 Worker
登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)，进入 **Workers & Pages** -> **Create application** -> **Create Worker**，点击 Deploy。

### 2. 粘贴代码
点击 **Edit code**，将本项目中的 `worker.js` 文件内容**全选复制**，覆盖编辑器中原有的代码，点击 **Deploy** 保存。

### 3. 配置 API Key
返回 Worker 的详情页面：
1. 点击 **Settings** 选项卡。
2. 点击 **Variables and Secrets**。
3. 点击 **Add**。
   - **Variable name**: `GEMINI_API_KEY`
   - **Value**: 填入您的 [Google Gemini API Key](https://aistudio.google.com/app/apikey)。
4. 点击 **Deploy** 以确保环境变量生效。

### 4. 访问
点击 Worker 的 URL (例如 `https://your-worker.username.workers.dev`) 即可开始使用！

## 🛠️ 关于

本项目使用 React + Tailwind CSS 构建，并内嵌于 Cloudflare Worker 脚本中，实现了 Serverless 的全栈极简体验。
