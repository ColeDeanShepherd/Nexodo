# Nexodo 📝

Next-gen productivity software (vibe-coded).

## Features

- ✅ **Full CRUD Operations**: Create, read, update, and delete todos
- 📅 **Optional Deadlines**: Set deadlines for your todos with visual indicators
- 🔍 **Smart Filtering**: View all todos, only active ones, or completed ones
- ✏️ **Inline Editing**: Edit todo descriptions and deadlines with a modal interface
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices
- 🎯 **Real-time Updates**: Auto-refresh and immediate UI feedback
- 💾 **Persistent Storage**: SQLite database for reliable data storage

## Technology Stack

### Backend
- **Python 3.7+** - Core language
- **Flask** - Web framework
- **SQLAlchemy** - ORM for database operations
- **Flask-CORS** - Cross-origin resource sharing
- **SQLite** - Database

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with flexbox and grid
- **Vanilla JavaScript** - No frameworks, pure JS
- **Fetch API** - HTTP requests to the backend

## Project Structure

```
Nexodo/
├── server/
│   └── app.py              # Flask application and API routes
├── client/
│   ├── index.html          # Main HTML page
│   ├── styles.css          # CSS styling
│   └── script.js           # JavaScript functionality
├── requirements.txt        # Python dependencies
├── .gitignore             # Git ignore rules
└── README.md              # This file
```

## Quick Start

### Prerequisites
- Python 3.7 or higher
- pip (Python package installer)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Nexodo
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the server**
   ```bash
   cd server
   python app.py
   ```

4. **Open your browser**
   Navigate to `http://localhost:5000` to use the application.

The Flask server will:
- Serve the web client at the root URL (`/`)
- Provide the REST API at `/api/todos`
- Create a SQLite database (`todos.db`) automatically on first run

### Development Setup

For development, you might want to use a virtual environment:

```bash
# Create virtual environment
python -m venv venv

# Activate it (Windows)
venv\Scripts\activate

# Activate it (macOS/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the server
cd server
python app.py
```

## API Documentation

The REST API provides the following endpoints:

### Get All Todos
- **GET** `/api/todos`
- Returns array of all todos ordered by creation date (newest first)

### Create Todo
- **POST** `/api/todos`
- Body: `{"description": "string", "deadline": "ISO datetime or null"}`
- Returns the created todo object

### Update Todo
- **PUT** `/api/todos/<id>`
- Body: `{"description": "string", "completed": boolean, "deadline": "ISO datetime or null"}`
- Returns the updated todo object

### Delete Todo
- **DELETE** `/api/todos/<id>`
- Returns 204 No Content on success

### Todo Object Structure
```json
{
  "id": 1,
  "description": "Complete the project",
  "completed": false,
  "deadline": "2023-12-31T23:59:59",
  "created_at": "2023-10-01T10:00:00",
  "updated_at": "2023-10-01T10:00:00"
}
```

## Usage Guide

### Adding Todos
1. Enter a description in the "Add New Todo" form
2. Optionally set a deadline using the datetime picker
3. Click "Add Todo" or press Enter

### Managing Todos
- **Mark Complete**: Click the checkbox next to any todo
- **Edit**: Click the "Edit" button to modify description or deadline
- **Delete**: Click the "Delete" button (with confirmation)

### Filtering
- **All**: View all todos (default)
- **Active**: View only incomplete todos
- **Completed**: View only completed todos

### Visual Indicators
- 🔴 **Overdue**: Red text for todos past their deadline
- 🟡 **Due Today**: Orange text for todos due today
- ✅ **Completed**: Grayed out with strikethrough text

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Icons and emojis for visual enhancement
- Modern CSS techniques for responsive design
- RESTful API design principles
