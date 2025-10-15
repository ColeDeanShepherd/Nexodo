# Recurrence Library Documentation

This library provides comprehensive support for recurring patterns in the Nexodo application. It can handle various types of recurrences including daily, weekly, monthly, and yearly patterns.

## Quick Start

```python
from server.recurrence import (
    RecurrencePattern, RecurrenceCalculator,
    every_day, specific_weekdays, monthly_on_date, yearly_on_date
)
from datetime import datetime

# Create a daily pattern (taking vitamins at 8am and 8pm)
vitamins_pattern = every_day(["08:00", "20:00"])

# Create a weekly pattern (gym on Mon/Wed/Fri at 6pm)
gym_pattern = specific_weekdays([0, 2, 4], ["18:00"])

# Create a monthly pattern (rent due on 1st of each month)
rent_pattern = monthly_on_date(1, ["09:00"])

# Create a yearly pattern (birthday on March 15th)
birthday_pattern = yearly_on_date(3, 15, ["00:00"])

# Calculate next occurrence
calculator = RecurrenceCalculator()
next_vitamin_time = calculator.get_next_occurrence(vitamins_pattern, datetime.now())
print(f"Next vitamin dose: {next_vitamin_time}")
```

## Core Classes

### RecurrencePattern

The main class for defining recurrence patterns. Can be created directly or using convenience functions.

#### Constructor Parameters:
- `recurrence_type`: RecurrenceType enum (DAILY, WEEKLY, MONTHLY, YEARLY)
- `interval`: How often to repeat (e.g., every 2 days, every 3 months)
- `weekdays`: List of weekdays (0=Monday, 6=Sunday) for weekly patterns
- `times_of_day`: List of times in "HH:MM" format
- `day_of_month`: Day of month (1-31) for monthly/yearly patterns
- `month_of_year`: Month (1-12) for yearly patterns
- `monthly_type`: MonthlyType enum for different monthly calculation methods
- `weekday`: Specific weekday for monthly weekday patterns
- `week_of_month`: Which week of the month (1=first, -1=last)
- `end_date`: Optional end date for the recurrence
- `max_occurrences`: Optional maximum number of occurrences

### RecurrenceCalculator

Used to calculate next occurrences and generate occurrence lists.

#### Methods:
- `get_next_occurrence(pattern, after_date)`: Get next single occurrence
- `get_occurrences_in_range(pattern, start_date, end_date, max_count)`: Get all occurrences in range

## Pattern Types and Examples

### Daily Patterns

```python
# Every day
every_day()

# Every day at specific times
every_day(["08:00", "20:00"])

# Every N days
every_n_days(2)  # Every other day
every_n_days(3, ["12:00"])  # Every 3 days at noon

# Weekdays only (Mon-Fri)
weekdays_only()
weekdays_only(["09:00", "17:00"])  # Work hours
```

### Weekly Patterns

```python
# Specific days of the week
specific_weekdays([0, 2, 4])  # Mon, Wed, Fri
specific_weekdays([1, 3], ["14:00"])  # Tue, Thu at 2pm

# Every N weeks
RecurrencePattern.weekly([0], interval=2)  # Every other Monday

# Weekends only
weekends_only()  # Saturday and Sunday
```

### Monthly Patterns

```python
# Specific date each month
monthly_on_date(15)  # 15th of every month
monthly_on_date(1, ["09:00"])  # 1st of every month at 9am

# Every N months
every_n_months_on_date(3, 15)  # Every 3 months on the 15th

# Specific weekday of month
first_weekday_of_month(0)  # First Monday of each month
last_weekday_of_month(4)   # Last Friday of each month

# Advanced monthly patterns
RecurrencePattern.monthly_by_weekday(
    weekday=0,        # Monday
    week_of_month=2,  # Second Monday
    times_of_day=["10:00"]
)
```

### Yearly Patterns

```python
# Specific date each year
yearly_on_date(12, 25)  # December 25th (Christmas)
yearly_on_date(4, 15, ["09:00"])  # April 15th at 9am (US taxes)

# Every N years
every_n_years(5, 7, 4)  # Every 5 years on July 4th
```

## Advanced Features

### End Dates and Limits

```python
# Pattern ends on a specific date
pattern = RecurrencePattern.daily()
pattern.end_date = datetime(2025, 12, 31)

# Pattern has maximum occurrences
pattern = RecurrencePattern.weekly([0])
pattern.max_occurrences = 10  # Only 10 occurrences total
```

### Complex Monthly Patterns

```python
# Last day of every month
pattern = RecurrencePattern(
    RecurrenceType.MONTHLY,
    monthly_type=MonthlyType.LAST_DAY
)

# Second Tuesday of every month
pattern = RecurrencePattern.monthly_by_weekday(
    weekday=1,        # Tuesday
    week_of_month=2   # Second occurrence
)

# Last Friday of every month
pattern = RecurrencePattern.monthly_by_weekday(
    weekday=4,         # Friday
    week_of_month=-1   # Last occurrence
)
```

## Integration with Todo System

### Using RecurringTodo Class

```python
from server.recurrence_integration import RecurringTodo, RecurrenceManager

# Create a recurring todo
todo = Todo(description="Take vitamins", priority="medium")
pattern = every_day(["08:00", "20:00"])
recurring_todo = RecurringTodo(todo, pattern)

# Check if new instance should be generated
if recurring_todo.should_generate_new_instance():
    new_todo = recurring_todo.generate_next_todo_instance(db.session)

# Get upcoming occurrences
upcoming = recurring_todo.get_upcoming_occurrences(days_ahead=7)
```

### Using RecurrenceManager

```python
# Create manager
manager = RecurrenceManager(db.session)

# Add recurring todos
manager.add_recurring_todo(todo, pattern)

# Generate all due todos
due_todos = manager.generate_due_todos()

# Get upcoming schedule
schedule = manager.get_upcoming_schedule(days_ahead=7)
```

## API Integration

### Creating Recurring Todos via API

Example request body:
```json
{
    "description": "Take vitamins",
    "priority": "medium",
    "category_id": 1,
    "recurrence_pattern": {
        "recurrence_type": "daily",
        "interval": 1,
        "times_of_day": ["08:00", "20:00"]
    }
}
```

### Weekly Pattern Example:
```json
{
    "description": "Team meeting",
    "priority": "high",
    "recurrence_pattern": {
        "recurrence_type": "weekly",
        "weekdays": [0],
        "times_of_day": ["09:30"]
    }
}
```

### Monthly Pattern Example:
```json
{
    "description": "Pay rent",
    "priority": "high",
    "recurrence_pattern": {
        "recurrence_type": "monthly",
        "monthly_type": "day_of_month",
        "day_of_month": 1,
        "times_of_day": ["09:00"]
    }
}
```

## Common Use Cases

### Personal Habits
- **Daily routine**: `every_day(["07:00"])`
- **Vitamins/medication**: `every_day(["08:00", "20:00"])`
- **Exercise**: `specific_weekdays([0, 2, 4], ["18:00"])`
- **Meal prep**: `weekends_only(["10:00"])`

### Work Tasks
- **Team meetings**: `specific_weekdays([0], ["09:30"])`
- **Weekly reports**: `specific_weekdays([4], ["16:00"])`
- **Monthly planning**: `first_weekday_of_month(0, ["10:00"])`
- **Quarterly reviews**: `every_n_months_on_date(3, 1)`

### Financial Tasks
- **Pay bills**: `monthly_on_date(1, ["09:00"])`
- **Investment review**: `monthly_on_date(15)`
- **Tax preparation**: `yearly_on_date(3, 1)`
- **Insurance renewal**: `yearly_on_date(1, 1)`

### Maintenance Tasks
- **Car maintenance**: `every_n_months_on_date(3, 1)`
- **Home cleaning**: `weekends_only(["10:00"])`
- **System backups**: `every_day(["02:00"])`
- **Equipment inspection**: `first_weekday_of_month(0)`

## Error Handling

The library includes validation for all pattern parameters:

```python
try:
    pattern = RecurrencePattern.daily(interval=0)  # Invalid
except ValueError as e:
    print(f"Invalid pattern: {e}")

# API validation
pattern, error = validate_recurrence_pattern_data({
    "recurrence_type": "invalid_type"
})
if error:
    print(f"Validation error: {error}")
```

## Performance Considerations

- The library is optimized for calculating next occurrences quickly
- For generating many occurrences, use the `max_count` parameter to limit results
- Complex monthly patterns (like "last Friday") may take slightly longer to calculate
- Consider caching next occurrence calculations for frequently accessed patterns

## Future Enhancements

Possible additions to the library:
- Timezone support for global applications
- Holiday exclusions (e.g., skip weekends and holidays)
- Flexible time ranges (e.g., "between 9am and 5pm")
- Natural language parsing ("every weekday at 9am")
- Recurrence pattern templates/presets