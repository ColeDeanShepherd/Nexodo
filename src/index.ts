import { Hono } from 'hono'
import { html, raw } from 'hono/html'

const app = new Hono()

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
        </head>
        <body>
          <h1>Hello, Hono!</h1>
          ${raw('<p>This is rendered using Hono HTML helper.</p>')}
        </body>
      </html>
    `)
)

const port = process.env.PORT || 3000
console.log(`Server is running on port ${port}`)

export default app
