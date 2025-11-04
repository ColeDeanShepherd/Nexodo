import type { ServerWebSocket } from 'bun'

interface WebSocketData {
  userId: string
  username: string
}

// Store active connections
const connections = new Map<string, ServerWebSocket<WebSocketData>>()

export const wsHandler = {
  message(ws: ServerWebSocket<WebSocketData>, message: string | Buffer) {
    try {
      const data = JSON.parse(message.toString())
      
      switch (data.type) {
        case 'chat_message':
          // Broadcast chat message to all connected clients
          const chatMessage = {
            type: 'chat_message',
            message: data.message,
            username: ws.data.username,
            timestamp: new Date().toISOString(),
          }
          
          for (const [, client] of connections) {
            if (client.readyState === 1) { // WebSocket.OPEN
              client.send(JSON.stringify(chatMessage))
            }
          }
          break
          
        case 'task_update':
          // Broadcast task updates to all clients
          const taskUpdate = {
            type: 'task_update',
            task: data.task,
            action: data.action, // 'created', 'updated', 'deleted'
            timestamp: new Date().toISOString(),
          }
          
          for (const [, client] of connections) {
            if (client.readyState === 1) {
              client.send(JSON.stringify(taskUpdate))
            }
          }
          break
          
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }))
          break
      }
    } catch (error) {
      console.error('WebSocket message error:', error)
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Invalid message format' 
      }))
    }
  },

  open(ws: ServerWebSocket<WebSocketData>) {
    // Generate user ID and assign default username
    const userId = crypto.randomUUID()
    const username = `User${Math.floor(Math.random() * 1000)}`
    
    ws.data = { userId, username }
    connections.set(userId, ws)
    
    console.log(`WebSocket connection opened: ${userId}`)
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'welcome',
      userId,
      username,
      timestamp: new Date().toISOString(),
    }))
    
    // Notify other clients
    const joinMessage = {
      type: 'user_joined',
      username,
      timestamp: new Date().toISOString(),
    }
    
    for (const [id, client] of connections) {
      if (id !== userId && client.readyState === 1) {
        client.send(JSON.stringify(joinMessage))
      }
    }
  },

  close(ws: ServerWebSocket<WebSocketData>) {
    if (ws.data?.userId) {
      connections.delete(ws.data.userId)
      console.log(`WebSocket connection closed: ${ws.data.userId}`)
      
      // Notify other clients
      const leaveMessage = {
        type: 'user_left',
        username: ws.data.username,
        timestamp: new Date().toISOString(),
      }
      
      for (const [, client] of connections) {
        if (client.readyState === 1) {
          client.send(JSON.stringify(leaveMessage))
        }
      }
    }
  },

  error(ws: ServerWebSocket<WebSocketData>, error: Error) {
    console.error('WebSocket error:', error)
    if (ws.data?.userId) {
      connections.delete(ws.data.userId)
    }
  },
}