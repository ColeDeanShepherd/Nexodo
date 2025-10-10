from flask import Response
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Union, Tuple

# Import from our new modules
from config import Config
from utils import success_response, error_response, no_content_response

# Create declarative base for models
Base = declarative_base()

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

def validate_deck_data(data: Optional[Dict[str, Any]]) -> Tuple[Optional[Dict[str, Any]], Optional[Tuple[Response, int]]]:
    """Validate deck data, return (validated_data, error) tuple"""
    if not data or 'name' not in data:
        return None, error_response('Deck name is required')
    
    name = data['name'].strip()
    if not name:
        return None, error_response('Deck name cannot be empty')
    
    validated_data = {
        'name': name,
        'description': data.get('description', '').strip()
    }
    
    return validated_data, None

def validate_flashcard_data(data: Optional[Dict[str, Any]], for_update: bool = False) -> Tuple[Optional[Dict[str, Any]], Optional[Tuple[Response, int]]]:
    """Validate flashcard data, return (validated_data, error) tuple"""
    if not data:
        return None, error_response('No data provided')
    
    if not for_update and 'deck_id' not in data:
        return None, error_response('Deck ID is required')
    
    if not for_update and not Deck.query.get(data['deck_id']):
        return None, error_response('Invalid deck')
    
    validated_data = data.copy()
    
    # Validate front and back text
    for field in ['front', 'back']:
        if field in data:
            text = data[field].strip()
            if not text:
                return None, error_response(f'{field.title()} text cannot be empty')
            validated_data[field] = text
        elif not for_update:
            return None, error_response(f'{field.title()} text is required')
    
    return validated_data, None

def validate_study_data(data: Optional[Dict[str, Any]]) -> Tuple[Optional[Dict[str, Any]], Optional[Tuple[Response, int]]]:
    """Validate study session data, return (validated_data, error) tuple"""
    if not data:
        return None, error_response('No data provided')
    
    if 'flashcard_id' not in data:
        return None, error_response('Flashcard ID is required')
    
    if not Flashcard.query.get(data['flashcard_id']):
        return None, error_response('Invalid flashcard')
    
    if 'quality' not in data:
        return None, error_response('Quality rating is required')
    
    try:
        quality = int(data['quality'])
        if quality < 0 or quality > 5:
            return None, error_response('Quality must be between 0 and 5')
    except (ValueError, TypeError):
        return None, error_response('Quality must be a valid integer')
    
    validated_data = {
        'flashcard_id': data['flashcard_id'],
        'quality': quality,
        'response_time': data.get('response_time')
    }
    
    if validated_data['response_time'] is not None:
        try:
            validated_data['response_time'] = int(validated_data['response_time'])
            if validated_data['response_time'] < 0:
                return None, error_response('Response time must be positive')
        except (ValueError, TypeError):
            return None, error_response('Response time must be a valid integer')
    
    return validated_data, None

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

class Deck(Base):
    __tablename__ = 'deck'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    description = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationship with flashcards
    flashcards = relationship('Flashcard', back_populates='deck', cascade='all, delete-orphan')
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'card_count': len(self.flashcards),
            'due_count': self.get_due_cards_count()
        }
    
    def get_due_cards_count(self) -> int:
        """Get count of cards due for review"""
        now = datetime.utcnow()
        return sum(1 for card in self.flashcards if card.next_review <= now)
    
    @classmethod
    def create_from_data(cls, data: Dict[str, Any]) -> 'Deck':
        """Create deck from validated data"""
        return cls(
            name=data['name'],
            description=data.get('description', '')
        )
    
    def update_from_data(self, data: Dict[str, Any]) -> None:
        """Update deck from data"""
        if 'name' in data:
            self.name = data['name']
        if 'description' in data:
            self.description = data['description']
        self.updated_at = datetime.utcnow()

class Flashcard(Base):
    __tablename__ = 'flashcard'
    
    id = Column(Integer, primary_key=True)
    deck_id = Column(Integer, ForeignKey('deck.id'), nullable=False)
    front = Column(String(1000), nullable=False)
    back = Column(String(1000), nullable=False)
    
    # Spaced repetition fields (SM-2 algorithm)
    ease_factor = Column(Integer, default=2500, nullable=False)  # Stored as int (2.5 = 2500)
    interval = Column(Integer, default=1, nullable=False)  # Days until next review
    repetitions = Column(Integer, default=0, nullable=False)  # Number of successful repetitions
    next_review = Column(DateTime, default=datetime.utcnow, nullable=False)  # When card is due for review
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationship
    deck = relationship('Deck', back_populates='flashcards')
    study_sessions = relationship('StudySession', back_populates='flashcard', cascade='all, delete-orphan')
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'deck_id': self.deck_id,
            'front': self.front,
            'back': self.back,
            'ease_factor': self.ease_factor / 1000.0,  # Convert back to decimal
            'interval': self.interval,
            'repetitions': self.repetitions,
            'next_review': self.next_review.isoformat(),
            'is_due': self.next_review <= datetime.utcnow(),
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    @classmethod
    def create_from_data(cls, data: Dict[str, Any]) -> 'Flashcard':
        """Create flashcard from validated data"""
        return cls(
            deck_id=data['deck_id'],
            front=data['front'],
            back=data['back']
        )
    
    def update_from_data(self, data: Dict[str, Any]) -> None:
        """Update flashcard from data"""
        if 'front' in data:
            self.front = data['front']
        if 'back' in data:
            self.back = data['back']
        self.updated_at = datetime.utcnow()
    
    def update_spaced_repetition(self, quality: int) -> None:
        """Update spaced repetition data based on quality (0-5 scale)"""
        # SM-2 Algorithm implementation
        if quality >= 3:
            if self.repetitions == 0:
                self.interval = 1
            elif self.repetitions == 1:
                self.interval = 6
            else:
                self.interval = int(self.interval * (self.ease_factor / 1000.0))
            
            self.repetitions += 1
        else:
            self.repetitions = 0
            self.interval = 1
        
        # Update ease factor
        self.ease_factor = max(1300, self.ease_factor + (10 * (quality - 3)))
        
        # Set next review date
        self.next_review = datetime.utcnow() + timedelta(days=self.interval)
        self.updated_at = datetime.utcnow()

class StudySession(Base):
    __tablename__ = 'study_session'
    
    id = Column(Integer, primary_key=True)
    flashcard_id = Column(Integer, ForeignKey('flashcard.id'), nullable=False)
    quality = Column(Integer, nullable=False)  # 0-5 scale for SM-2
    response_time = Column(Integer, nullable=True)  # Response time in seconds
    studied_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationship
    flashcard = relationship('Flashcard', back_populates='study_sessions')
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'flashcard_id': self.flashcard_id,
            'quality': self.quality,
            'response_time': self.response_time,
            'studied_at': self.studied_at.isoformat()
        }
    
    @classmethod
    def create_from_data(cls, data: Dict[str, Any]) -> 'StudySession':
        """Create study session from validated data"""
        return cls(
            flashcard_id=data['flashcard_id'],
            quality=data['quality'],
            response_time=data.get('response_time')
        )

# Database initialization
def initialize_database(db: SQLAlchemy) -> None:
    """Initialize database with default data"""
    db.create_all()
    
    # Create default categories if they don't exist
    if Category.query.count() == 0:
        default_categories = [
            Category.create_from_data('Personal', '#3498db'),
            Category.create_from_data('Work', '#e74c3c')
        ]
        for category in default_categories:
            db.session.add(category)
        db.session.commit()