"""
Integration examples for the Recurrence Library with the Nexodo Todo system.

This file demonstrates how to extend the Todo model to support recurring todos
and provides utility functions for managing recurring tasks.
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from .recurrence import (
    RecurrencePattern, RecurrenceCalculator, RecurrenceType,
    every_day, every_n_days, weekdays_only, specific_weekdays,
    monthly_on_date, first_weekday_of_month, yearly_on_date
)
from .models import Todo, Category


class RecurringTodo:
    """
    Extension class that adds recurrence functionality to todos.
    This could be integrated into the existing Todo model or used as a wrapper.
    """
    
    def __init__(self, todo: Todo, recurrence_pattern: RecurrencePattern, last_generated: Optional[datetime] = None):
        self.todo = todo
        self.recurrence_pattern = recurrence_pattern
        self.last_generated = last_generated or datetime.utcnow()
        self.calculator = RecurrenceCalculator()
    
    def get_next_occurrence(self, after_date: Optional[datetime] = None) -> Optional[datetime]:
        """Get the next occurrence of this recurring todo"""
        if after_date is None:
            after_date = datetime.utcnow()
        
        return self.calculator.get_next_occurrence(self.recurrence_pattern, after_date)
    
    def should_generate_new_instance(self, current_time: Optional[datetime] = None) -> bool:
        """Check if a new instance of this recurring todo should be generated"""
        if current_time is None:
            current_time = datetime.utcnow()
        
        next_occurrence = self.get_next_occurrence(self.last_generated)
        return next_occurrence and next_occurrence <= current_time
    
    def generate_next_todo_instance(self, db_session) -> Optional[Todo]:
        """Generate the next instance of this recurring todo"""
        if not self.should_generate_new_instance():
            return None
        
        next_occurrence = self.get_next_occurrence(self.last_generated)
        if not next_occurrence:
            return None
        
        # Create new todo instance with the same properties but new deadline
        new_todo = Todo(
            description=self.todo.description,
            deadline=next_occurrence,
            category_id=self.todo.category_id,
            priority=self.todo.priority
        )
        
        db_session.add(new_todo)
        self.last_generated = next_occurrence
        
        return new_todo
    
    def get_upcoming_occurrences(self, days_ahead: int = 30, max_count: int = 10) -> List[datetime]:
        """Get upcoming occurrences for this recurring todo"""
        start_date = datetime.utcnow()
        end_date = start_date + timedelta(days=days_ahead)
        
        return self.calculator.get_occurrences_in_range(
            self.recurrence_pattern,
            start_date,
            end_date,
            max_count
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses"""
        return {
            'todo': self.todo.to_dict(),
            'recurrence_pattern': self.recurrence_pattern.to_dict(),
            'last_generated': self.last_generated.isoformat(),
            'next_occurrence': self.get_next_occurrence().isoformat() if self.get_next_occurrence() else None,
            'upcoming_occurrences': [occ.isoformat() for occ in self.get_upcoming_occurrences()]
        }


class RecurrenceManager:
    """Manager class for handling recurring todos"""
    
    def __init__(self, db_session):
        self.db_session = db_session
        self.recurring_todos: List[RecurringTodo] = []
    
    def add_recurring_todo(self, todo: Todo, recurrence_pattern: RecurrencePattern) -> RecurringTodo:
        """Add a new recurring todo"""
        recurring_todo = RecurringTodo(todo, recurrence_pattern)
        self.recurring_todos.append(recurring_todo)
        return recurring_todo
    
    def generate_due_todos(self, current_time: Optional[datetime] = None) -> List[Todo]:
        """Generate all due todo instances from recurring patterns"""
        if current_time is None:
            current_time = datetime.utcnow()
        
        generated_todos = []
        
        for recurring_todo in self.recurring_todos:
            if recurring_todo.should_generate_new_instance(current_time):
                new_todo = recurring_todo.generate_next_todo_instance(self.db_session)
                if new_todo:
                    generated_todos.append(new_todo)
        
        if generated_todos:
            self.db_session.commit()
        
        return generated_todos
    
    def get_upcoming_schedule(self, days_ahead: int = 7) -> Dict[str, List[Dict[str, Any]]]:
        """Get upcoming schedule for all recurring todos"""
        schedule = {}
        
        for recurring_todo in self.recurring_todos:
            occurrences = recurring_todo.get_upcoming_occurrences(days_ahead)
            
            for occurrence in occurrences:
                date_key = occurrence.strftime('%Y-%m-%d')
                if date_key not in schedule:
                    schedule[date_key] = []
                
                schedule[date_key].append({
                    'description': recurring_todo.todo.description,
                    'time': occurrence.strftime('%H:%M'),
                    'priority': recurring_todo.todo.priority,
                    'category': recurring_todo.todo.category.name if recurring_todo.todo.category else None
                })
        
        return schedule


# Example usage and common patterns
def create_common_recurring_patterns():
    """Examples of common recurring todo patterns"""
    
    examples = {
        # Daily routines
        'morning_routine': {
            'pattern': every_day(["07:00"]),
            'description': 'Morning routine',
            'priority': 'medium'
        },
        
        'take_vitamins': {
            'pattern': every_day(["08:00", "20:00"]),
            'description': 'Take vitamins',
            'priority': 'low'
        },
        
        'workout': {
            'pattern': every_n_days(2, ["18:00"]),
            'description': 'Workout at gym',
            'priority': 'medium'
        },
        
        # Weekly routines
        'grocery_shopping': {
            'pattern': specific_weekdays([6], ["10:00"]),  # Sunday at 10am
            'description': 'Grocery shopping',
            'priority': 'medium'
        },
        
        'team_meeting': {
            'pattern': specific_weekdays([0], ["09:00"]),  # Monday at 9am
            'description': 'Weekly team meeting',
            'priority': 'high'
        },
        
        'laundry': {
            'pattern': specific_weekdays([0, 4]),  # Monday and Friday
            'description': 'Do laundry',
            'priority': 'low'
        },
        
        # Monthly routines
        'pay_rent': {
            'pattern': monthly_on_date(1, ["09:00"]),
            'description': 'Pay monthly rent',
            'priority': 'high'
        },
        
        'car_maintenance': {
            'pattern': first_weekday_of_month(5, ["14:00"]),  # First Saturday at 2pm
            'description': 'Car maintenance check',
            'priority': 'medium'
        },
        
        # Yearly routines
        'birthday_reminder': {
            'pattern': yearly_on_date(3, 15, ["09:00"]),  # March 15th at 9am
            'description': 'Celebrate birthday!',
            'priority': 'high'
        },
        
        'tax_filing': {
            'pattern': yearly_on_date(4, 1, ["10:00"]),  # April 1st at 10am
            'description': 'Prepare and file taxes',
            'priority': 'high'
        }
    }
    
    return examples


def setup_demo_recurring_todos(db_session, category_manager=None):
    """Set up some demo recurring todos for testing"""
    
    # Create categories if they don't exist
    personal_category = Category.query.filter_by(name='Personal').first()
    work_category = Category.query.filter_by(name='Work').first()
    health_category = Category.query.filter_by(name='Health').first()
    
    if not health_category:
        health_category = Category(name='Health', color='#27ae60')
        db_session.add(health_category)
    
    # Create base todos (these would be templates)
    demo_todos = [
        {
            'description': 'Take morning vitamins',
            'category': health_category,
            'priority': 'medium',
            'pattern': every_day(["08:00"])
        },
        {
            'description': 'Weekly team standup',
            'category': work_category,
            'priority': 'high',
            'pattern': specific_weekdays([0], ["09:30"])  # Monday 9:30am
        },
        {
            'description': 'Grocery shopping',
            'category': personal_category,
            'priority': 'medium',
            'pattern': specific_weekdays([6], ["10:00"])  # Sunday 10am
        },
        {
            'description': 'Pay monthly bills',
            'category': personal_category,
            'priority': 'high',
            'pattern': monthly_on_date(1, ["09:00"])  # 1st of month at 9am
        }
    ]
    
    manager = RecurrenceManager(db_session)
    
    for todo_data in demo_todos:
        # Create the base todo
        todo = Todo(
            description=todo_data['description'],
            category=todo_data['category'],
            priority=todo_data['priority']
        )
        db_session.add(todo)
        
        # Add to recurrence manager
        manager.add_recurring_todo(todo, todo_data['pattern'])
    
    db_session.commit()
    return manager


# Utility functions for API integration
def validate_recurrence_pattern_data(data: Dict[str, Any]) -> tuple[Optional[RecurrencePattern], Optional[str]]:
    """Validate recurrence pattern data from API request"""
    try:
        # Basic validation
        if 'recurrence_type' not in data:
            return None, 'recurrence_type is required'
        
        recurrence_type = RecurrenceType(data['recurrence_type'])
        
        # Create pattern based on type
        if recurrence_type == RecurrenceType.DAILY:
            interval = data.get('interval', 1)
            times_of_day = data.get('times_of_day', [])
            pattern = RecurrencePattern.daily(interval=interval, times_of_day=times_of_day)
            
        elif recurrence_type == RecurrenceType.WEEKLY:
            weekdays = data.get('weekdays', [])
            if not weekdays:
                return None, 'weekdays are required for weekly recurrence'
            interval = data.get('interval', 1)
            times_of_day = data.get('times_of_day', [])
            pattern = RecurrencePattern.weekly(weekdays, interval=interval, times_of_day=times_of_day)
            
        elif recurrence_type == RecurrenceType.MONTHLY:
            monthly_type = data.get('monthly_type', 'day_of_month')
            interval = data.get('interval', 1)
            times_of_day = data.get('times_of_day', [])
            
            if monthly_type == 'day_of_month':
                day_of_month = data.get('day_of_month')
                if not day_of_month:
                    return None, 'day_of_month is required for monthly recurrence'
                pattern = RecurrencePattern.monthly_by_date(day_of_month, interval=interval, times_of_day=times_of_day)
            else:
                weekday = data.get('weekday')
                week_of_month = data.get('week_of_month')
                if weekday is None or week_of_month is None:
                    return None, 'weekday and week_of_month are required for weekday-based monthly recurrence'
                pattern = RecurrencePattern.monthly_by_weekday(weekday, week_of_month, interval=interval, times_of_day=times_of_day)
                
        elif recurrence_type == RecurrenceType.YEARLY:
            month_of_year = data.get('month_of_year')
            day_of_month = data.get('day_of_month')
            if not month_of_year or not day_of_month:
                return None, 'month_of_year and day_of_month are required for yearly recurrence'
            interval = data.get('interval', 1)
            times_of_day = data.get('times_of_day', [])
            pattern = RecurrencePattern.yearly(month_of_year, day_of_month, interval=interval, times_of_day=times_of_day)
            
        else:
            return None, f'Unsupported recurrence type: {recurrence_type}'
        
        return pattern, None
        
    except ValueError as e:
        return None, str(e)
    except Exception as e:
        return None, f'Invalid recurrence pattern: {str(e)}'


# Example API endpoint handlers (these would go in app.py)
def create_recurring_todo_example(request_data, db_session):
    """Example of how to create a recurring todo via API"""
    
    # Validate basic todo data
    from .models import validate_todo_data
    todo_data, error = validate_todo_data(request_data)
    if error:
        return error
    
    # Validate recurrence pattern
    pattern_data = request_data.get('recurrence_pattern')
    if not pattern_data:
        return None, 'recurrence_pattern is required for recurring todos'
    
    pattern, pattern_error = validate_recurrence_pattern_data(pattern_data)
    if pattern_error:
        return None, pattern_error
    
    # Create the base todo
    todo = Todo.create_from_data(todo_data)
    db_session.add(todo)
    
    # Create recurring todo wrapper
    recurring_todo = RecurringTodo(todo, pattern)
    
    # You would typically save the recurrence info to a database table here
    # For now, we'll just return the structure
    
    db_session.commit()
    
    return {
        'todo': todo.to_dict(),
        'recurrence_pattern': pattern.to_dict(),
        'next_occurrence': recurring_todo.get_next_occurrence().isoformat() if recurring_todo.get_next_occurrence() else None
    }, None


if __name__ == "__main__":
    # Test the integration examples
    print("=== Recurring Todo Integration Examples ===")
    
    # Show common patterns
    patterns = create_common_recurring_patterns()
    
    for name, config in patterns.items():
        pattern = config['pattern']
        calc = RecurrenceCalculator()
        next_occ = calc.get_next_occurrence(pattern, datetime.now())
        
        print(f"{name}: {config['description']}")
        print(f"  Next occurrence: {next_occ}")
        print(f"  Priority: {config['priority']}")
        print()
    
    # Test pattern validation
    print("=== Testing Pattern Validation ===")
    
    test_patterns = [
        {
            'recurrence_type': 'daily',
            'interval': 1,
            'times_of_day': ['08:00', '20:00']
        },
        {
            'recurrence_type': 'weekly',
            'weekdays': [0, 2, 4],  # Mon, Wed, Fri
            'times_of_day': ['18:00']
        },
        {
            'recurrence_type': 'monthly',
            'monthly_type': 'day_of_month',
            'day_of_month': 15
        },
        {
            'recurrence_type': 'yearly',
            'month_of_year': 12,
            'day_of_month': 25,
            'times_of_day': ['09:00']
        }
    ]
    
    for i, test_data in enumerate(test_patterns):
        pattern, error = validate_recurrence_pattern_data(test_data)
        if error:
            print(f"Pattern {i+1}: ERROR - {error}")
        else:
            calc = RecurrenceCalculator()
            next_occ = calc.get_next_occurrence(pattern, datetime.now())
            print(f"Pattern {i+1}: Valid - Next: {next_occ}")