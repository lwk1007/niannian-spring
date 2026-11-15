import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { fileURLToPath, URL } from 'node:url'
import { copyFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const r = (p) => fileURLToPath(new URL(p, import.meta.url))
const OUT = '../src/main/resources/static'

/**
 * Thymeleaf 分享页直接引 /css/base.css（设计变量 + 纪念页样式）。
 * 构建结束时把同一份源文件原样放回稳定路径，避免样式出现两份定义。
 */
function stableBaseCss() {
  return {
    name: 'niannian-stable-base-css',
    closeBundle() {
      const outDir = resolve(r('.'), OUT, 'css')
      mkdirSync(outDir, { recursive: true })
      copyFileSync(r('./src/styles/base.css'), resolve(outDir, 'base.css'))
    }
  }
}

export default defineConfig({
  plugins: [
    vue(),
    // 组件按需引入：模板里用到哪个才打包哪个，并把对应样式一起带上
    Components({
      dts: false,
      resolvers: [ElementPlusResolver({ importStyle: 'css' })]
    }),
    stableBaseCss()
  ],
  base: '/',
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:8080', changeOrigin: true }
    }
  },
  build: {
    outDir: r(OUT),
    emptyOutDir: true,
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        index: r('./index.html'),
        app: r('./app.html')
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/vue') || id.includes('node_modules/@vue')) return 'vue'
          if (
            id.includes('node_modules/element-plus') ||
            id.includes('node_modules/@element-plus') ||
            id.includes('node_modules/@floating-ui') ||
            id.includes('node_modules/lodash')
          ) {
            return 'element-plus'
          }
          return undefined
        }
      }
    }
  }
})
