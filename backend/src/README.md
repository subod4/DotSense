# Braille Learning API - Professional Backend Structure

## Overview

This is a professional FastAPI-based backend for the Braille Learning System. The codebase follows industry best practices with clear separation of concerns, dependency injection, and comprehensive error handling.

## Architecture

### Directory Structure

```
src/
├── main.py                 # Application entry point
├── config/                 # Configuration management
│   ├── __init__.py
│   ├── settings.py        # Environment settings (Pydantic Settings)
│   └── database.py        # Database connection & initialization
├── models/                 # Data models
│   ├── __init__.py
│   ├── schemas.py         # API request/response models (Pydantic)
│   └── learning.py        # Domain models (dataclasses)
├── repositories/           # Data access layer
│   ├── __init__.py
│   ├── user_repository.py
│   └── learning_repository.py
├── services/               # Business logic layer
│   ├── __init__.py
│   ├── user_service.py
│   └── learning_service.py
├── routers/                # API route handlers
│   ├── __init__.py
│   ├── health.py
│   ├── learning.py
│   ├── tutorial.py
│   ├── users.py
│   └── esp32.py
├── core/                   # Core utilities
│   ├── __init__.py
│   ├── dependencies.py    # Dependency injection
│   ├── exceptions.py      # Custom exceptions
│   └── logging.py         # Logging configuration
└── utils/                  # Shared utilities
    ├── __init__.py
    ├── constants.py       # Application constants
    └── helpers.py         # Helper functions
```

### Architectural Patterns

**1. Layered Architecture**
- **Routers**: Handle HTTP requests/responses, input validation
- **Services**: Contain business logic, orchestrate operations
- **Repositories**: Manage database operations, data persistence
- **Models**: Define data structures and validation rules

**2. Dependency Injection**
- FastAPI's `Depends()` for clean dependency management
- Easy testing and mocking
- Clear dependency flow

**3. Separation of Concerns**
- Configuration isolated in `config/`
- Data models separated from API schemas
- Business logic independent of HTTP layer
- Database operations abstracted in repositories

## Key Features

### Configuration Management
- Environment-based settings using `pydantic-settings`
- Centralized configuration in `config/settings.py`
- `.env` file support for local development
- Type-safe configuration access

### Database Layer
- Async MongoDB with Motor
- Connection pooling and lifecycle management
- Automatic index creation
- Repository pattern for data access

### API Layer
- RESTful endpoints organized by domain
- Comprehensive request/response validation
- Proper HTTP status codes
- Error handling and logging

### Dependency Injection
- Service and repository injection
- Promotes testability
- Reduces coupling

### Logging
- Structured logging with levels
- Request/response logging
- Error tracking
- Configurable log output

## Running the Application

### Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Create `.env` file:
```env
MONGODB_URL=mongodb://localhost:27017
DB_NAME=braille_learning
CORS_ORIGINS=http://localhost:5173
DEBUG=false
```

3. Run the server:
```bash
# From src/ directory
python main.py

# Or with uvicorn directly
uvicorn main:app --reload
```

### API Documentation

Once running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## API Endpoints

### Health & Info
- `GET /` - API information
- `GET /api/health` - Health check
- `GET /api/constants` - Learning constants

### Users
- `POST /api/users/create` - Create user
- `GET /api/users/{user_id}` - Get user
- `PUT /api/users/{user_id}` - Update user
- `DELETE /api/users/{user_id}` - Delete user
- `GET /api/users/` - List users

### Learning Engine
- `POST /api/learning/step` - Get next learning step
- `POST /api/learning/attempt` - Record attempt
- `GET /api/learning/stats/{user_id}` - Get statistics
- `POST /api/learning/reset/{user_id}` - Reset progress

### Tutorial Mode
- `POST /api/tutorial/start` - Start tutorial
- `GET /api/tutorial/step` - Get current step
- `POST /api/tutorial/next` - Next letter
- `POST /api/tutorial/previous` - Previous letter
- `POST /api/tutorial/end` - End tutorial

### ESP32
- `GET /api/esp32/letter/{letter}` - Get Braille pattern
- `GET /api/esp32/learning/dots` - Get learning mode dots

## Development Guidelines

### Adding New Features

1. **Create models** in `models/schemas.py`
2. **Add repository methods** in appropriate repository
3. **Implement service logic** in service layer
4. **Create router endpoints** in appropriate router
5. **Register router** in `main.py`

### Code Style

- Follow PEP 8
- Use type hints
- Add docstrings to functions
- Keep functions focused and small
- Use descriptive variable names

### Error Handling

- Use custom exceptions from `core/exceptions.py`
- Return appropriate HTTP status codes
- Log errors with context
- Provide helpful error messages

### Testing

Structure supports easy testing:
- Mock repositories for service tests
- Mock services for router tests
- Use pytest for unit/integration tests

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URL` | MongoDB connection string | Required |
| `DB_NAME` | Database name | Required |
| `CORS_ORIGINS` | Allowed CORS origins | `http://localhost:5173` |
| `DEBUG` | Debug mode | `false` |
| `HOST` | Server host | `0.0.0.0` |
| `PORT` | Server port | `8000` |
| `MAX_RESPONSE_TIME` | Max response time (seconds) | `6.0` |
| `MASTERY_HIGH` | High mastery threshold | `0.85` |
| `MASTERY_MID` | Mid mastery threshold | `0.6` |
| `MIN_ATTEMPTS_FOR_MASTERY` | Min attempts for mastery | `5` |

## Migration from Old Structure

The old files (`app.py`, `database.py`, `learning_engine.py`, `tutorial.py`, `constants.py`) are preserved but should no longer be used. The new structure in `src/` provides:

- Better organization
- Easier testing
- Clearer dependencies
- Professional code structure
- Scalability

## License

[Your License Here]
