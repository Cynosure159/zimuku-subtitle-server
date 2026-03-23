class ConflictError(ValueError):
    """Raised when a request conflicts with current resource state."""


class ExternalServiceError(RuntimeError):
    """Raised when an upstream dependency fails."""
