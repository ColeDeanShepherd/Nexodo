"""
Tests for recurring todo template functionality
"""

import unittest
import sys
import os
import tempfile
import json
from datetime import datetime, timedelta
from unittest.mock import patch

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import models and functions for testing
from models import (
    RecurringTodoTemplate, Todo, Category,
    validate_recurring_todo_template_data, generate_due_recurring_todos
)
from recurrence import RecurrencePattern, RecurrenceType


class TestRecurringTodoTemplate(unittest.TestCase):
    """Test RecurringTodoTemplate model methods"""
    
    def test_recurrence_pattern_property(self):
        """Test recurrence pattern getter and setter"""
        pattern = RecurrencePattern.daily(times_of_day=["09:00"])
        
        template = RecurringTodoTemplate(
            description="Daily standup",
            priority="medium"
        )
        template.recurrence_pattern = pattern
        
        # Verify pattern was serialized and can be retrieved
        retrieved_pattern = template.recurrence_pattern
        self.assertEqual(retrieved_pattern.recurrence_type, RecurrenceType.DAILY)
        self.assertEqual(retrieved_pattern.times_of_day, ["09:00"])
    
    def test_template_to_dict(self):
        """Test template serialization"""
        pattern = RecurrencePattern.daily(times_of_day=["10:00"])
        
        template = RecurringTodoTemplate(
            description="Morning routine",
            priority="high"
        )
        template.recurrence_pattern = pattern
        template.id = 1  # Mock ID
        template.created_at = datetime(2023, 1, 1, 10, 0, 0)
        template.updated_at = datetime(2023, 1, 1, 10, 0, 0)
        
        template_dict = template.to_dict()
        
        self.assertEqual(template_dict['description'], "Morning routine")
        self.assertEqual(template_dict['priority'], "high")
        self.assertIn('recurrence_pattern', template_dict)
        self.assertEqual(template_dict['recurrence_pattern']['recurrence_type'], 'daily')
    
    def test_get_upcoming_occurrences(self):
        """Test getting upcoming occurrences"""
        pattern = RecurrencePattern.daily(times_of_day=["09:00", "21:00"])
        
        template = RecurringTodoTemplate(
            description="Medication",
            is_active=True
        )
        template.recurrence_pattern = pattern
        
        occurrences = template.get_upcoming_occurrences(days_ahead=3, max_count=5)
        
        self.assertGreater(len(occurrences), 0)
        self.assertLessEqual(len(occurrences), 5)
        
        # Check that occurrences are in the future
        now = datetime.utcnow()
        for occurrence in occurrences:
            self.assertGreater(occurrence, now)
    
    def test_should_generate_instances(self):
        """Test checking if instances should be generated"""
        pattern = RecurrencePattern.daily(times_of_day=["10:00"])
        
        template = RecurringTodoTemplate(
            description="Daily task",
            is_active=True
        )
        template.recurrence_pattern = pattern
        
        # Should generate instances if none have been generated
        self.assertTrue(template.should_generate_instances())
        
        # Should not generate instances if inactive
        template.is_active = False
        self.assertFalse(template.should_generate_instances())
        
        # Should generate instances if last generation was in the past
        template.is_active = True
        past_time = datetime.utcnow() - timedelta(days=2)
        template.last_generated = past_time
        
        self.assertTrue(template.should_generate_instances())
    
    def test_inactive_template_behavior(self):
        """Test that inactive templates don't generate occurrences"""
        pattern = RecurrencePattern.daily(times_of_day=["10:00"])
        
        template = RecurringTodoTemplate(
            description="Inactive task",
            is_active=False
        )
        template.recurrence_pattern = pattern
        
        # Should return empty list for inactive templates
        occurrences = template.get_upcoming_occurrences()
        self.assertEqual(len(occurrences), 0)
        
        # Should return None for next occurrence
        next_occurrence = template.get_next_occurrence()
        self.assertIsNone(next_occurrence)


class TestRecurringTodoValidation(unittest.TestCase):
    """Test validation functions for recurring todos"""
    
    def test_valid_template_data(self):
        """Test validation with valid template data"""
        data = {
            'description': 'Test recurring task',
            'recurrence_pattern': {
                'recurrence_type': 'daily',
                'interval': 1,
                'times_of_day': ['09:00']
            },
            'priority': 'medium',
            'is_active': True
        }
        
        validated_data, error = validate_recurring_todo_template_data(data)
        
        self.assertIsNone(error)
        self.assertIsNotNone(validated_data)
        self.assertEqual(validated_data['description'], 'Test recurring task')
        self.assertEqual(validated_data['priority'], 'medium')
    
    def test_valid_weekly_pattern(self):
        """Test validation with weekly recurrence pattern"""
        data = {
            'description': 'Weekly meeting',
            'recurrence_pattern': {
                'recurrence_type': 'weekly',
                'interval': 1,
                'weekdays': [0, 2, 4],  # Mon, Wed, Fri
                'times_of_day': ['14:00']
            },
            'priority': 'high'
        }
        
        validated_data, error = validate_recurring_todo_template_data(data)
        
        self.assertIsNone(error)
        self.assertIsNotNone(validated_data)
        self.assertEqual(validated_data['description'], 'Weekly meeting')
    
    def test_valid_monthly_pattern(self):
        """Test validation with monthly recurrence pattern"""
        data = {
            'description': 'Monthly report',
            'recurrence_pattern': {
                'recurrence_type': 'monthly',
                'interval': 1,
                'day_of_month': 1,
                'times_of_day': ['09:00']
            },
            'priority': 'medium'
        }
        
        validated_data, error = validate_recurring_todo_template_data(data)
        
        self.assertIsNone(error)
        self.assertIsNotNone(validated_data)
    
    def test_invalid_recurrence_pattern(self):
        """Test validation with invalid recurrence pattern"""
        data = {
            'description': 'Test task',
            'recurrence_pattern': {
                'recurrence_type': 'invalid_type',
                'interval': 1
            }
        }
        
        validated_data, error = validate_recurring_todo_template_data(data)
        
        self.assertIsNotNone(error)
        self.assertIsNone(validated_data)
    
    def test_missing_description(self):
        """Test validation with missing description"""
        data = {
            'recurrence_pattern': {
                'recurrence_type': 'daily',
                'interval': 1
            }
        }
        
        validated_data, error = validate_recurring_todo_template_data(data)
        
        self.assertIsNotNone(error)
        self.assertIsNone(validated_data)
    
    def test_invalid_priority(self):
        """Test validation with invalid priority"""
        data = {
            'description': 'Test task',
            'recurrence_pattern': {
                'recurrence_type': 'daily',
                'interval': 1
            },
            'priority': 'invalid_priority'
        }
        
        validated_data, error = validate_recurring_todo_template_data(data)
        
        self.assertIsNotNone(error)
        self.assertIsNone(validated_data)
    
    def test_empty_description(self):
        """Test validation with empty description"""
        data = {
            'description': '   ',  # Whitespace only
            'recurrence_pattern': {
                'recurrence_type': 'daily',
                'interval': 1
            }
        }
        
        validated_data, error = validate_recurring_todo_template_data(data)
        
        self.assertIsNotNone(error)
        self.assertIsNone(validated_data)
    
    def test_update_validation(self):
        """Test validation for updates (description not required)"""
        data = {
            'priority': 'high',
            'is_active': False
        }
        
        validated_data, error = validate_recurring_todo_template_data(data, for_update=True)
        
        self.assertIsNone(error)
        self.assertIsNotNone(validated_data)
        self.assertEqual(validated_data['priority'], 'high')
        self.assertFalse(validated_data['is_active'])


class TestRecurringTodoHelpers(unittest.TestCase):
    """Test helper functions for recurring todos"""
    
    def test_create_from_data(self):
        """Test creating template from validated data"""
        data = {
            'description': 'Test task',
            'recurrence_pattern': {
                'recurrence_type': 'daily',
                'interval': 2,
                'times_of_day': ['08:00', '20:00']
            },
            'priority': 'high',
            'is_active': True,
            'category_id': 1
        }
        
        template = RecurringTodoTemplate.create_from_data(data)
        
        self.assertEqual(template.description, 'Test task')
        self.assertEqual(template.priority, 'high')
        self.assertTrue(template.is_active)
        self.assertEqual(template.category_id, 1)
        
        # Verify recurrence pattern
        pattern = template.recurrence_pattern
        self.assertEqual(pattern.recurrence_type, RecurrenceType.DAILY)
        self.assertEqual(pattern.interval, 2)
        self.assertEqual(pattern.times_of_day, ['08:00', '20:00'])
    
    def test_update_from_data(self):
        """Test updating template from data"""
        # Create initial template
        template = RecurringTodoTemplate(
            description="Original task",
            priority="low",
            is_active=True
        )
        template.recurrence_pattern = RecurrencePattern.daily()
        
        # Update with new data
        update_data = {
            'description': 'Updated task',
            'priority': 'high',
            'is_active': False,
            'recurrence_pattern': {
                'recurrence_type': 'weekly',
                'interval': 1,
                'weekdays': [0, 2, 4],
                'times_of_day': ['09:00']
            }
        }
        
        template.update_from_data(update_data)
        
        self.assertEqual(template.description, 'Updated task')
        self.assertEqual(template.priority, 'high')
        self.assertFalse(template.is_active)
        
        # Verify recurrence pattern was updated
        pattern = template.recurrence_pattern
        self.assertEqual(pattern.recurrence_type, RecurrenceType.WEEKLY)
        self.assertEqual(pattern.weekdays, [0, 2, 4])


class TestRealWorldScenarios(unittest.TestCase):
    """Test real-world recurring todo scenarios"""
    
    def test_daily_medication_pattern(self):
        """Test daily medication reminder pattern"""
        data = {
            'description': 'Take medication',
            'recurrence_pattern': {
                'recurrence_type': 'daily',
                'interval': 1,
                'times_of_day': ['08:00', '20:00']
            },
            'priority': 'high'
        }
        
        template = RecurringTodoTemplate.create_from_data(data)
        
        # Get next few occurrences
        occurrences = template.get_upcoming_occurrences(days_ahead=2, max_count=4)
        
        # Should have 4 occurrences (2 times per day for 2 days)
        self.assertEqual(len(occurrences), 4)
        
        # Check times are correct
        for i, occurrence in enumerate(occurrences):
            if i % 2 == 0:  # Even indexes should be 8:00
                self.assertEqual(occurrence.hour, 8)
            else:  # Odd indexes should be 20:00
                self.assertEqual(occurrence.hour, 20)
    
    def test_weekly_workout_pattern(self):
        """Test weekly workout pattern"""
        data = {
            'description': 'Gym workout',
            'recurrence_pattern': {
                'recurrence_type': 'weekly',
                'interval': 1,
                'weekdays': [0, 2, 4],  # Monday, Wednesday, Friday
                'times_of_day': ['18:00']
            },
            'priority': 'medium'
        }
        
        template = RecurringTodoTemplate.create_from_data(data)
        
        # Get next week's occurrences
        occurrences = template.get_upcoming_occurrences(days_ahead=7, max_count=5)
        
        # Should have at least 3 occurrences in a week
        self.assertGreaterEqual(len(occurrences), 3)
        
        # All should be at 18:00
        for occurrence in occurrences:
            self.assertEqual(occurrence.hour, 18)
            self.assertEqual(occurrence.minute, 0)
    
    def test_monthly_bill_pattern(self):
        """Test monthly bill reminder pattern"""
        data = {
            'description': 'Pay rent',
            'recurrence_pattern': {
                'recurrence_type': 'monthly',
                'interval': 1,
                'day_of_month': 1,
                'times_of_day': ['09:00']
            },
            'priority': 'high'
        }
        
        template = RecurringTodoTemplate.create_from_data(data)
        
        # Get next few monthly occurrences
        occurrences = template.get_upcoming_occurrences(days_ahead=100, max_count=3)
        
        # Should have 3 monthly occurrences
        self.assertEqual(len(occurrences), 3)
        
        # All should be on the 1st of the month at 9:00
        for occurrence in occurrences:
            self.assertEqual(occurrence.day, 1)
            self.assertEqual(occurrence.hour, 9)
            self.assertEqual(occurrence.minute, 0)


def run_recurring_todo_tests():
    """Run recurring todo tests with summary"""
    print("🔄 RECURRING TODO TESTS")
    print("=" * 50)
    
    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add test classes
    test_classes = [
        TestRecurringTodoTemplate,
        TestRecurringTodoValidation,
        TestRecurringTodoHelpers,
        TestRealWorldScenarios
    ]
    
    for test_class in test_classes:
        tests = loader.loadTestsFromTestCase(test_class)
        suite.addTests(tests)
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Print summary
    print("\n" + "=" * 50)
    print(f"📊 TEST SUMMARY")
    print(f"Tests run: {result.testsRun}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    print(f"Success rate: {((result.testsRun - len(result.failures) - len(result.errors)) / result.testsRun * 100):.1f}%")
    
    if result.failures:
        print(f"\n❌ FAILURES:")
        for test, traceback in result.failures:
            print(f"  - {test}")
    
    if result.errors:
        print(f"\n🚨 ERRORS:")
        for test, traceback in result.errors:
            print(f"  - {test}")
    
    if not result.failures and not result.errors:
        print(f"\n✅ All tests passed!")
    
    return result.wasSuccessful()


if __name__ == '__main__':
    run_recurring_todo_tests()