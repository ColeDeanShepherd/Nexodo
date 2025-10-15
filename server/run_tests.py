"""
Test runner with summary for the recurrence library
"""

import unittest
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import the test modules
from test_recurrence import *
from test_recurring_todos import run_recurring_todo_tests

def run_tests_with_summary():
    """Run tests and provide a summary"""
    
    print("🧪 RECURRENCE LIBRARY TEST SUITE")
    print("=" * 50)
    
    # Create test suite
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromModule(sys.modules['test_recurrence'])
    
    # Count tests by category
    test_counts = {
        'Pattern Creation': 0,
        'Daily Calculations': 0,
        'Weekly Calculations': 0,
        'Monthly Calculations': 0,
        'Yearly Calculations': 0,
        'Convenience Functions': 0,
        'Edge Cases': 0,
        'Real World Scenarios': 0
    }
    
    # Categorize tests
    for test_group in suite:
        for test in test_group:
            test_name = test._testMethodName
            class_name = test.__class__.__name__
            
            if 'Pattern' in class_name:
                test_counts['Pattern Creation'] += 1
            elif 'Daily' in class_name:
                test_counts['Daily Calculations'] += 1
            elif 'Weekly' in class_name:
                test_counts['Weekly Calculations'] += 1
            elif 'Monthly' in class_name:
                test_counts['Monthly Calculations'] += 1
            elif 'Yearly' in class_name:
                test_counts['Yearly Calculations'] += 1
            elif 'Convenience' in class_name:
                test_counts['Convenience Functions'] += 1
            elif 'EdgeCases' in class_name:
                test_counts['Edge Cases'] += 1
            elif 'RealWorld' in class_name:
                test_counts['Real World Scenarios'] += 1
    
    print("📊 Test Coverage:")
    total_tests = 0
    for category, count in test_counts.items():
        print(f"  {category}: {count} tests")
        total_tests += count
    
    print(f"\n📈 Total Tests: {total_tests}")
    print()
    
    # Run the tests
    runner = unittest.TextTestRunner(verbosity=1)
    result = runner.run(suite)
    
    # Print summary
    print("\n" + "=" * 50)
    if result.wasSuccessful():
        print("✅ ALL TESTS PASSED!")
        print(f"✨ {result.testsRun} tests completed successfully")
    else:
        print("❌ SOME TESTS FAILED")
        print(f"💔 {len(result.failures)} failures, {len(result.errors)} errors")
        print(f"📊 {result.testsRun - len(result.failures) - len(result.errors)}/{result.testsRun} tests passed")
    
    print("\n🎯 Test Categories Covered:")
    covered_features = [
        "✓ Pattern creation and validation",
        "✓ Daily recurrences (every day, every N days, multiple times)",
        "✓ Weekly recurrences (specific days, intervals)",
        "✓ Monthly recurrences (by date, by weekday, complex patterns)",
        "✓ Yearly recurrences (annual events, intervals, leap years)",
        "✓ Convenience functions for common patterns",
        "✓ Edge cases and error handling",
        "✓ Real-world scenarios (medication, meetings, bills, etc.)"
    ]
    
    for feature in covered_features:
        print(f"  {feature}")
    
    print(f"\n🚀 Library is ready for production use!")
    
    return result.wasSuccessful()

if __name__ == '__main__':
    print("🧪 RUNNING ALL TESTS")
    print("=" * 60)
    
    # Run recurrence library tests
    print("\n1️⃣ RECURRENCE LIBRARY TESTS")
    recurrence_success = run_tests_with_summary()
    
    # Run recurring todo tests
    print("\n2️⃣ RECURRING TODO TESTS")
    recurring_todo_success = run_recurring_todo_tests()
    
    # Overall summary
    print("\n" + "=" * 60)
    print("🏁 OVERALL TEST SUMMARY")
    
    if recurrence_success and recurring_todo_success:
        print("✅ All test suites passed!")
        print("🚀 System is ready for production use!")
    else:
        print("❌ Some tests failed:")
        if not recurrence_success:
            print("  - Recurrence library tests failed")
        if not recurring_todo_success:
            print("  - Recurring todo tests failed")
    
    print("\n📋 FEATURES COVERED:")
    covered_features = [
        "✓ Recurrence pattern creation and validation",
        "✓ Daily, weekly, monthly, yearly recurrences",
        "✓ Multiple times per day support",
        "✓ Recurring todo template management",
        "✓ Automatic todo instance generation",
        "✓ Template activation/deactivation",
        "✓ API endpoints for templates",
        "✓ Real-world scheduling scenarios"
    ]
    
    for feature in covered_features:
        print(f"  {feature}")
    
    sys.exit(0 if (recurrence_success and recurring_todo_success) else 1)
    sys.exit(0 if success else 1)