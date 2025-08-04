"""Input validation utilities for web endpoints and CLI."""

import re
from typing import Any, Dict, List, Optional, Union
from pathlib import Path
import json


class ValidationError(ValueError):
    """Custom exception for validation errors."""
    pass


def validate_positive_int(value: Any, field_name: str = "value", max_value: Optional[int] = None) -> int:
    """Validate that a value is a positive integer."""
    try:
        int_val = int(value)
    except (ValueError, TypeError):
        raise ValidationError(f"{field_name} must be a valid integer")
    
    if int_val <= 0:
        raise ValidationError(f"{field_name} must be positive")
    
    if max_value is not None and int_val > max_value:
        raise ValidationError(f"{field_name} must not exceed {max_value}")
    
    return int_val


def validate_non_negative_float(value: Any, field_name: str = "value") -> float:
    """Validate that a value is a non-negative float."""
    try:
        float_val = float(value)
    except (ValueError, TypeError):
        raise ValidationError(f"{field_name} must be a valid number")
    
    if float_val < 0:
        raise ValidationError(f"{field_name} must be non-negative")
    
    return float_val


def validate_string(value: Any, field_name: str = "value", max_length: int = 1000, allow_empty: bool = False) -> str:
    """Validate that a value is a safe string."""
    if not isinstance(value, str):
        raise ValidationError(f"{field_name} must be a string")
    
    if not allow_empty and not value.strip():
        raise ValidationError(f"{field_name} cannot be empty")
    
    if len(value) > max_length:
        raise ValidationError(f"{field_name} must not exceed {max_length} characters")
    
    # Basic XSS prevention - reject strings with script tags
    if re.search(r'<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>', value, re.IGNORECASE):
        raise ValidationError(f"{field_name} contains unsafe content")
    
    return value.strip()


def validate_file_path(value: Any, field_name: str = "path", must_exist: bool = False) -> Path:
    """Validate that a value is a safe file path."""
    if not isinstance(value, (str, Path)):
        raise ValidationError(f"{field_name} must be a valid path")
    
    try:
        path = Path(value).resolve()
    except (ValueError, OSError):
        raise ValidationError(f"{field_name} is not a valid path")
    
    # Prevent directory traversal attacks
    if '..' in str(path) or str(path).startswith('/'):
        raise ValidationError(f"{field_name} contains unsafe path components")
    
    if must_exist and not path.exists():
        raise ValidationError(f"{field_name} does not exist")
    
    return path


def validate_json_dict(value: Any, field_name: str = "data", required_keys: Optional[List[str]] = None) -> Dict[str, Any]:
    """Validate that a value is a valid JSON dictionary."""
    if not isinstance(value, dict):
        raise ValidationError(f"{field_name} must be a dictionary")
    
    if required_keys:
        missing_keys = [key for key in required_keys if key not in value]
        if missing_keys:
            raise ValidationError(f"{field_name} missing required keys: {missing_keys}")
    
    return value


def validate_choice(value: Any, choices: List[str], field_name: str = "value") -> str:
    """Validate that a value is one of the allowed choices."""
    if value not in choices:
        raise ValidationError(f"{field_name} must be one of: {choices}")
    
    return value


def sanitize_agent_id(agent_id: Any) -> int:
    """Sanitize and validate agent ID."""
    return validate_positive_int(agent_id, "agent_id", max_value=10000)


def sanitize_proposal_id(proposal_id: Any) -> int:
    """Sanitize and validate proposal ID."""
    return validate_positive_int(proposal_id, "proposal_id", max_value=100000)


def sanitize_simulation_steps(steps: Any) -> int:
    """Sanitize and validate simulation steps."""
    return validate_positive_int(steps, "steps", max_value=10000)


def sanitize_token_amount(amount: Any) -> float:
    """Sanitize and validate token amounts."""
    validated = validate_non_negative_float(amount, "token_amount")
    if validated > 1_000_000_000:  # Reasonable upper bound
        raise ValidationError("token_amount exceeds maximum allowed value")
    return validated