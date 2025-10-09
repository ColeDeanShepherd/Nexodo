from flask import Flask, request, jsonify, session, Blueprint, send_from_directory, Response
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from flask_cors import CORS
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Union, Tuple, Callable
import os
from functools import wraps
from dataclasses import dataclass

@dataclass
class Config:
    """Application configuration from environment variables"""
    secret_key: str
    app_password: str
    database_url: str
    port: int # Only used when debugging
    debug: bool
    client_dir: str
    session_lifetime_hours: int
    
    @classmethod
    def from_env(cls) -> 'Config':
        """Create config from environment variables"""
        # Database URL handling
        database_url = os.environ.get('DATABASE_URL')
        if database_url:
            # Handle Railway's postgres:// vs postgresql:// URL format
            if database_url.startswith('postgres://'):
                database_url = database_url.replace('postgres://', 'postgresql://', 1)
        else:
            # Development - SQLite
            database_url = 'sqlite:///todos.db'
        
        return cls(
            secret_key=os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production'),
            app_password=os.environ.get('APP_PASSWORD', 'nexodo123'),
            database_url=database_url,
            port=int(os.environ.get('PORT', 5000)),
            debug=os.environ.get('FLASK_ENV') != 'production',
            client_dir='../client',
            session_lifetime_hours=24
        )

# Initialize configuration
config = Config.from_env()

# Create declarative base for models
Base = declarative_base()

db = None

class Todo(Base):
    __tablename__ = 'todo'
    
    id = Column(Integer, primary_key=True)
    description = Column(String(200), nullable=False)
    completed = Column(Boolean, default=False, nullable=False)
    deadline = Column(DateTime, nullable=True)
    category_id = Column(Integer, ForeignKey('category.id'), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationship
    category = relationship("Category", back_populates="todos")

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'description': self.description,
            'completed': self.completed,
            'deadline': self.deadline.isoformat() if self.deadline else None,
            'category_id': self.category_id,
            'category': self.category.to_dict() if self.category else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class Category(Base):
    __tablename__ = 'category'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False, unique=True)
    color = Column(String(7), nullable=False, default='#3498db')  # Hex color code
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationship with todos
    todos = relationship('Todo', back_populates='category')
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'name': self.name,
            'color': self.color,
            'created_at': self.created_at.isoformat(),
            'todo_count': len(self.todos)
        }

# Authentication functions
def login_required(f: Callable) -> Callable:
    @wraps(f)
    def decorated_function(*args: Any, **kwargs: Any) -> Union[Response, Tuple[Response, int]]:
        if not session.get('authenticated') or not session.get('login_time'):
            return jsonify({'error': 'Authentication required'}), 401
        
        # Check if session has expired
        login_time = datetime.fromisoformat(session['login_time'])
        if datetime.utcnow() - login_time > timedelta(hours=config.session_lifetime_hours):
            session.clear()
            return jsonify({'error': 'Session expired'}), 401
        
        return f(*args, **kwargs)
    return decorated_function

def verify_password(password: str) -> bool:
    """Verify if the provided password matches the app password"""
    return password == config.app_password

# Create Blueprints
auth_bp = Blueprint('auth', __name__, url_prefix='/api')
categories_bp = Blueprint('categories', __name__, url_prefix='/api')
todos_bp = Blueprint('todos', __name__, url_prefix='/api')
client_bp = Blueprint('client', __name__)

# Authentication Routes
@auth_bp.route('/login', methods=['POST'])
def login() -> Tuple[Response, int]:
    """Authenticate user with password"""
    data = request.get_json()
    
    if not data or 'password' not in data:
        return jsonify({'error': 'Password is required'}), 400
    
    if verify_password(data['password']):
        session.permanent = True
        session['authenticated'] = True
        session['login_time'] = datetime.utcnow().isoformat()
        return jsonify({'success': True, 'message': 'Login successful'}), 200
    else:
        return jsonify({'error': 'Invalid password'}), 401

@auth_bp.route('/logout', methods=['POST'])
def logout() -> Tuple[Response, int]:
    """Clear the user session"""
    session.clear()
    return jsonify({'success': True, 'message': 'Logged out successfully'}), 200

@auth_bp.route('/auth-status', methods=['GET'])
def auth_status() -> Tuple[Response, int]:
    """Check if user is authenticated"""
    if not session.get('authenticated') or not session.get('login_time'):
        return jsonify({'authenticated': False}), 200
    
    # Check if session has expired
    login_time = datetime.fromisoformat(session['login_time'])
    if datetime.utcnow() - login_time > timedelta(hours=config.session_lifetime_hours):
        session.clear()
        return jsonify({'authenticated': False}), 200
    
    return jsonify({'authenticated': True}), 200

# Category API Routes
@categories_bp.route('/categories', methods=['GET'])
@login_required
def get_categories() -> Response:
    """Get all categories"""
    categories = Category.query.order_by(Category.created_at.asc()).all()
    return jsonify([category.to_dict() for category in categories])

@categories_bp.route('/categories', methods=['POST'])
@login_required
def create_category() -> Tuple[Response, int]:
    """Create a new category"""
    data = request.get_json()
    
    if not data or 'name' not in data:
        return jsonify({'error': 'Category name is required'}), 400
    
    name = data['name'].strip()
    if not name:
        return jsonify({'error': 'Category name cannot be empty'}), 400
    
    # Check if category already exists
    existing_category = Category.query.filter_by(name=name).first()
    if existing_category:
        return jsonify({'error': 'Category already exists'}), 400
    
    color = data.get('color', '#3498db')
    
    category = Category(name=name, color=color)
    db.session.add(category)
    db.session.commit()
    
    return jsonify(category.to_dict()), 201

@categories_bp.route('/categories/<int:category_id>', methods=['PUT'])
@login_required
def update_category(category_id: int) -> Union[Response, Tuple[Response, int]]:
    """Update an existing category"""
    category = Category.query.get_or_404(category_id)
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    if 'name' in data:
        name = data['name'].strip()
        if not name:
            return jsonify({'error': 'Category name cannot be empty'}), 400
        
        # Check if another category with this name exists
        existing_category = Category.query.filter(
            Category.name == name, 
            Category.id != category_id
        ).first()
        if existing_category:
            return jsonify({'error': 'Category name already exists'}), 400
        
        category.name = name
    
    if 'color' in data:
        category.color = data['color']
    
    db.session.commit()
    return jsonify(category.to_dict())

@categories_bp.route('/categories/<int:category_id>', methods=['DELETE'])
@login_required
def delete_category(category_id: int) -> Union[Tuple[str, int], Tuple[Response, int]]:
    """Delete a category"""
    category = Category.query.get_or_404(category_id)
    
    # Check if category has todos
    if category.todos:
        return jsonify({'error': 'Cannot delete category that contains todos'}), 400
    
    db.session.delete(category)
    db.session.commit()
    
    return '', 204

# Todo API Routes
@todos_bp.route('/todos', methods=['GET'])
@login_required
def get_todos() -> Response:
    """Get all todos"""
    todos = Todo.query.order_by(Todo.created_at.desc()).all()
    return jsonify([todo.to_dict() for todo in todos])

@todos_bp.route('/todos', methods=['POST'])
@login_required
def create_todo() -> Tuple[Response, int]:
    """Create a new todo"""
    data = request.get_json()
    
    if not data or 'description' not in data:
        return jsonify({'error': 'Description is required'}), 400
    
    deadline: Optional[datetime] = None
    if data.get('deadline'):
        try:
            deadline = datetime.fromisoformat(data['deadline'].replace('Z', '+00:00'))
        except ValueError:
            return jsonify({'error': 'Invalid deadline format'}), 400
    
    # Handle category assignment
    category_id = data.get('category_id')
    if category_id:
        category = Category.query.get(category_id)
        if not category:
            return jsonify({'error': 'Invalid category'}), 400
    
    todo = Todo(
        description=data['description'],
        deadline=deadline,
        category_id=category_id
    )
    
    db.session.add(todo)
    db.session.commit()
    
    return jsonify(todo.to_dict()), 201

@todos_bp.route('/todos/<int:todo_id>', methods=['PUT'])
@login_required
def update_todo(todo_id: int) -> Union[Response, Tuple[Response, int]]:
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
    
    if 'category_id' in data:
        category_id = data['category_id']
        if category_id:
            category = Category.query.get(category_id)
            if not category:
                return jsonify({'error': 'Invalid category'}), 400
        todo.category_id = category_id
    
    todo.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify(todo.to_dict())

@todos_bp.route('/todos/<int:todo_id>', methods=['DELETE'])
@login_required
def delete_todo(todo_id: int) -> Tuple[str, int]:
    """Delete a todo"""
    todo = Todo.query.get_or_404(todo_id)
    db.session.delete(todo)
    db.session.commit()
    
    return '', 204

# Client Routes (Static File Serving)
@client_bp.route('/')
def serve_client() -> Response:
    """Serve the main web client"""
    return send_from_directory(config.client_dir, 'index.html')

@client_bp.route('/login.html')
def serve_login() -> Response:
    """Serve the login page"""
    return send_from_directory(config.client_dir, 'login.html')

app = Flask(__name__, static_folder=config.client_dir, static_url_path='')

# Session configuration
app.secret_key = config.secret_key
app.permanent_session_lifetime = timedelta(hours=config.session_lifetime_hours)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = config.database_url

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

CORS(app)  # Enable CORS for all routes

# Register Blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(categories_bp)
app.register_blueprint(todos_bp)
app.register_blueprint(client_bp)

# Initialize Flask-SQLAlchemy with our models
db = SQLAlchemy(app, model_class=Base)

# Initialize database
with app.app_context():
    db.create_all()
    
    # Create default categories if they don't exist
    if Category.query.count() == 0:
        default_categories = [
            Category(name='Personal', color='#3498db'),
            Category(name='Work', color='#e74c3c')
        ]
        for category in default_categories:
            db.session.add(category)
        db.session.commit()

if __name__ == '__main__':
    # Use configuration for deployment
    app.run(debug=config.debug, host='0.0.0.0', port=config.port)