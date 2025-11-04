import { Hono } from 'hono'

export interface Task {
  id: string
  text: string
  completed: boolean
  createdAt: string
}

// In-memory storage (replace with database in production)
let tasks: Task[] = []

export const apiRoutes = new Hono()

// Get all tasks
apiRoutes.get('/tasks', (c) => {
  return c.json({ tasks })
})

// Create a new task
apiRoutes.post('/tasks', async (c) => {
  const body = await c.req.json()
  const { text } = body

  if (!text || typeof text !== 'string') {
    return c.json({ error: 'Task text is required' }, 400)
  }

  const newTask: Task = {
    id: crypto.randomUUID(),
    text: text.trim(),
    completed: false,
    createdAt: new Date().toISOString(),
  }

  tasks.push(newTask)
  return c.json({ task: newTask }, 201)
})

// Update a task
apiRoutes.put('/tasks/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  
  const taskIndex = tasks.findIndex(task => task.id === id)
  if (taskIndex === -1) {
    return c.json({ error: 'Task not found' }, 404)
  }

  tasks[taskIndex] = { ...tasks[taskIndex], ...body }
  return c.json({ task: tasks[taskIndex] })
})

// Delete a task
apiRoutes.delete('/tasks/:id', (c) => {
  const id = c.req.param('id')
  const taskIndex = tasks.findIndex(task => task.id === id)
  
  if (taskIndex === -1) {
    return c.json({ error: 'Task not found' }, 404)
  }

  const deletedTask = tasks.splice(taskIndex, 1)[0]
  return c.json({ task: deletedTask })
})

// Health check
apiRoutes.get('/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    tasksCount: tasks.length 
  })
})