import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'http'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const apiKey  = env.ZOTGPT_API_KEY  || ''
  const endpoint = env.ZOTGPT_ENDPOINT || 'https://azureapi.zotgpt.uci.edu'

  return {
    plugins: [
      react(),
      tailwindcss(),
      // Custom middleware — replaces the unreliable built-in proxy.
      // Intercepts /api/zotgpt/... and forwards to ZotGPT using Node fetch,
      // injecting the api-key server-side so it never reaches the browser.
      {
        name: 'zotgpt-middleware',
        configureServer(server) {
          server.middlewares.use(
            '/api/zotgpt',
            async (req: IncomingMessage, res: ServerResponse) => {
              try {
                // Collect request body
                const chunks: Buffer[] = []
                for await (const chunk of req) chunks.push(chunk as Buffer)
                const body = Buffer.concat(chunks)

                // Rewrite path: /api/zotgpt/... → /openai/...
                const targetPath = (req.url ?? '').replace(/^\/?/, '/openai/')
                  .replace('/openai//', '/openai/')
                const targetUrl = `${endpoint}/openai${req.url ?? ''}`

                console.log(`[zotgpt] → ${req.method} ${targetUrl}`)

                const upstream = await fetch(targetUrl, {
                  method: req.method ?? 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'api-key': apiKey,
                  },
                  body: body.length > 0 ? body : undefined,
                })

                const text = await upstream.text()
                console.log(`[zotgpt] ← ${upstream.status} (${text.length} bytes)`)

                res.statusCode = upstream.status
                res.setHeader('Content-Type', 'application/json')
                res.end(text)
              } catch (err) {
                console.error('[zotgpt] middleware error:', err)
                res.statusCode = 502
                res.end(JSON.stringify({ error: String(err) }))
              }
            }
          )
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },

    // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
    assetsInclude: ['**/*.svg', '**/*.csv'],
  }
})
