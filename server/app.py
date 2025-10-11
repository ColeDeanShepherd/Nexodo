from flask import Flask, request, session, Blueprint, send_from_directory, Response
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime, timedelta
from typing import Union, Tuple, Callable, Any
from functools import wraps

# Import all models and utilities from separate modules
from .config import Config
from .utils import success_response, error_response, no_content_response
from .models import (
    Base, Todo, Category, Deck, Flashcard, StudySession,
    validate_todo_data, validate_category_data, validate_deck_data,
    validate_flashcard_data, validate_study_data, initialize_database
)

# Initialize configuration
config = Config.from_env()

db = None

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
decks_bp = Blueprint('decks', __name__, url_prefix='/api')
flashcards_bp = Blueprint('flashcards', __name__, url_prefix='/api')
study_bp = Blueprint('study', __name__, url_prefix='/api')
client_bp = Blueprint('client', __name__)

# Health check endpoint
@auth_bp.route('/health')
def health_check() -> Tuple[Response, int]:
    """Health check endpoint for deployment"""
    return success_response({'status': 'healthy'})

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

# Deck API Routes
@decks_bp.route('/decks', methods=['GET'])
@login_required
def get_decks() -> Tuple[Response, int]:
    """Get all decks"""
    decks = Deck.query.order_by(Deck.updated_at.desc()).all()
    return success_response([deck.to_dict() for deck in decks])

@decks_bp.route('/decks', methods=['POST'])
@login_required
def create_deck() -> Tuple[Response, int]:
    """Create a new deck"""
    data, error = validate_deck_data(request.get_json())
    if error:
        return error
    
    deck = Deck.create_from_data(data)
    db.session.add(deck)
    db.session.commit()
    
    return success_response(deck.to_dict(), 201)

@decks_bp.route('/decks/<int:deck_id>', methods=['GET'])
@login_required
def get_deck(deck_id: int) -> Tuple[Response, int]:
    """Get a specific deck with its flashcards"""
    deck = Deck.query.get_or_404(deck_id)
    deck_data = deck.to_dict()
    deck_data['flashcards'] = [card.to_dict() for card in deck.flashcards]
    return success_response(deck_data)

@decks_bp.route('/decks/<int:deck_id>', methods=['PUT'])
@login_required
def update_deck(deck_id: int) -> Tuple[Response, int]:
    """Update a deck"""
    deck = Deck.query.get_or_404(deck_id)
    
    data, error = validate_deck_data(request.get_json())
    if error:
        return error
    
    deck.update_from_data(data)
    db.session.commit()
    
    return success_response(deck.to_dict())

@decks_bp.route('/decks/<int:deck_id>', methods=['DELETE'])
@login_required
def delete_deck(deck_id: int) -> Tuple[str, int]:
    """Delete a deck and all its flashcards"""
    deck = Deck.query.get_or_404(deck_id)
    db.session.delete(deck)
    db.session.commit()
    
    return no_content_response()

@decks_bp.route('/decks/<int:deck_id>/due', methods=['GET'])
@login_required
def get_due_cards(deck_id: int) -> Tuple[Response, int]:
    """Get cards due for review in a deck"""
    deck = Deck.query.get_or_404(deck_id)
    now = datetime.utcnow()
    due_cards = [card for card in deck.flashcards if card.next_review <= now]
    return success_response([card.to_dict() for card in due_cards])

# Flashcard API Routes
@flashcards_bp.route('/flashcards', methods=['POST'])
@login_required
def create_flashcard() -> Tuple[Response, int]:
    """Create a new flashcard"""
    data, error = validate_flashcard_data(request.get_json())
    if error:
        return error
    
    flashcard = Flashcard.create_from_data(data)
    db.session.add(flashcard)
    db.session.commit()
    
    return success_response(flashcard.to_dict(), 201)

@flashcards_bp.route('/flashcards/<int:card_id>', methods=['GET'])
@login_required
def get_flashcard(card_id: int) -> Tuple[Response, int]:
    """Get a specific flashcard"""
    flashcard = Flashcard.query.get_or_404(card_id)
    return success_response(flashcard.to_dict())

@flashcards_bp.route('/flashcards/<int:card_id>', methods=['PUT'])
@login_required
def update_flashcard(card_id: int) -> Tuple[Response, int]:
    """Update a flashcard"""
    flashcard = Flashcard.query.get_or_404(card_id)
    
    data, error = validate_flashcard_data(request.get_json(), for_update=True)
    if error:
        return error
    
    flashcard.update_from_data(data)
    db.session.commit()
    
    return success_response(flashcard.to_dict())

@flashcards_bp.route('/flashcards/<int:card_id>', methods=['DELETE'])
@login_required
def delete_flashcard(card_id: int) -> Tuple[str, int]:
    """Delete a flashcard"""
    flashcard = Flashcard.query.get_or_404(card_id)
    db.session.delete(flashcard)
    db.session.commit()
    
    return no_content_response()

# Study Session API Routes
@study_bp.route('/study', methods=['POST'])
@login_required
def record_study_session() -> Tuple[Response, int]:
    """Record a study session and update spaced repetition"""
    data, error = validate_study_data(request.get_json())
    if error:
        return error
    
    # Create study session record
    study_session = StudySession.create_from_data(data)
    db.session.add(study_session)
    
    # Update flashcard's spaced repetition data
    flashcard = Flashcard.query.get(data['flashcard_id'])
    flashcard.update_spaced_repetition(data['quality'])
    
    db.session.commit()
    
    return success_response({
        'study_session': study_session.to_dict(),
        'updated_flashcard': flashcard.to_dict()
    }, 201)

@study_bp.route('/study/stats', methods=['GET'])
@login_required
def get_study_stats() -> Tuple[Response, int]:
    """Get study statistics"""
    # Get counts by deck
    decks = Deck.query.all()
    deck_stats = []
    
    total_cards = 0
    total_due = 0
    
    for deck in decks:
        due_count = deck.get_due_cards_count()
        card_count = len(deck.flashcards)
        
        deck_stats.append({
            'deck_id': deck.id,
            'deck_name': deck.name,
            'total_cards': card_count,
            'due_cards': due_count
        })
        
        total_cards += card_count
        total_due += due_count
    
    # Get recent study sessions (last 7 days)
    week_ago = datetime.utcnow() - timedelta(days=7)
    recent_sessions = StudySession.query.filter(
        StudySession.studied_at >= week_ago
    ).count()
    
    return success_response({
        'total_decks': len(decks),
        'total_cards': total_cards,
        'total_due': total_due,
        'recent_sessions': recent_sessions,
        'deck_stats': deck_stats
    })

# Client Routes (Static File Serving)
@client_bp.route('/')
def serve_client() -> Response:
    """Serve the main web client"""
    return send_from_directory(config.client_dir, 'index.html')

@client_bp.route('/flashcards')
def serve_flashcards() -> Response:
    """Serve the flashcards page"""
    return send_from_directory(config.client_dir, 'flashcards.html')

@client_bp.route('/login.html')
def serve_login() -> Response:
    """Serve the login page"""
    return send_from_directory(config.client_dir + '/dist', 'login.html')

@client_bp.route('/assets/<path:filename>')
def serve_assets(filename: str) -> Response:
    """Serve assets for the Svelte login page"""
    return send_from_directory(config.client_dir + '/dist/assets', filename)

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
app.register_blueprint(decks_bp)
app.register_blueprint(flashcards_bp)
app.register_blueprint(study_bp)
app.register_blueprint(client_bp)

# Initialize Flask-SQLAlchemy with our models
db = SQLAlchemy(app, model_class=Base)

# Initialize database
with app.app_context():
    initialize_database(db)

if __name__ == '__main__':
    # Use configuration for deployment
    app.run(debug=config.debug, host='0.0.0.0', port=config.port)