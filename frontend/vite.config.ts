import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load .env / .env.local at config time so non-VITE vars (like ZOTGPT_API_KEY)
  // are available to the proxy handler below. The empty string prefix means
  // loadEnv returns ALL env vars, not just VITE_ ones.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    define: {
      global: 'globalThis',
    },
    resolve: {
      alias: {
        '@': '/src',
      },
    },
    optimizeDeps: {
      include: ['ethers'],
    },
    server: {
      host: true,
      proxy: {
        // Proxy AI requests to UCI ZotGPT Azure OpenAI.
        // The api-key header is attached server-side here so it NEVER touches
        // the browser bundle. Frontend code calls '/api/zotgpt/...' as a
        // same-origin relative URL.
        //
        // Post-hackathon: this proxy only runs in `npm run dev`. Production
        // deployments need a real serverless function (Vercel / CF Worker) that
        // does the same header injection.
        '/api/zotgpt': {
          target: env.ZOTGPT_ENDPOINT || 'https://azureapi.zotgpt.uci.edu',
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api\/zotgpt/, '/openai'),
          configure: (proxy: { on: (event: string, handler: (req: { setHeader: (name: string, value: string) => void }) => void) => void }) => {
            proxy.on('proxyReq', (proxyReq) => {
              const apiKey = env.ZOTGPT_API_KEY
              if (apiKey && apiKey !== 'REPLACE_WITH_YOUR_KEY_FROM_ZOTGPT_PORTAL') {
                proxyReq.setHeader('api-key', apiKey)
              } else {
                console.warn(
                  '[vite proxy] ZOTGPT_API_KEY not set in .env.local — AI calls will fail with 401',
                )
              }
            })
          },
        },
      },
    },
  }
})
