interface Task {
  id: string
  text: string
  completed: boolean
  createdAt: string
}

interface ChatMessage {
  type: 'chat_message'
  message: string
  username: string
  timestamp: string
}

interface TaskUpdate {
  type: 'task_update'
  task: Task
  action: 'created' | 'updated' | 'deleted'
  timestamp: string
}

class NexodoApp {
  private ws: WebSocket | null = null
  private tasks: Task[] = []
  private username: string = ''
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  constructor() {
    this.initializeApp()
  }

  private async initializeApp() {
    this.setupEventListeners()
    await this.loadTasks()
    this.connectWebSocket()
  }

  private setupEventListeners() {
    // Task management
    const addTaskBtn = document.getElementById('add-task') as HTMLButtonElement
    const newTaskInput = document.getElementById('new-task') as HTMLInputElement
    
    addTaskBtn?.addEventListener('click', () => this.addTask())
    newTaskInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addTask()
    })

    // Chat functionality
    const sendMessageBtn = document.getElementById('send-message') as HTMLButtonElement
    const messageInput = document.getElementById('message-input') as HTMLInputElement
    
    sendMessageBtn?.addEventListener('click', () => this.sendMessage())
    messageInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage()
    })
  }

  private async loadTasks() {
    try {
      const response = await fetch('/api/tasks')
      if (response.ok) {
        const data = await response.json()
        this.tasks = data.tasks
        this.renderTasks()
      }
    } catch (error) {
      console.error('Failed to load tasks:', error)
    }
  }

  private renderTasks() {
    const taskList = document.getElementById('task-list')
    if (!taskList) return

    taskList.innerHTML = ''
    
    this.tasks.forEach(task => {
      const li = document.createElement('li')
      li.className = task.completed ? 'task completed' : 'task'
      
      li.innerHTML = `
        <input type="checkbox" ${task.completed ? 'checked' : ''} 
               onchange="app.toggleTask('${task.id}')">
        <span class="task-text">${this.escapeHtml(task.text)}</span>
        <button onclick="app.deleteTask('${task.id}')" class="delete-btn">×</button>
      `
      
      taskList.appendChild(li)
    })
  }

  private async addTask() {
    const input = document.getElementById('new-task') as HTMLInputElement
    const text = input.value.trim()
    
    if (!text) return

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })

      if (response.ok) {
        const data = await response.json()
        this.tasks.push(data.task)
        this.renderTasks()
        input.value = ''
        
        // Notify other clients via WebSocket
        this.sendWebSocketMessage({
          type: 'task_update',
          task: data.task,
          action: 'created'
        })
      }
    } catch (error) {
      console.error('Failed to add task:', error)
    }
  }

  public async toggleTask(id: string) {
    const task = this.tasks.find(t => t.id === id)
    if (!task) return

    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !task.completed })
      })

      if (response.ok) {
        const data = await response.json()
        const taskIndex = this.tasks.findIndex(t => t.id === id)
        this.tasks[taskIndex] = data.task
        this.renderTasks()
        
        // Notify other clients
        this.sendWebSocketMessage({
          type: 'task_update',
          task: data.task,
          action: 'updated'
        })
      }
    } catch (error) {
      console.error('Failed to toggle task:', error)
    }
  }

  public async deleteTask(id: string) {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const data = await response.json()
        this.tasks = this.tasks.filter(t => t.id !== id)
        this.renderTasks()
        
        // Notify other clients
        this.sendWebSocketMessage({
          type: 'task_update',
          task: data.task,
          action: 'deleted'
        })
      }
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  private connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws`
    
    this.ws = new WebSocket(wsUrl)
    
    this.ws.onopen = () => {
      console.log('WebSocket connected')
      this.updateConnectionStatus('Connected', 'connected')
      this.reconnectAttempts = 0
    }
    
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        this.handleWebSocketMessage(data)
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }
    
    this.ws.onclose = () => {
      console.log('WebSocket disconnected')
      this.updateConnectionStatus('Disconnected', 'disconnected')
      this.attemptReconnect()
    }
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      this.updateConnectionStatus('Error', 'error')
    }
  }

  private handleWebSocketMessage(data: any) {
    switch (data.type) {
      case 'welcome':
        this.username = data.username
        this.addChatMessage(`Welcome! You are ${data.username}`, 'system')
        break
        
      case 'chat_message':
        this.addChatMessage(`${data.username}: ${data.message}`, 'user')
        break
        
      case 'task_update':
        this.handleTaskUpdate(data as TaskUpdate)
        break
        
      case 'user_joined':
        this.addChatMessage(`${data.username} joined`, 'system')
        break
        
      case 'user_left':
        this.addChatMessage(`${data.username} left`, 'system')
        break
        
      case 'pong':
        // Handle ping response
        break
    }
  }

  private handleTaskUpdate(update: TaskUpdate) {
    // Only update if the change came from another client
    const existingTask = this.tasks.find(t => t.id === update.task.id)
    
    switch (update.action) {
      case 'created':
        if (!existingTask) {
          this.tasks.push(update.task)
          this.renderTasks()
        }
        break
        
      case 'updated':
        if (existingTask) {
          const taskIndex = this.tasks.findIndex(t => t.id === update.task.id)
          this.tasks[taskIndex] = update.task
          this.renderTasks()
        }
        break
        
      case 'deleted':
        this.tasks = this.tasks.filter(t => t.id !== update.task.id)
        this.renderTasks()
        break
    }
  }

  private sendMessage() {
    const input = document.getElementById('message-input') as HTMLInputElement
    const message = input.value.trim()
    
    if (!message || !this.ws) return

    this.sendWebSocketMessage({
      type: 'chat_message',
      message
    })
    
    input.value = ''
  }

  private sendWebSocketMessage(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    }
  }

  private addChatMessage(message: string, type: 'user' | 'system') {
    const messagesContainer = document.getElementById('messages')
    if (!messagesContainer) return

    const messageEl = document.createElement('div')
    messageEl.className = `message ${type}`
    messageEl.textContent = message
    
    messagesContainer.appendChild(messageEl)
    messagesContainer.scrollTop = messagesContainer.scrollHeight
  }

  private updateConnectionStatus(status: string, className: string) {
    const statusEl = document.getElementById('connection-status')
    if (statusEl) {
      statusEl.textContent = status
      statusEl.className = `status ${className}`
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      this.updateConnectionStatus(`Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`, 'reconnecting')
      
      setTimeout(() => {
        this.connectWebSocket()
      }, 2000 * this.reconnectAttempts) // Exponential backoff
    } else {
      this.updateConnectionStatus('Failed to reconnect', 'error')
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  (window as any).app = new NexodoApp()
})

// Keep a ping interval to maintain connection
setInterval(() => {
  const app = (window as any).app as NexodoApp
  if (app) {
    app['sendWebSocketMessage']({ type: 'ping' })
  }
}, 30000) // Ping every 30 seconds