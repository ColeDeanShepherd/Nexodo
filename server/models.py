from flask import Response
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Union, Tuple
import json

# Import from our new modules
from .config import Config
from .utils import success_response, error_response, no_content_response
from .recurrence import RecurrencePattern, RecurrenceCalculator

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
    
    # Handle priority validation
    priority = data.get('priority', 'low')
    if priority not in ['high', 'medium', 'low']:
        return None, error_response('Priority must be high, medium, or low')
    validated_data['priority'] = priority
    
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

def validate_recurring_todo_template_data(data: Optional[Dict[str, Any]], for_update: bool = False) -> Tuple[Optional[Dict[str, Any]], Optional[Tuple[Response, int]]]:
    """Validate recurring todo template data, return (validated_data, error) tuple"""
    if not data:
        return None, error_response('No data provided')
    
    if not for_update and 'description' not in data:
        return None, error_response('Description is required')
    
    validated_data = data.copy()
    
    # Validate description
    if 'description' in data:
        description = data['description'].strip()
        if not description:
            return None, error_response('Description cannot be empty')
        validated_data['description'] = description
    
    # Validate recurrence pattern
    if 'recurrence_pattern' in data:
        if not isinstance(data['recurrence_pattern'], dict):
            return None, error_response('Recurrence pattern must be a valid object')
        
        try:
            # Test that we can create a RecurrencePattern from the data
            RecurrencePattern.from_dict(data['recurrence_pattern'])
            validated_data['recurrence_pattern'] = data['recurrence_pattern']
        except (ValueError, KeyError, TypeError) as e:
            return None, error_response(f'Invalid recurrence pattern: {str(e)}')
    elif not for_update:
        return None, error_response('Recurrence pattern is required')
    
    # Handle category validation
    category_id = data.get('category_id')
    if category_id and not Category.query.get(category_id):
        return None, error_response('Invalid category')
    
    # Handle priority validation
    priority = data.get('priority', 'low')
    if priority not in ['high', 'medium', 'low']:
        return None, error_response('Priority must be high, medium, or low')
    validated_data['priority'] = priority
    
    # Validate boolean fields
    if 'is_active' in data:
        validated_data['is_active'] = bool(data['is_active'])
    
    return validated_data, None

class Todo(Base):
    __tablename__ = 'todo'
    
    id = Column(Integer, primary_key=True)
    description = Column(String(200), nullable=False)
    completed = Column(Boolean, default=False, nullable=False)
    deadline = Column(DateTime, nullable=True)
    category_id = Column(Integer, ForeignKey('category.id'), nullable=True)
    priority = Column(String(10), default='low', nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Recurring todo template reference
    recurring_template_id = Column(Integer, ForeignKey('recurring_todo_template.id'), nullable=True)

    # Relationships
    category = relationship("Category", back_populates="todos")
    recurring_template = relationship("RecurringTodoTemplate", back_populates="instances")

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'description': self.description,
            'completed': self.completed,
            'deadline': self.deadline.isoformat() if self.deadline else None,
            'category_id': self.category_id,
            'category': self.category.to_dict() if self.category else None,
            'priority': self.priority,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'recurring_template_id': self.recurring_template_id,
            'is_recurring_instance': self.recurring_template_id is not None
        }
    
    @classmethod
    def create_from_data(cls, data: Dict[str, Any]) -> 'Todo':
        """Create todo from validated data"""
        return cls(
            description=data['description'],
            deadline=data.get('deadline'),
            category_id=data.get('category_id'),
            priority=data.get('priority', 'low')
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
        if 'priority' in data:
            self.priority = data['priority']
        self.updated_at = datetime.utcnow()
    
    def get_urgency_score(self) -> float:
        """Calculate urgency score for sorting todos"""
        now = datetime.utcnow()
        score = 0.0
        
        # Base priority scores
        priority_scores = {'high': 100, 'medium': 50, 'low': 10}
        score += priority_scores.get(self.priority, 10)
        
        # Deadline urgency (higher score = more urgent)
        if self.deadline:
            time_diff = (self.deadline - now).total_seconds()
            hours_until_due = time_diff / 3600
            
            if hours_until_due <= 0:  # Overdue
                score += 1000 + abs(hours_until_due)  # More overdue = higher score
            elif hours_until_due <= 24:  # Due within 24 hours
                score += 500 - hours_until_due * 10  # Closer deadline = higher score
            elif hours_until_due <= 168:  # Due within a week
                score += 200 - hours_until_due
            else:  # Due later
                score += max(0, 100 - hours_until_due / 24)
        else:
            # No deadline gets a small boost to avoid being buried
            score += 5
        
        return score

    @classmethod
    def get_sorted_todos(cls, category_filter: Optional[int] = None, 
                        completion_filter: Optional[str] = None) -> List['Todo']:
        """Get todos sorted by urgency score"""
        query = cls.query
        
        # Apply filters
        if category_filter:
            query = query.filter_by(category_id=category_filter)
        
        if completion_filter == 'active':
            query = query.filter_by(completed=False)
        elif completion_filter == 'completed':
            query = query.filter_by(completed=True)
        
        todos = query.all()
        
        # Sort by urgency score (descending) and then by creation date (newest first)
        todos.sort(key=lambda todo: (-todo.get_urgency_score(), -todo.id))
        
        return todos

class RecurringTodoTemplate(Base):
    __tablename__ = 'recurring_todo_template'
    
    id = Column(Integer, primary_key=True)
    description = Column(String(200), nullable=False)
    recurrence_pattern_json = Column(Text, nullable=False)  # JSON-serialized RecurrencePattern
    category_id = Column(Integer, ForeignKey('category.id'), nullable=True)
    priority = Column(String(10), default='low', nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    last_generated = Column(DateTime, nullable=True)  # Last time instances were generated
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    category = relationship("Category", back_populates="recurring_templates")
    instances = relationship("Todo", back_populates="recurring_template", cascade="all, delete-orphan")

    @property
    def recurrence_pattern(self) -> RecurrencePattern:
        """Get the RecurrencePattern object from JSON"""
        return RecurrencePattern.from_dict(json.loads(self.recurrence_pattern_json))

    @recurrence_pattern.setter
    def recurrence_pattern(self, pattern: RecurrencePattern) -> None:
        """Set the RecurrencePattern object as JSON"""
        self.recurrence_pattern_json = json.dumps(pattern.to_dict())

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'description': self.description,
            'recurrence_pattern': json.loads(self.recurrence_pattern_json),
            'category_id': self.category_id,
            'category': self.category.to_dict() if self.category else None,
            'priority': self.priority,
            'is_active': self.is_active,
            'last_generated': self.last_generated.isoformat() if self.last_generated else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'instance_count': len(self.instances) if self.instances else 0
        }

    @classmethod
    def create_from_data(cls, data: Dict[str, Any]) -> 'RecurringTodoTemplate':
        """Create recurring todo template from validated data"""
        template = cls(
            description=data['description'],
            category_id=data.get('category_id'),
            priority=data.get('priority', 'low'),
            is_active=data.get('is_active', True)
        )
        # Set recurrence pattern using the property setter
        template.recurrence_pattern = RecurrencePattern.from_dict(data['recurrence_pattern'])
        return template

    def update_from_data(self, data: Dict[str, Any]) -> None:
        """Update recurring todo template from data"""
        if 'description' in data:
            self.description = data['description']
        if 'category_id' in data:
            self.category_id = data['category_id']
        if 'priority' in data:
            self.priority = data['priority']
        if 'is_active' in data:
            self.is_active = data['is_active']
        if 'recurrence_pattern' in data:
            self.recurrence_pattern = RecurrencePattern.from_dict(data['recurrence_pattern'])
        self.updated_at = datetime.utcnow()

    def get_next_occurrence(self, after_date: Optional[datetime] = None) -> Optional[datetime]:
        """Get the next occurrence after the given date"""
        if not self.is_active:
            return None
        
        if after_date is None:
            after_date = datetime.utcnow()
        
        calculator = RecurrenceCalculator()
        return calculator.get_next_occurrence(self.recurrence_pattern, after_date)

    def get_upcoming_occurrences(self, days_ahead: int = 30, max_count: int = 10) -> List[datetime]:
        """Get upcoming occurrences for this template"""
        if not self.is_active:
            return []
        
        start_date = datetime.utcnow()
        end_date = start_date + timedelta(days=days_ahead)
        
        calculator = RecurrenceCalculator()
        return calculator.get_occurrences_in_range(
            self.recurrence_pattern,
            start_date,
            end_date,
            max_count
        )

    def should_generate_instances(self, current_time: Optional[datetime] = None) -> bool:
        """Check if new instances should be generated"""
        if not self.is_active:
            return False
        
        if current_time is None:
            current_time = datetime.utcnow()
        
        next_occurrence = self.get_next_occurrence(self.last_generated or datetime.min)
        return next_occurrence is not None and next_occurrence <= current_time

    def generate_todo_instance(self, occurrence_time: datetime, db_session) -> Optional['Todo']:
        """Generate a new todo instance for the given occurrence time"""
        if not self.is_active:
            return None
        
        # Create new todo instance with the occurrence time as the deadline
        todo = Todo(
            description=self.description,
            category_id=self.category_id,
            priority=self.priority,
            recurring_template_id=self.id,
            deadline=occurrence_time
        )
        
        db_session.add(todo)
        return todo

class Category(Base):
    __tablename__ = 'category'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False, unique=True)
    color = Column(String(7), nullable=False, default='#3498db')  # Hex color code
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    todos = relationship('Todo', back_populates='category')
    recurring_templates = relationship('RecurringTodoTemplate', back_populates='category')
    
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

def generate_due_recurring_todos(db_session) -> List[Todo]:
    """
    Generate todo instances from recurring templates that are due.
    This function can be called periodically or on-demand.
    """
    current_time = datetime.utcnow()
    active_templates = RecurringTodoTemplate.query.filter_by(is_active=True).all()
    
    generated_todos = []
    
    for template in active_templates:
        if template.should_generate_instances(current_time):
            # Get the next occurrence that should be generated
            next_occurrence = template.get_next_occurrence(template.last_generated or datetime.min)
            
            while next_occurrence and next_occurrence <= current_time:
                # Check if we already have a todo for this occurrence
                existing = Todo.query.filter_by(
                    recurring_template_id=template.id,
                    deadline=next_occurrence
                ).first()
                
                if not existing:
                    todo = template.generate_todo_instance(next_occurrence, db_session)
                    if todo:
                        generated_todos.append(todo)
                
                # Update last_generated timestamp
                template.last_generated = next_occurrence
                
                # Get next occurrence after this one
                next_occurrence = template.get_next_occurrence(next_occurrence)
                
                # Safety check to prevent infinite loops
                if not next_occurrence or len(generated_todos) > 1000:
                    break
    
    if generated_todos:
        db_session.commit()
    
    return generated_todos


class KeyValue(Base):
    """Model for storing arbitrary key-value pairs"""
    __tablename__ = 'key_value_store'
    
    id = Column(Integer, primary_key=True)
    key = Column(String(255), nullable=False, unique=True, index=True)
    value = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert KeyValue to dictionary"""
        return {
            'id': self.id,
            'key': self.key,
            'value': self.value,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    @classmethod
    def create_from_data(cls, key: str, value: str) -> 'KeyValue':
        """Create a new KeyValue instance from data"""
        return cls(key=key, value=value)
    
    @classmethod
    def get_by_key(cls, key: str) -> Optional['KeyValue']:
        """Get a KeyValue by key"""
        return cls.query.filter_by(key=key).first()
    
    @classmethod
    def set_value(cls, key: str, value: str, db_session) -> 'KeyValue':
        """Set a key-value pair (upsert operation)"""
        existing = cls.get_by_key(key)
        if existing:
            existing.value = value
            existing.updated_at = datetime.utcnow()
            return existing
        else:
            new_kv = cls.create_from_data(key, value)
            db_session.add(new_kv)
            return new_kv


def validate_key_value_data(data: Optional[Dict[str, Any]], for_update: bool = False) -> Tuple[Optional[Dict[str, Any]], Optional[Tuple[Response, int]]]:
    """Validate key-value data, return (validated_data, error) tuple"""
    if not data:
        return None, error_response('No data provided')
    
    if not for_update and 'key' not in data:
        return None, error_response('Key is required')
    
    if 'key' in data and not isinstance(data['key'], str):
        return None, error_response('Key must be a string')
    
    if 'key' in data and len(data['key'].strip()) == 0:
        return None, error_response('Key cannot be empty')
    
    if 'value' in data and data['value'] is not None and not isinstance(data['value'], str):
        return None, error_response('Value must be a string or null')
    
    validated_data = data.copy()
    
    # Trim whitespace from key
    if 'key' in validated_data:
        validated_data['key'] = validated_data['key'].strip()
    
    return validated_data, None