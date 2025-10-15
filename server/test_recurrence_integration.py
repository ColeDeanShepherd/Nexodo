"""
Standalone test for the recurrence library integration
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from recurrence import (
    RecurrencePattern, RecurrenceCalculator, RecurrenceType,
    every_day, every_n_days, weekdays_only, specific_weekdays,
    monthly_on_date, first_weekday_of_month, yearly_on_date
)


def test_integration_examples():
    """Test the integration examples"""
    
    print("=== Recurring Todo Integration Examples ===")
    
    # Common patterns
    patterns = {
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
    
    for name, config in patterns.items():
        pattern = config['pattern']
        calc = RecurrenceCalculator()
        next_occ = calc.get_next_occurrence(pattern, datetime.now())
        
        print(f"{name}: {config['description']}")
        print(f"  Next occurrence: {next_occ}")
        print(f"  Priority: {config['priority']}")
        print()


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


def test_pattern_validation():
    """Test pattern validation"""
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


if __name__ == "__main__":
    test_integration_examples()
    test_pattern_validation()