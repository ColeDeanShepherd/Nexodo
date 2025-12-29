import { Hono } from 'hono'
import { html, raw } from 'hono/html'
import { serveStatic } from 'hono/bun'
import { Pool } from 'pg'
import * as jwt from 'jsonwebtoken'
import { BackupService } from './backup-service'
import { SchedulerService } from './scheduler-service'

//if (process.env.NODE_ENV !== 'production') {
  console.log('PWD: ', process.env.APP_PASSWORD)
//}

const app = new Hono()

// JWT secret - use environment variable or default for development
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const APP_PASSWORD = process.env.APP_PASSWORD || 'admin'

// JWT middleware for protected routes
const authenticateJWT = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization')
  const token = authHeader?.split(' ')[1] // Bearer TOKEN

  if (!token) {
    return c.json({ error: 'Access token required' }, 401)
  }

  try {
    jwt.verify(token, JWT_SECRET)
    await next()
  } catch (error) {
    return c.json({ error: 'Invalid or expired token' }, 403)
  }
}

// Database connection using DATABASE_URL or individual Railway environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Fallback to individual variables if DATABASE_URL is not set
  host: process.env.DATABASE_URL ? undefined : process.env.PGHOST,
  port: process.env.DATABASE_URL ? undefined : parseInt(process.env.PGPORT || '5432'),
  user: process.env.DATABASE_URL ? undefined : process.env.PGUSER,
  password: process.env.DATABASE_URL ? undefined : process.env.PGPASSWORD,
  database: process.env.DATABASE_URL ? undefined : process.env.PGDATABASE,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

// Initialize backup services
const backupService = new BackupService(pool)
const schedulerService = new SchedulerService(backupService)

// Serve static files from public directory
app.use('/public/*', serveStatic({ root: './' }))

app.get('/api/health', (c) => c.json({ status: 'ok' }))

// Authentication endpoint
app.post('/api/auth/login', async (c) => {
  try {
    const body = await c.req.json()
    const { password } = body

    if (!password) {
      return c.json({ error: 'Password is required' }, 400)
    }

    if (password !== APP_PASSWORD) {
      return c.json({ error: 'Invalid password' }, 401)
    }

    // Generate JWT token
    const token = jwt.sign(
      { authenticated: true },
      JWT_SECRET,
      { expiresIn: '24h' }
    )

    return c.json({ token, expiresIn: '24h' })
  } catch (error) {
    console.error('Authentication error:', error)
    return c.json({ error: 'Authentication failed' }, 500)
  }
})

// Protected: GET endpoint to load the value with key "db" from key_value_store table
app.get('/api/db/value', authenticateJWT, async (c) => {
  try {
    const client = await pool.connect()
    try {
      const result = await client.query(
        'SELECT value FROM key_value_store WHERE key = $1',
        ['db']
      )
      
      if (result.rows.length === 0) {
        return c.json({ error: 'Value not found' }, 404)
      }
      
      return c.json({ value: result.rows[0].value })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Database error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Protected: POST endpoint to save the value with key "db" to key_value_store table
app.post('/api/db/value', authenticateJWT, async (c) => {
  try {
    const body = await c.req.json()
    const { value } = body
    
    if (value === undefined) {
      return c.json({ error: 'Value is required' }, 400)
    }
    
    const client = await pool.connect()
    try {
      // Use UPSERT to insert or update the value
      await client.query(
        `INSERT INTO key_value_store (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        ['db', value]
      )
      
      return c.json({ success: true, message: 'Value saved successfully' })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Database error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Google auth endpoints (client-side flow)
app.post('/api/auth/google/tokens', authenticateJWT, async (c) => {
  try {
    const body = await c.req.json()
    const { access_token, refresh_token, expires_at, folder_id } = body

    if (!access_token) {
      return c.json({ error: 'Access token is required' }, 400)
    }

    // Store tokens and folder ID in backup service
    backupService.setGoogleTokens({
      access_token,
      refresh_token,
      expires_at
    }, folder_id)

    return c.json({ 
      success: true, 
      message: `Google Drive configured successfully${folder_id ? ` (folder: ${folder_id})` : ' (root folder)'}` 
    })
  } catch (error) {
    console.error('Google tokens error:', error)
    return c.json({ error: 'Failed to store Google tokens' }, 500)
  }
})

app.get('/api/auth/google/status', authenticateJWT, async (c) => {
  try {
    const status = backupService.getAuthStatus()
    return c.json(status)
  } catch (error) {
    console.error('Google auth status error:', error)
    return c.json({ error: 'Failed to get Google auth status' }, 500)
  }
})

// Backup endpoints (protected)
app.post('/api/backup/trigger', authenticateJWT, async (c) => {
  try {
    const result = await schedulerService.triggerTestBackup()
    return c.json(result)
  } catch (error) {
    console.error('Manual backup error:', error)
    return c.json({ error: 'Backup failed' }, 500)
  }
})

app.get('/api/backup/status', authenticateJWT, async (c) => {
  try {
    const status = schedulerService.getSchedulerStatus()
    return c.json(status)
  } catch (error) {
    console.error('Backup status error:', error)
    return c.json({ error: 'Failed to get backup status' }, 500)
  }
})

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
          <script src="https://accounts.google.com/gsi/client" async defer></script>
        </head>
        <body>
          <div id="app"></div>
          <script type="module" src="/public/js/main.js"></script>
        </body>
      </html>
    `)
)

// Start the backup scheduler
schedulerService.startScheduler()

const port = process.env.PORT || 3000
console.log(`Server is running on port ${port}`)

export default app
