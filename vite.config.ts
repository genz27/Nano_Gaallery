import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 加载环境变量
  // process.cwd() 在某些构建环境中可能会有问题，使用 '.' 代替
  const env = loadEnv(mode, '.', '');
  
  // 获取 API_KEY，如果不存在则默认为空字符串，防止构建崩溃
  const apiKey = env.API_KEY || process.env.API_KEY || '';

  return {
    plugins: [react()],
    define: {
      // 将 API_KEY 注入到前端代码中
      'process.env.API_KEY': JSON.stringify(apiKey)
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      sourcemap: false,
    }
  };
});