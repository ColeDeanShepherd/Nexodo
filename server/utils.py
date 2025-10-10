from flask import jsonify, Response
from typing import Any, Tuple

# Helper functions for consistent responses
def success_response(data: Any, status: int = 200) -> Tuple[Response, int]:
    """Standard success response"""
    return jsonify(data), status

def error_response(message: str, status: int = 400) -> Tuple[Response, int]:
    """Standard error response"""
    return jsonify({'error': message}), status

def no_content_response() -> Tuple[str, int]:
    """Standard 204 No Content response"""
    return '', 204