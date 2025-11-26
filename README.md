# Gemini 极简绘图 (Nano/Pro)

这是一个基于 React + Vite + TypeScript 的 Gemini AI 绘图应用。

**注意：此项目包含源代码 (TypeScript)，不能直接拖入 Cloudflare Pages 的上传页面。**

## 🚀 如何部署 (Cloudflare Pages)

### 推荐：通过 Git 自动构建 (支持后台 API Key)

1. 将本项目代码推送到 **GitHub** 或 **GitLab**。
2. 登录 Cloudflare Dashboard，进入 **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**。
3. 选择本项目仓库。
4. **构建配置 (Build settings)**:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. **环境变量 (Environment variables)**:
   - 添加变量名: `API_KEY`
   - 值: `您的_Google_Gemini_API_Key`
6. 点击 **Save and Deploy**。

### 替代方案：本地构建 (手动上传)

1. 安装 Node.js。
2. 在项目根目录运行 `npm install`。
3. 创建 `.env` 文件，写入 `API_KEY=your_key_here`。
4. 运行 `npm run build`。
5. 构建完成后，会生成 `dist` 文件夹。
6. 将 **`dist` 文件夹** (而不是源码) 拖入 Cloudflare Pages 上传界面。

## 🛠️ 本地开发

```bash
npm install
# Linux/Mac
export API_KEY=your_key
# Windows (PowerShell)
$env:API_KEY="your_key"

npm run dev
```
