// 基础模块
import { defineConfig, loadEnv } from 'vite';
import type { ConfigEnv } from 'vite';

// 插件
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

// 运行时依赖改由 CDN（esm.sh，见 index.html 的 importmap）加载，构建时不打包
const cdnExternals: (string | RegExp)[] = [
  /^react(\/.*)?$/,
  /^react-dom(\/.*)?$/,
  /^react-redux(\/.*)?$/,
  /^react-router-dom(\/.*)?$/,
  /^react-markdown(\/.*)?$/,
  /^remark-gfm(\/.*)?$/,
  /^remark-breaks(\/.*)?$/,
  /^@reduxjs\/toolkit(\/.*)?$/,
  /^axios(\/.*)?$/,
]

// https://vite.dev/config/
export default defineConfig(({ mode }: ConfigEnv) => {
  const env: Record<string, string> = loadEnv(mode, process.cwd(), '');
  return {
    resolve: {
      alias: {
        '@': '/src',
      },
    },
    build: {
      rolldownOptions: {
        external: cdnExternals,
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
