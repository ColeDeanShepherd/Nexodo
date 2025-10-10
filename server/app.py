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

# Helper functions for consistent responses
def success_response(data: Any, status: int = 200) -> Tuple[Response, int]:
    """Standard success response"""
    return jsonify(data), status

def error_response(message: str, status: int = 400) -> Tuple[Response, int]:
    """Standard error response"""
    return jsonify({'error': message}), status

def no_content_response() -> Tuple[str, int]:
    """Standard 204 No Content response"""
    return '', 204

# Validation helper functions
def validate_todo_data(data: Optional[Dict[str, Any]], for_update: bool = False) -> Tuple[Optional[Dict[str, Any]], Optional[Tuple[Response, int]]]:
    """Validate todo data, return (validated_data, error) tuple"""
    if not data:
        return None, error_response('No data provided' if for_update else 'Description is required')
    
    if not for_update and 'description' not in data:
        return None, error_response('Description is required')
    
    validated_data = data.copy()
    
    # Handle deadline validation
    if 'deadline' in data and data['deadline']:
        try:
            validated_data['deadline'] = datetime.fromisoformat(data['deadline'].replace('Z', '+00:00'))
        except ValueError:
            return None, error_response('Invalid deadline format')
    elif 'deadline' in data and not data['deadline']:
        validated_data['deadline'] = None
    
    # Handle category validation
    category_id = data.get('category_id')
    if category_id and not Category.query.get(category_id):
        return None, error_response('Invalid category')
    
    return validated_data, None

def validate_category_data(data: Optional[Dict[str, Any]], exclude_id: Optional[int] = None) -> Tuple[Optional[Tuple[str, str]], Optional[Tuple[Response, int]]]:
    """Validate category data, return ((name, color), error) tuple"""
    if not data or 'name' not in data:
        return None, error_response('Category name is required')
    
    name = data['name'].strip()
    if not name:
        return None, error_response('Category name cannot be empty')
    
    # Validate color format (hex color)
    color = data.get('color', '#3498db')
    if not isinstance(color, str) or not color.startswith('#') or len(color) != 7:
        return None, error_response('Color must be a valid hex color (e.g., #3498db)')
    
    try:
        # Validate hex color by trying to convert it
        int(color[1:], 16)
    except ValueError:
        return None, error_response('Color must be a valid hex color (e.g., #3498db)')
    
    # Check uniqueness
    query = Category.query.filter_by(name=name)
    if exclude_id:
        query = query.filter(Category.id != exclude_id)
    
    if query.first():
        return None, error_response('Category already exists')
    
    return (name, color), None

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
    
    @classmethod
    def create_from_data(cls, data: Dict[str, Any]) -> 'Todo':
        """Create todo from validated data"""
        return cls(
            description=data['description'],
            deadline=data.get('deadline'),
            category_id=data.get('category_id')
        )
    
    def update_from_data(self, data: Dict[str, Any]) -> None:
        """Update todo from data"""
        if 'description' in data:
            self.description = data['description']
        if 'completed' in data:
            self.completed = data['completed']
        if 'deadline' in data:
            self.deadline = data['deadline']
        if 'category_id' in data:
            self.category_id = data['category_id']
        self.updated_at = datetime.utcnow()

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
    
    @classmethod
    def create_from_data(cls, name: str, color: str = '#3498db') -> 'Category':
        """Create category from data"""
        return cls(name=name, color=color)
    
    def can_delete(self) -> bool:
        """Check if category can be safely deleted"""
        return len(self.todos) == 0

# Session management helpers
def create_session() -> None:
    """Create authenticated session"""
    session.permanent = True
    session['authenticated'] = True
    session['login_time'] = datetime.utcnow().isoformat()

def is_session_valid() -> bool:
    """Check if session is valid and not expired"""
    if not session.get('authenticated') or not session.get('login_time'):
        return False
    
    login_time = datetime.fromisoformat(session['login_time'])
    return datetime.utcnow() - login_time <= timedelta(hours=config.session_lifetime_hours)

def clear_expired_session() -> bool:
    """Clear session if expired, return True if was expired"""
    if not is_session_valid():
        session.clear()
        return True
    return False

# Authentication functions
def login_required(f: Callable) -> Callable:
    @wraps(f)
    def decorated_function(*args: Any, **kwargs: Any) -> Union[Response, Tuple[Response, int]]:
        if clear_expired_session() or not is_session_valid():
            return error_response('Authentication required', 401)
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
    
    if not data or not verify_password(data.get('password', '')):
        return error_response('Invalid password', 401)
    
    create_session()
    return success_response({'success': True, 'message': 'Login successful'})

@auth_bp.route('/logout', methods=['POST'])
def logout() -> Tuple[Response, int]:
    """Clear the user session"""
    session.clear()
    return success_response({'success': True, 'message': 'Logged out successfully'})

@auth_bp.route('/auth-status', methods=['GET'])
def auth_status() -> Tuple[Response, int]:
    """Check if user is authenticated"""
    clear_expired_session()
    return success_response({'authenticated': is_session_valid()})

# Category API Routes
@categories_bp.route('/categories', methods=['GET'])
@login_required
def get_categories() -> Response:
    """Get all categories"""
    categories = Category.query.order_by(Category.created_at.asc()).all()
    return success_response([category.to_dict() for category in categories])

@categories_bp.route('/categories', methods=['POST'])
@login_required
def create_category() -> Tuple[Response, int]:
    """Create a new category"""
    validated_data, error = validate_category_data(request.get_json())
    if error:
        return error
    
    name, color = validated_data
    category = Category.create_from_data(name=name, color=color)
    
    db.session.add(category)
    db.session.commit()
    
    return success_response(category.to_dict(), 201)

@categories_bp.route('/categories/<int:category_id>', methods=['PUT'])
@login_required
def update_category(category_id: int) -> Union[Response, Tuple[Response, int]]:
    """Update an existing category"""
    category = Category.query.get_or_404(category_id)
    data = request.get_json()
    
    if not data:
        return error_response('No data provided')
    
    if 'name' in data or 'color' in data:
        validated_data, error = validate_category_data(data, exclude_id=category_id)
        if error:
            return error
        name, color = validated_data
        category.name = name
        category.color = color
    
    db.session.commit()
    return success_response(category.to_dict())

@categories_bp.route('/categories/<int:category_id>', methods=['DELETE'])
@login_required
def delete_category(category_id: int) -> Union[Tuple[str, int], Tuple[Response, int]]:
    """Delete a category"""
    category = Category.query.get_or_404(category_id)
    
    if not category.can_delete():
        return error_response('Cannot delete category that contains todos')
    
    db.session.delete(category)
    db.session.commit()
    
    return no_content_response()

# Todo API Routes
@todos_bp.route('/todos', methods=['GET'])
@login_required
def get_todos() -> Response:
    """Get all todos"""
    todos = Todo.query.order_by(Todo.created_at.desc()).all()
    return success_response([todo.to_dict() for todo in todos])

@todos_bp.route('/todos', methods=['POST'])
@login_required
def create_todo() -> Tuple[Response, int]:
    """Create a new todo"""
    validated_data, error = validate_todo_data(request.get_json())
    if error:
        return error
    
    todo = Todo.create_from_data(validated_data)
    
    db.session.add(todo)
    db.session.commit()
    
    return success_response(todo.to_dict(), 201)

@todos_bp.route('/todos/<int:todo_id>', methods=['PUT'])
@login_required
def update_todo(todo_id: int) -> Union[Response, Tuple[Response, int]]:
    """Update an existing todo"""
    todo = Todo.query.get_or_404(todo_id)
    
    validated_data, error = validate_todo_data(request.get_json(), for_update=True)
    if error:
        return error
    
    todo.update_from_data(validated_data)
    db.session.commit()
    
    return success_response(todo.to_dict())

@todos_bp.route('/todos/<int:todo_id>', methods=['DELETE'])
@login_required
def delete_todo(todo_id: int) -> Tuple[str, int]:
    """Delete a todo"""
    todo = Todo.query.get_or_404(todo_id)
    db.session.delete(todo)
    db.session.commit()
    
    return no_content_response()

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

# Database initialization
def initialize_database() -> None:
    """Initialize database with default data"""
    db.create_all()
    
    # Create default categories if they don't exist
    if Category.query.count() == 0:
        default_categories = [
            Category.create_from_data('Personal', '#3498db'),
            Category.create_from_data('Work', '#e74c3c'),
            Category.create_from_data('Shopping', '#f39c12'),
            Category.create_from_data('Health', '#27ae60')
        ]
        for category in default_categories:
            db.session.add(category)
        db.session.commit()

# Initialize database
with app.app_context():
    initialize_database()

if __name__ == '__main__':
    # Use configuration for deployment
    app.run(debug=config.debug, host='0.0.0.0', port=config.port)