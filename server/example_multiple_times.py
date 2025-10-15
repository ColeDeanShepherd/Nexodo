"""
Example: Every day at 9am AND 9pm
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timedelta
from recurrence import (
    RecurrencePattern, RecurrenceCalculator, every_day
)

# Method 1: Using the convenience function
brushing_teeth = every_day(["09:00", "21:00"])

# Method 2: Using RecurrencePattern directly
brushing_teeth_alt = RecurrencePattern.daily(times_of_day=["09:00", "21:00"])

# Method 3: Using the constructor directly
from recurrence import RecurrenceType
brushing_teeth_manual = RecurrencePattern(
    recurrence_type=RecurrenceType.DAILY,
    interval=1,
    times_of_day=["09:00", "21:00"]
)

# Test all three methods
calc = RecurrenceCalculator()
now = datetime.now()

print("=== Every day at 9am AND 9pm ===")
print(f"Current time: {now}")
print()

patterns = [
    ("Method 1 (convenience)", brushing_teeth),
    ("Method 2 (class method)", brushing_teeth_alt), 
    ("Method 3 (manual)", brushing_teeth_manual)
]

for name, pattern in patterns:
    print(f"{name}:")
    
    # Get next occurrence
    next_occ = calc.get_next_occurrence(pattern, now)
    print(f"  Next occurrence: {next_occ}")
    
    # Get next 5 occurrences to see the pattern
    occurrences = calc.get_occurrences_in_range(
        pattern, now, now + timedelta(days=3), max_count=5
    )
    print(f"  Next 5 occurrences:")
    for i, occ in enumerate(occurrences, 1):
        print(f"    {i}. {occ.strftime('%Y-%m-%d %H:%M')} ({occ.strftime('%A')})")
    print()

# Example with different times
print("=== Other examples with multiple times ===")

# Medication: 8am, 2pm, 8pm
medication = every_day(["08:00", "14:00", "20:00"])
next_med = calc.get_next_occurrence(medication, now)
print(f"Medication (8am, 2pm, 8pm): Next at {next_med}")

# Meals: 7am, 12pm, 6pm
meals = every_day(["07:00", "12:00", "18:00"])
next_meal = calc.get_next_occurrence(meals, now)
print(f"Meals (7am, 12pm, 6pm): Next at {next_meal}")

# Work breaks: 10:30am, 3:30pm
breaks = every_day(["10:30", "15:30"])
next_break = calc.get_next_occurrence(breaks, now)
print(f"Work breaks (10:30am, 3:30pm): Next at {next_break}")