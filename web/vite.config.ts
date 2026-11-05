// 基础模块
import { defineConfig, loadEnv } from 'vite';
import type { ConfigEnv } from 'vite';

// 插件
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }: ConfigEnv) => {
  const env: Record<string, string> = loadEnv(mode, process.cwd(), '');
  return {
    resolve: {
      alias: {
        '@': '/src',
      },
    },
    server: {
      port: Number(env.VITE_PORT),
      open: true,
      proxy: {
        [env.VITE_API_PREFIX]: {
          target: env.VITE_SERVER_ORIGIN,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(new RegExp('^' + env.VITE_API_PREFIX), ''),
        },
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      babel({ presets: [reactCompilerPreset()] })
    ],
  }
})
