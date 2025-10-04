from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
import os

app = Flask(__name__, static_folder='../client', static_url_path='')

# Database configuration - use PostgreSQL in production, SQLite in development
if os.environ.get('DATABASE_URL'):
    # Production - Railway PostgreSQL
    database_url = os.environ.get('DATABASE_URL')
    # Handle Railway's postgres:// vs postgresql:// URL format
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
else:
    # Development - SQLite
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///todos.db'

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
CORS(app)  # Enable CORS for all routes

class Todo(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    description = db.Column(db.String(200), nullable=False)
    completed = db.Column(db.Boolean, default=False, nullable=False)
    deadline = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'description': self.description,
            'completed': self.completed,
            'deadline': self.deadline.isoformat() if self.deadline else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

# API Routes
@app.route('/api/todos', methods=['GET'])
def get_todos():
    """Get all todos"""
    todos = Todo.query.order_by(Todo.created_at.desc()).all()
    return jsonify([todo.to_dict() for todo in todos])

@app.route('/api/todos', methods=['POST'])
def create_todo():
    """Create a new todo"""
    data = request.get_json()
    
    if not data or 'description' not in data:
        return jsonify({'error': 'Description is required'}), 400
    
    deadline = None
    if data.get('deadline'):
        try:
            deadline = datetime.fromisoformat(data['deadline'].replace('Z', '+00:00'))
        except ValueError:
            return jsonify({'error': 'Invalid deadline format'}), 400
    
    todo = Todo(
        description=data['description'],
        deadline=deadline
    )
    
    db.session.add(todo)
    db.session.commit()
    
    return jsonify(todo.to_dict()), 201

@app.route('/api/todos/<int:todo_id>', methods=['PUT'])
def update_todo(todo_id):
    """Update an existing todo"""
    todo = Todo.query.get_or_404(todo_id)
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    if 'description' in data:
        todo.description = data['description']
    
    if 'completed' in data:
        todo.completed = data['completed']
    
    if 'deadline' in data:
        if data['deadline']:
            try:
                todo.deadline = datetime.fromisoformat(data['deadline'].replace('Z', '+00:00'))
            except ValueError:
                return jsonify({'error': 'Invalid deadline format'}), 400
        else:
            todo.deadline = None
    
    todo.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify(todo.to_dict())

@app.route('/api/todos/<int:todo_id>', methods=['DELETE'])
def delete_todo(todo_id):
    """Delete a todo"""
    todo = Todo.query.get_or_404(todo_id)
    db.session.delete(todo)
    db.session.commit()
    
    return '', 204

# Serve the web client
@app.route('/')
def serve_client():
    """Serve the main web client"""
    return app.send_static_file('index.html')

# Initialize database
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    # Use environment variables for production deployment
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') != 'production'
    app.run(debug=debug, host='0.0.0.0', port=port)