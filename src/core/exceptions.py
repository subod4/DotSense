"""Custom exceptions for the application."""


class BrailleLearningException(Exception):
    """Base exception for Braille Learning API."""
    pass


class UserNotFoundException(BrailleLearningException):
    """Raised when a user is not found."""
    pass


class UserAlreadyExistsException(BrailleLearningException):
    """Raised when trying to create a user that already exists."""
    pass


class InvalidLetterException(BrailleLearningException):
    """Raised when an invalid Braille letter is requested."""
    pass


class DatabaseException(BrailleLearningException):
    """Raised when a database operation fails."""
    pass


class ValidationException(BrailleLearningException):
    """Raised when request validation fails."""
    pass
