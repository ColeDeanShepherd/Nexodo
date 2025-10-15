"""
Recurrence Library for Nexodo

A comprehensive library for handling recurring patterns and calculating next occurrences.
Supports various recurrence types including daily, weekly, monthly, yearly patterns.
"""

from datetime import datetime, timedelta, date
from typing import Dict, Any, List, Optional, Union, Tuple
from enum import Enum
import calendar


class RecurrenceType(Enum):
    """Enum for different types of recurrences"""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"
    CUSTOM = "custom"


class WeekDay(Enum):
    """Enum for days of the week"""
    MONDAY = 0
    TUESDAY = 1
    WEDNESDAY = 2
    THURSDAY = 3
    FRIDAY = 4
    SATURDAY = 5
    SUNDAY = 6


class MonthlyType(Enum):
    """Enum for monthly recurrence types"""
    DAY_OF_MONTH = "day_of_month"  # e.g., 15th of every month
    WEEKDAY_OF_MONTH = "weekday_of_month"  # e.g., first Monday of every month
    LAST_DAY = "last_day"  # Last day of the month
    LAST_WEEKDAY = "last_weekday"  # e.g., last Friday of the month


class RecurrencePattern:
    """
    Represents a recurrence pattern for todos, events, or other recurring items.
    
    Examples:
    - Every day: RecurrencePattern(RecurrenceType.DAILY, interval=1)
    - Every other day: RecurrencePattern(RecurrenceType.DAILY, interval=2)
    - Every Mon/Wed/Fri: RecurrencePattern(RecurrenceType.WEEKLY, weekdays=[0, 2, 4])
    - Monthly on 15th: RecurrencePattern(RecurrenceType.MONTHLY, day_of_month=15)
    - First Monday of month: RecurrencePattern(RecurrenceType.MONTHLY, monthly_type=MonthlyType.WEEKDAY_OF_MONTH, weekday=0, week_of_month=1)
    """
    
    def __init__(
        self,
        recurrence_type: RecurrenceType,
        interval: int = 1,
        weekdays: Optional[List[int]] = None,
        times_of_day: Optional[List[str]] = None,  # e.g., ["09:00", "21:00"]
        day_of_month: Optional[int] = None,
        month_of_year: Optional[int] = None,
        monthly_type: MonthlyType = MonthlyType.DAY_OF_MONTH,
        weekday: Optional[int] = None,  # 0=Monday, 6=Sunday
        week_of_month: Optional[int] = None,  # 1=first, 2=second, -1=last
        end_date: Optional[datetime] = None,
        max_occurrences: Optional[int] = None,
        timezone: Optional[str] = None
    ):
        self.recurrence_type = recurrence_type
        self.interval = interval
        self.weekdays = weekdays or []
        self.times_of_day = times_of_day or []
        self.day_of_month = day_of_month
        self.month_of_year = month_of_year
        self.monthly_type = monthly_type
        self.weekday = weekday
        self.week_of_month = week_of_month
        self.end_date = end_date
        self.max_occurrences = max_occurrences
        self.timezone = timezone
        
        self._validate_pattern()
    
    def _validate_pattern(self) -> None:
        """Validate the recurrence pattern parameters"""
        if self.interval < 1:
            raise ValueError("Interval must be at least 1")
        
        if self.weekdays:
            for day in self.weekdays:
                if not 0 <= day <= 6:
                    raise ValueError("Weekdays must be between 0 (Monday) and 6 (Sunday)")
        
        if self.day_of_month and not 1 <= self.day_of_month <= 31:
            raise ValueError("Day of month must be between 1 and 31")
        
        if self.month_of_year and not 1 <= self.month_of_year <= 12:
            raise ValueError("Month of year must be between 1 and 12")
        
        if self.weekday is not None and not 0 <= self.weekday <= 6:
            raise ValueError("Weekday must be between 0 (Monday) and 6 (Sunday)")
        
        if self.week_of_month and not (-5 <= self.week_of_month <= 5 and self.week_of_month != 0):
            raise ValueError("Week of month must be between -5 and 5, excluding 0")
    
    @classmethod
    def daily(cls, interval: int = 1, times_of_day: Optional[List[str]] = None) -> 'RecurrencePattern':
        """Create a daily recurrence pattern"""
        return cls(RecurrenceType.DAILY, interval=interval, times_of_day=times_of_day)
    
    @classmethod
    def weekly(cls, weekdays: List[int], interval: int = 1, times_of_day: Optional[List[str]] = None) -> 'RecurrencePattern':
        """Create a weekly recurrence pattern"""
        return cls(RecurrenceType.WEEKLY, interval=interval, weekdays=weekdays, times_of_day=times_of_day)
    
    @classmethod
    def monthly_by_date(cls, day_of_month: int, interval: int = 1, times_of_day: Optional[List[str]] = None) -> 'RecurrencePattern':
        """Create a monthly recurrence pattern by day of month"""
        return cls(
            RecurrenceType.MONTHLY, 
            interval=interval, 
            day_of_month=day_of_month,
            monthly_type=MonthlyType.DAY_OF_MONTH,
            times_of_day=times_of_day
        )
    
    @classmethod
    def monthly_by_weekday(cls, weekday: int, week_of_month: int, interval: int = 1, times_of_day: Optional[List[str]] = None) -> 'RecurrencePattern':
        """Create a monthly recurrence pattern by weekday (e.g., first Monday)"""
        return cls(
            RecurrenceType.MONTHLY,
            interval=interval,
            monthly_type=MonthlyType.WEEKDAY_OF_MONTH,
            weekday=weekday,
            week_of_month=week_of_month,
            times_of_day=times_of_day
        )
    
    @classmethod
    def yearly(cls, month: int, day: int, interval: int = 1, times_of_day: Optional[List[str]] = None) -> 'RecurrencePattern':
        """Create a yearly recurrence pattern"""
        return cls(
            RecurrenceType.YEARLY,
            interval=interval,
            month_of_year=month,
            day_of_month=day,
            times_of_day=times_of_day
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert pattern to dictionary for storage"""
        return {
            'recurrence_type': self.recurrence_type.value,
            'interval': self.interval,
            'weekdays': self.weekdays,
            'times_of_day': self.times_of_day,
            'day_of_month': self.day_of_month,
            'month_of_year': self.month_of_year,
            'monthly_type': self.monthly_type.value,
            'weekday': self.weekday,
            'week_of_month': self.week_of_month,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'max_occurrences': self.max_occurrences,
            'timezone': self.timezone
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'RecurrencePattern':
        """Create pattern from dictionary"""
        return cls(
            recurrence_type=RecurrenceType(data['recurrence_type']),
            interval=data.get('interval', 1),
            weekdays=data.get('weekdays', []),
            times_of_day=data.get('times_of_day', []),
            day_of_month=data.get('day_of_month'),
            month_of_year=data.get('month_of_year'),
            monthly_type=MonthlyType(data.get('monthly_type', MonthlyType.DAY_OF_MONTH.value)),
            weekday=data.get('weekday'),
            week_of_month=data.get('week_of_month'),
            end_date=datetime.fromisoformat(data['end_date']) if data.get('end_date') else None,
            max_occurrences=data.get('max_occurrences'),
            timezone=data.get('timezone')
        )


class RecurrenceCalculator:
    """Calculator for finding next occurrences and generating occurrence lists"""
    
    @staticmethod
    def get_next_occurrence(pattern: RecurrencePattern, after_date: datetime) -> Optional[datetime]:
        """
        Get the next occurrence after the given date.
        
        Args:
            pattern: The recurrence pattern
            after_date: Find next occurrence after this date
            
        Returns:
            Next occurrence datetime or None if no more occurrences
        """
        if pattern.end_date and after_date >= pattern.end_date:
            return None
        
        if pattern.recurrence_type == RecurrenceType.DAILY:
            return RecurrenceCalculator._next_daily(pattern, after_date)
        elif pattern.recurrence_type == RecurrenceType.WEEKLY:
            return RecurrenceCalculator._next_weekly(pattern, after_date)
        elif pattern.recurrence_type == RecurrenceType.MONTHLY:
            return RecurrenceCalculator._next_monthly(pattern, after_date)
        elif pattern.recurrence_type == RecurrenceType.YEARLY:
            return RecurrenceCalculator._next_yearly(pattern, after_date)
        
        return None
    
    @staticmethod
    def get_occurrences_in_range(pattern: RecurrencePattern, start_date: datetime, end_date: datetime, max_count: int = 100) -> List[datetime]:
        """
        Get all occurrences within a date range.
        
        Args:
            pattern: The recurrence pattern
            start_date: Start of range
            end_date: End of range
            max_count: Maximum number of occurrences to return
            
        Returns:
            List of occurrence datetimes
        """
        occurrences = []
        current_date = start_date
        count = 0
        
        while current_date < end_date and count < max_count:
            next_occurrence = RecurrenceCalculator.get_next_occurrence(pattern, current_date)
            if not next_occurrence or next_occurrence > end_date:
                break
            
            occurrences.append(next_occurrence)
            
            # For patterns with multiple times per day, we need to handle them specially
            if pattern.times_of_day and len(pattern.times_of_day) > 1:
                # Move to next minute to find next time on same day or next day
                current_date = next_occurrence + timedelta(minutes=1)
            else:
                # Move to next day to avoid infinite loops on single-time patterns
                current_date = next_occurrence + timedelta(days=1)
            
            count += 1
            
            if pattern.max_occurrences and count >= pattern.max_occurrences:
                break
        
        return occurrences
    
    @staticmethod
    def _next_daily(pattern: RecurrencePattern, after_date: datetime) -> datetime:
        """Calculate next daily occurrence"""
        next_date = after_date + timedelta(days=pattern.interval)
        
        if pattern.times_of_day:
            # If specific times are specified, find the next occurrence
            for time_str in pattern.times_of_day:
                time_parts = time_str.split(':')
                hour = int(time_parts[0])
                minute = int(time_parts[1]) if len(time_parts) > 1 else 0
                
                # Try today first
                today_occurrence = after_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
                if today_occurrence > after_date:
                    return today_occurrence
            
            # If no time today, use first time tomorrow
            time_parts = pattern.times_of_day[0].split(':')
            hour = int(time_parts[0])
            minute = int(time_parts[1]) if len(time_parts) > 1 else 0
            
            tomorrow = after_date.date() + timedelta(days=pattern.interval)
            return datetime.combine(tomorrow, datetime.min.time().replace(hour=hour, minute=minute))
        
        return next_date
    
    @staticmethod
    def _next_weekly(pattern: RecurrencePattern, after_date: datetime) -> Optional[datetime]:
        """Calculate next weekly occurrence"""
        if not pattern.weekdays:
            return None
        
        current_weekday = after_date.weekday()
        
        # Find next occurrence in current week
        for weekday in sorted(pattern.weekdays):
            if weekday > current_weekday:
                days_ahead = weekday - current_weekday
                next_date = after_date + timedelta(days=days_ahead)
                return RecurrenceCalculator._apply_times_of_day(pattern, next_date, after_date)
        
        # No more occurrences this week, find first occurrence in next interval
        days_until_next_week = 7 * pattern.interval - current_weekday - 1
        days_ahead = days_until_next_week + min(pattern.weekdays)
        next_date = after_date + timedelta(days=days_ahead)
        return RecurrenceCalculator._apply_times_of_day(pattern, next_date, after_date)
    
    @staticmethod
    def _next_monthly(pattern: RecurrencePattern, after_date: datetime) -> Optional[datetime]:
        """Calculate next monthly occurrence"""
        if pattern.monthly_type == MonthlyType.DAY_OF_MONTH and pattern.day_of_month:
            return RecurrenceCalculator._next_monthly_by_date(pattern, after_date)
        elif pattern.monthly_type == MonthlyType.WEEKDAY_OF_MONTH and pattern.weekday is not None:
            return RecurrenceCalculator._next_monthly_by_weekday(pattern, after_date)
        elif pattern.monthly_type == MonthlyType.LAST_DAY:
            return RecurrenceCalculator._next_monthly_last_day(pattern, after_date)
        
        return None
    
    @staticmethod
    def _next_monthly_by_date(pattern: RecurrencePattern, after_date: datetime) -> Optional[datetime]:
        """Calculate next monthly occurrence by date"""
        current_month = after_date.month
        current_year = after_date.year
        target_day = pattern.day_of_month
        
        # Try current month first
        try:
            next_date = after_date.replace(day=target_day)
            if next_date > after_date:
                return RecurrenceCalculator._apply_times_of_day(pattern, next_date, after_date)
        except ValueError:
            pass  # Day doesn't exist in current month
        
        # Move to next month with interval
        for i in range(pattern.interval):
            current_month += 1
            if current_month > 12:
                current_month = 1
                current_year += 1
        
        # Find valid day in target month
        while True:
            try:
                next_date = datetime(current_year, current_month, target_day)
                return RecurrenceCalculator._apply_times_of_day(pattern, next_date, after_date)
            except ValueError:
                # Day doesn't exist in this month, try next month
                current_month += pattern.interval
                if current_month > 12:
                    current_month = 1
                    current_year += 1
    
    @staticmethod
    def _next_monthly_by_weekday(pattern: RecurrencePattern, after_date: datetime) -> Optional[datetime]:
        """Calculate next monthly occurrence by weekday (e.g., first Monday)"""
        current_month = after_date.month
        current_year = after_date.year
        
        # Try current month first
        target_date = RecurrenceCalculator._find_weekday_in_month(
            current_year, current_month, pattern.weekday, pattern.week_of_month
        )
        
        if target_date and target_date > after_date.date():
            next_date = datetime.combine(target_date, after_date.time())
            return RecurrenceCalculator._apply_times_of_day(pattern, next_date, after_date)
        
        # Move to next month with interval
        for i in range(pattern.interval):
            current_month += 1
            if current_month > 12:
                current_month = 1
                current_year += 1
        
        target_date = RecurrenceCalculator._find_weekday_in_month(
            current_year, current_month, pattern.weekday, pattern.week_of_month
        )
        
        if target_date:
            next_date = datetime.combine(target_date, after_date.time())
            return RecurrenceCalculator._apply_times_of_day(pattern, next_date, after_date)
        
        return None
    
    @staticmethod
    def _next_monthly_last_day(pattern: RecurrencePattern, after_date: datetime) -> datetime:
        """Calculate next monthly occurrence on last day of month"""
        current_month = after_date.month
        current_year = after_date.year
        
        # Get last day of current month
        _, last_day = calendar.monthrange(current_year, current_month)
        try:
            next_date = after_date.replace(day=last_day)
            if next_date > after_date:
                return RecurrenceCalculator._apply_times_of_day(pattern, next_date, after_date)
        except ValueError:
            pass
        
        # Move to next month with interval
        for i in range(pattern.interval):
            current_month += 1
            if current_month > 12:
                current_month = 1
                current_year += 1
        
        _, last_day = calendar.monthrange(current_year, current_month)
        next_date = datetime(current_year, current_month, last_day)
        return RecurrenceCalculator._apply_times_of_day(pattern, next_date, after_date)
    
    @staticmethod
    def _next_yearly(pattern: RecurrencePattern, after_date: datetime) -> Optional[datetime]:
        """Calculate next yearly occurrence"""
        if not pattern.month_of_year or not pattern.day_of_month:
            return None
        
        current_year = after_date.year
        target_month = pattern.month_of_year
        target_day = pattern.day_of_month
        
        # Try current year first
        try:
            next_date = datetime(current_year, target_month, target_day)
            if next_date > after_date:
                return RecurrenceCalculator._apply_times_of_day(pattern, next_date, after_date)
        except ValueError:
            pass  # Invalid date
        
        # Move to next year with interval
        next_year = current_year + pattern.interval
        try:
            next_date = datetime(next_year, target_month, target_day)
            return RecurrenceCalculator._apply_times_of_day(pattern, next_date, after_date)
        except ValueError:
            # Handle leap year edge case
            if target_month == 2 and target_day == 29:
                # February 29th on non-leap year, use February 28th
                next_date = datetime(next_year, target_month, 28)
                return RecurrenceCalculator._apply_times_of_day(pattern, next_date, after_date)
        
        return None
    
    @staticmethod
    def _apply_times_of_day(pattern: RecurrencePattern, next_date: datetime, after_date: datetime) -> datetime:
        """Apply specific times of day to the next date"""
        if not pattern.times_of_day:
            return next_date
        
        # If it's the same day, find next time
        if next_date.date() == after_date.date():
            for time_str in pattern.times_of_day:
                time_parts = time_str.split(':')
                hour = int(time_parts[0])
                minute = int(time_parts[1]) if len(time_parts) > 1 else 0
                
                time_occurrence = next_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
                if time_occurrence > after_date:
                    return time_occurrence
        
        # Use first time of day for the next date
        time_parts = pattern.times_of_day[0].split(':')
        hour = int(time_parts[0])
        minute = int(time_parts[1]) if len(time_parts) > 1 else 0
        
        return next_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
    
    @staticmethod
    def _find_weekday_in_month(year: int, month: int, weekday: int, week_of_month: int) -> Optional[date]:
        """Find a specific weekday in a month (e.g., first Monday, last Friday)"""
        # Get first day of month
        first_day = date(year, month, 1)
        
        if week_of_month > 0:
            # Find the nth occurrence
            # Calculate first occurrence of the weekday in the month
            days_ahead = weekday - first_day.weekday()
            if days_ahead < 0:
                days_ahead += 7
            
            first_occurrence = first_day + timedelta(days=days_ahead)
            target_date = first_occurrence + timedelta(weeks=week_of_month - 1)
            
            # Check if target date is still in the same month
            if target_date.month == month:
                return target_date
        else:
            # Find the nth occurrence from the end (negative week_of_month)
            # Get last day of month
            if month == 12:
                last_day = date(year + 1, 1, 1) - timedelta(days=1)
            else:
                last_day = date(year, month + 1, 1) - timedelta(days=1)
            
            # Find last occurrence of weekday in month
            days_back = (last_day.weekday() - weekday) % 7
            last_occurrence = last_day - timedelta(days=days_back)
            
            # Calculate target date
            target_date = last_occurrence + timedelta(weeks=week_of_month + 1)
            
            # Check if target date is still in the same month
            if target_date.month == month and target_date >= first_day:
                return target_date
        
        return None


# Convenience functions for creating common patterns
def every_day(times: Optional[List[str]] = None) -> RecurrencePattern:
    """Every day"""
    return RecurrencePattern.daily(times_of_day=times)


def every_n_days(n: int, times: Optional[List[str]] = None) -> RecurrencePattern:
    """Every N days"""
    return RecurrencePattern.daily(interval=n, times_of_day=times)


def weekdays_only(times: Optional[List[str]] = None) -> RecurrencePattern:
    """Monday through Friday"""
    return RecurrencePattern.weekly([0, 1, 2, 3, 4], times_of_day=times)


def weekends_only(times: Optional[List[str]] = None) -> RecurrencePattern:
    """Saturday and Sunday"""
    return RecurrencePattern.weekly([5, 6], times_of_day=times)


def specific_weekdays(days: List[int], times: Optional[List[str]] = None) -> RecurrencePattern:
    """Specific days of the week (0=Monday, 6=Sunday)"""
    return RecurrencePattern.weekly(days, times_of_day=times)


def monthly_on_date(day: int, times: Optional[List[str]] = None) -> RecurrencePattern:
    """Monthly on a specific date"""
    return RecurrencePattern.monthly_by_date(day, times_of_day=times)


def every_n_months_on_date(n: int, day: int, times: Optional[List[str]] = None) -> RecurrencePattern:
    """Every N months on a specific date"""
    return RecurrencePattern.monthly_by_date(day, interval=n, times_of_day=times)


def first_weekday_of_month(weekday: int, times: Optional[List[str]] = None) -> RecurrencePattern:
    """First occurrence of weekday in month (0=Monday, 6=Sunday)"""
    return RecurrencePattern.monthly_by_weekday(weekday, 1, times_of_day=times)


def last_weekday_of_month(weekday: int, times: Optional[List[str]] = None) -> RecurrencePattern:
    """Last occurrence of weekday in month (0=Monday, 6=Sunday)"""
    return RecurrencePattern.monthly_by_weekday(weekday, -1, times_of_day=times)


def yearly_on_date(month: int, day: int, times: Optional[List[str]] = None) -> RecurrencePattern:
    """Yearly on specific date"""
    return RecurrencePattern.yearly(month, day, times_of_day=times)


def every_n_years(n: int, month: int, day: int, times: Optional[List[str]] = None) -> RecurrencePattern:
    """Every N years on specific date"""
    return RecurrencePattern.yearly(month, day, interval=n, times_of_day=times)


# Example usage and testing
if __name__ == "__main__":
    # Examples of different recurrence patterns
    
    # Daily patterns
    shower = every_day()  # Every day
    medication = every_day(["08:00", "20:00"])  # Every day at 8am and 8pm
    workout = every_n_days(2)  # Every other day
    
    # Weekly patterns
    team_meeting = specific_weekdays([0])  # Every Monday
    gym = specific_weekdays([0, 2, 4])  # Mon/Wed/Fri
    weekend_chores = weekends_only()  # Saturday and Sunday
    
    # Monthly patterns
    rent = monthly_on_date(1)  # 1st of every month
    salary = monthly_on_date(15)  # 15th of every month
    board_meeting = first_weekday_of_month(0)  # First Monday of every month
    
    # Yearly patterns
    birthday = yearly_on_date(3, 15)  # March 15th every year
    taxes = yearly_on_date(4, 15)  # April 15th every year (US tax day)
    
    # Test the calculator
    calc = RecurrenceCalculator()
    now = datetime.now()
    
    print("=== Recurrence Pattern Examples ===")
    
    patterns = [
        ("Daily shower", shower),
        ("Medication (8am & 8pm)", medication),
        ("Workout (every other day)", workout),
        ("Team meeting (Mondays)", team_meeting),
        ("Gym (Mon/Wed/Fri)", gym),
        ("Rent (1st of month)", rent),
        ("Birthday (March 15)", birthday),
    ]
    
    for name, pattern in patterns:
        next_occurrence = calc.get_next_occurrence(pattern, now)
        print(f"{name}: Next occurrence at {next_occurrence}")
        
        # Get next 3 occurrences
        occurrences = calc.get_occurrences_in_range(
            pattern, now, now + timedelta(days=90), max_count=3
        )
        print(f"  Next 3: {[occ.strftime('%Y-%m-%d %H:%M') for occ in occurrences]}")
        print()