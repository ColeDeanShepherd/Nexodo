# Nexodo 📝

Next-gen productivity software built with Bun, Hono, and TypeScript.

## Features

- ✅ **Task Management** - Create, update, and delete tasks with real-time sync
- 💬 **Real-time Chat** - WebSocket-powered chat for team collaboration  
- 🚀 **Fast & Modern** - Built with Bun runtime and Hono framework
- 📱 **Responsive Design** - Works great on desktop and mobile
- ⚡ **Real-time Updates** - All changes sync instantly across connected clients

## Tech Stack

- **Runtime**: Bun
- **Backend**: Hono (TypeScript)
- **Frontend**: Vanilla TypeScript
- **WebSockets**: Native Bun WebSocket support
- **Deployment**: Railway

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) installed on your system

### Installation

1. Clone the repository:
```bash
git clone https://github.com/ColeDeanShepherd/Nexodo.git
cd Nexodo
```

2. Install dependencies:
```bash
bun install
```

3. Build the frontend:
```bash
bun run build:frontend
```

4. Start the development server:
```bash
bun run dev
```

5. Open http://localhost:3000 in your browser

## Available Scripts

- `bun run dev` - Start development server with hot reload
- `bun run build:frontend` - Build the TypeScript frontend
- `bun run build` - Build the backend for production
- `bun run build:all` - Build both frontend and backend
- `bun run start` - Start production server
- `bun run type-check` - Run TypeScript type checking

## API Endpoints

- `GET /api/health` - Health check endpoint
- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create a new task
- `PUT /api/tasks/:id` - Update a task
- `DELETE /api/tasks/:id` - Delete a task
- `GET /ws` - WebSocket endpoint for real-time features

## WebSocket Events

### Client → Server
- `chat_message` - Send a chat message
- `task_update` - Notify about task changes
- `ping` - Keep connection alive

### Server → Client
- `welcome` - Connection established
- `chat_message` - Broadcast chat message
- `task_update` - Real-time task updates
- `user_joined` / `user_left` - User presence updates
- `pong` - Ping response

## Deployment

### Railway

This project is configured for Railway deployment:

1. Connect your GitHub repository to Railway
2. Railway will automatically detect the configuration from `railway.toml`
3. Deploy with: `railway up`

The app includes:
- Health check endpoint for Railway monitoring
- Automatic environment variable configuration
- Production-ready build process

### Environment Variables

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment mode (development/production)

## Project Structure

```
Nexodo/
├── src/
│   ├── server.ts           # Main server file
│   ├── routes/
│   │   └── api.ts          # REST API routes
│   ├── websocket/
│   │   └── handler.ts      # WebSocket message handling
│   └── frontend/
│       └── main.ts         # Frontend TypeScript code
├── public/
│   └── css/
│       └── styles.css      # Styling
├── railway.toml            # Railway deployment config
├── package.json
├── tsconfig.json
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test them
4. Commit your changes: `git commit -am 'Add feature'`
5. Push to the branch: `git push origin feature-name`
6. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
