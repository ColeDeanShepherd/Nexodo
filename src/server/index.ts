import { Hono } from 'hono'
import { html, raw } from 'hono/html'
import { serveStatic } from 'hono/bun'

const app = new Hono()

// Serve static files from public directory
app.use('/public/*', serveStatic({ root: './' }))

app.get('/api/health', (c) => c.json({ status: 'ok' }))

app.get(
  '/',
  (c) =>
    c.html(html`
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Nexodo</title>
          <link rel="stylesheet" href="/public/css/style.css" />
        </head>
        <body>
          <div id="app"></div>
          <script type="module" src="/public/js/main.js"></script>
        </body>
      </html>
    `)
)

const port = process.env.PORT || 3000
console.log(`Server is running on port ${port}`)

export default app
