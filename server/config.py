import os
from dataclasses import dataclass

@dataclass
class Config:
    """Application configuration from environment variables"""
    secret_key: str
    app_password: str
    database_url: str
    port: int # Only used when debugging
    debug: bool
    client_dir: str
    session_lifetime_hours: int
    
    @classmethod
    def from_env(cls) -> 'Config':
        """Create config from environment variables"""
        # Database URL handling
        database_url = os.environ.get('DATABASE_URL')
        if database_url:
            # Handle Railway's postgres:// vs postgresql:// URL format
            if database_url.startswith('postgres://'):
                database_url = database_url.replace('postgres://', 'postgresql://', 1)
        else:
            # Development - SQLite
            database_url = 'sqlite:///todos.db'
        
        return cls(
            secret_key=os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production'),
            app_password=os.environ.get('APP_PASSWORD', 'nexodo123'),
            database_url=database_url,
            port=int(os.environ.get('PORT', 5000)),
            debug=os.environ.get('FLASK_ENV') != 'production',
            client_dir='../client',
            session_lifetime_hours=24
        )