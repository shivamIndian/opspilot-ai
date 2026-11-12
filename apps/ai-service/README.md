# OpsPilot AI Microservice

Enterprise AI Orchestration Microservice built with FastAPI, Pydantic, and Uvicorn, managed via `uv`.

## Technical Stack

- **Runtime**: Python 3.11+
- **Framework**: FastAPI
- **Server**: Uvicorn
- **Configuration**: Pydantic Settings
- **Package Manager**: uv

## Development Setup

### 1. Ensure `uv` is installed

```bash
uv --version
```

### 2. Install dependencies & initialize virtualenv

```bash
uv sync --extra dev
```

### 3. Run the development server

```bash
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

## Available Endpoints

- `GET /`: Microservice verification endpoint.
- `GET /health`: Health status probe endpoint.
- `GET /docs`: Interactive Swagger OpenAPI documentation.
- `GET /redoc`: Alternative ReDoc documentation.
