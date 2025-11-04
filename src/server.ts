import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { apiRoutes } from './routes/api'
import { wsHandler } from './websocket/handler'

const app = new Hono()

// Middleware
app.use('*', logger())
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }))
app.use('/js/*', serveStatic({ root: './public' }))
app.use('/css/*', serveStatic({ root: './public' }))

// API routes
app.route('/api', apiRoutes)

// WebSocket upgrade endpoint
app.get('/ws', (c) => {
  const upgrade = c.req.header('upgrade')
  if (upgrade !== 'websocket') {
    return c.text('Expected websocket', 400)
  }
  
  return c.upgrade()
})

// Serve main app
app.get('/', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nexodo - Next-gen Productivity</title>
    <link rel="stylesheet" href="/css/styles.css">
</head>
<body>
    <div id="app">
        <header>
            <h1>📝 Nexodo</h1>
            <p>Next-gen productivity software</p>
        </header>
        
        <main>
            <div id="connection-status" class="status">Connecting...</div>
            
            <section class="tasks-section">
                <h2>Tasks</h2>
                <div class="task-input">
                    <input type="text" id="new-task" placeholder="Add a new task...">
                    <button id="add-task">Add</button>
                </div>
                <ul id="task-list"></ul>
            </section>
            
            <section class="chat-section">
                <h2>Real-time Chat</h2>
                <div id="messages" class="messages"></div>
                <div class="message-input">
                    <input type="text" id="message-input" placeholder="Type a message...">
                    <button id="send-message">Send</button>
                </div>
            </section>
        </main>
    </div>
    
    <script src="/js/main.js"></script>
</body>
</html>
  `)
})

// 404 handler
app.notFound((c) => {
  return c.text('Not Found', 404)
})

export default {
  port: process.env.PORT || 3000,
  fetch: app.fetch,
  websocket: wsHandler,
}