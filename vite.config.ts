import { defineConfig } from 'vite'
import path from 'node:path'

const DEV_CSP = [
  "default-src 'self'",
  "img-src 'self' https: http: asset: blob: data:",
  "style-src 'self' 'unsafe-inline' blob:",
  "font-src 'self' data:",
  "script-src 'self' http: https: 'unsafe-eval' 'wasm-unsafe-eval'",
  "worker-src 'self' blob:",
  "connect-src 'self' ipc: http: https: ws: http://ipc.localhost",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join('; ')

export default defineConfig(({ mode }) => {
  const isAndroid = mode === 'android' || process.env.MOBILE_TARGET === 'android' || process.env.MOBILE_TARGET === 'capacitor'
  const mobileAliases = isAndroid
    ? {
        '@tauri-apps/plugin-dialog': path.resolve(__dirname, 'src/capacitor/shims/plugin-dialog.ts'),
        '@tauri-apps/plugin-fs': path.resolve(__dirname, 'src/capacitor/shims/plugin-fs.ts'),
        '@tauri-apps/plugin-store': path.resolve(__dirname, 'src/capacitor/shims/plugin-store.ts'),
        '@tauri-apps/plugin-opener': path.resolve(__dirname, 'src/capacitor/shims/plugin-opener.ts'),
        '@tauri-apps/api/window': path.resolve(__dirname, 'src/capacitor/shims/api-window.ts'),
        '@tauri-apps/api/webview': path.resolve(__dirname, 'src/capacitor/shims/api-webview.ts'),
        '@tauri-apps/api/core': path.resolve(__dirname, 'src/capacitor/shims/api-core.ts'),
        '@tauri-apps/api/path': path.resolve(__dirname, 'src/capacitor/shims/api-path.ts'),
        '@tauri-apps/plugin-http': path.resolve(__dirname, 'src/capacitor/shims/plugin-http.ts')
      }
    : {}

  return {
    base: './',
    resolve: {
      alias: mobileAliases,
      dedupe: ['katex', '@milkdown/prose']
    },
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true
    },
    esbuild: mode === 'production' ? {
      drop: ['console', 'debugger'],
      legalComments: 'none'
    } : {},
    optimizeDeps: {
      include: [
        'markdown-it',
        'dompurify',
        'highlight.js',
        'mermaid',
        'katex',
        '@milkdown/core',
        '@milkdown/kit',
        '@milkdown/plugin-automd',
        '@milkdown/plugin-math',
        '@milkdown/preset-commonmark',
        '@milkdown/preset-gfm'
      ],
      exclude: []
    },
    build: {
      target: 'es2022',
      cssCodeSplit: true,
      cssMinify: true,
      reportCompressedSize: false,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('@milkdown')) return 'milkdown'
              if (id.includes('markdown-it')) return 'markdown-it'
              if (id.includes('dompurify')) return 'dompurify'
              if (id.includes('highlight')) return 'highlightjs'
              if (id.includes('mermaid')) return 'mermaid'
              if (id.includes('katex')) return 'katex'
              if (id.includes('pdfjs-dist')) return 'pdfjs'
              if (id.includes('html2pdf') || id.includes('html-docx') || id.includes('html-to-docx')) return 'docx'
              if (id.includes('canvg')) return 'pdf'
              if (id.includes('webdav')) return 'wps'
              if (id.includes('@tauri-apps')) return 'tauri'
              return 'vendor'
            }
            if (id.includes('/src/')) {
              if (id.includes('/wysiwyg/')) return 'wysiwyg'
              if (id.includes('/extensions/')) return 'extensions'
              if (id.includes('/fileTree')) return 'filetree'
              if (id.includes('/html2md')) return 'html2md'
            }
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]'
        }
      },
      minify: 'esbuild',
      sourcemap: false
    }
  }
})
