import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 加载环境变量，允许 process.env 在构建时被读取
  // 第三个参数 '' 表示加载所有环境变量，不仅仅是 VITE_ 开头的
  const env = loadEnv(mode, '.', '');
  
  const apiKey = env.API_KEY || process.env.API_KEY || '';

  return {
    plugins: [react()],
    define: {
      // Cloudflare Pages 在构建时有环境变量，但浏览器运行时没有 process.env。
      // 我们通过 define 将构建时的 API_KEY "硬编码" 进构建后的 JS 文件中。
      // 如果没有找到 Key，给一个空字符串，让 App.tsx 在运行时捕获并提示错误，而不是在构建时崩溃。
      'process.env.API_KEY': JSON.stringify(apiKey)
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
    }
  };
});