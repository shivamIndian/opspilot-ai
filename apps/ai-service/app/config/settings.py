from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    """Application settings validated using Pydantic."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = Field(default="OpsPilot AI Service")
    APP_ENV: str = Field(default="development")
    APP_HOST: str = Field(default="127.0.0.1")
    APP_PORT: int = Field(default=8000)
    LOG_LEVEL: str = Field(default="INFO")

    # PostgreSQL Database Configuration (SQLAlchemy asyncpg)
    AI_DATABASE_URL: str = Field(
        default="postgresql+asyncpg://opspilot_ai:change_this_ai_password@localhost:5432/opspilot_db"
    )
    DATABASE_POOL_SIZE: int = Field(default=10)
    DATABASE_MAX_OVERFLOW: int = Field(default=5)
    DATABASE_POOL_TIMEOUT: int = Field(default=30)

    # Redis Configuration (Async Redis Client)
    REDIS_URL: str = Field(
        default="redis://:change_this_redis_password@localhost:6379/1"
    )

    # Internal Service Authentication
    AI_SERVICE_INTERNAL_TOKEN: str = Field(
        default="opspilot_internal_service_token_dev_secret_32char!"
    )
    CORE_API_URL: str = Field(default="http://localhost:4000")

    # Document Extraction & Processing Limits
    MAX_DOCUMENT_PAGES: int = Field(default=500)
    MAX_EXTRACTED_CHARS: int = Field(default=5000000)
    MAX_CHUNKS_PER_DOCUMENT: int = Field(default=10000)

    # Deterministic Chunking Configuration (Characters)
    CHUNK_SIZE: int = Field(default=1200)
    CHUNK_OVERLAP: int = Field(default=150)
    PIPELINE_VERSION: str = Field(default="document-pipeline-v1")

    # Embedding Provider Configuration
    EMBEDDING_PROVIDER: str = Field(default="openai")
    EMBEDDING_MODEL: str = Field(default="text-embedding-3-small")
    EMBEDDING_DIMENSIONS: int = Field(default=1536)
    OPENAI_API_KEY: str = Field(default="")
    EMBEDDING_BATCH_SIZE: int = Field(default=64)
    EMBEDDING_MAX_RETRIES: int = Field(default=3)
    EMBEDDING_REQUEST_TIMEOUT: float = Field(default=60.0)

    # LLM Provider & Generation Configuration (Module 10)
    LLM_PROVIDER: str = Field(default="openai")
    LLM_MODEL: str = Field(default="gpt-4o-mini")
    OPENAI_BASE_URL: Optional[str] = Field(default=None)
    LLM_MAX_OUTPUT_TOKENS: int = Field(default=1500)
    LLM_REQUEST_TIMEOUT: float = Field(default=60.0)
    LLM_MAX_RETRIES: int = Field(default=3)
    LLM_TEMPERATURE: float = Field(default=0.2)
    LLM_MAX_CONTEXT_TOKENS: int = Field(default=8000)
    LLM_MAX_QUERY_LENGTH: int = Field(default=5000)
    LLM_PROMPT_VERSION: str = Field(default="rag_assistant_v1")

    # Agent Workflow & Multi-Step Execution Limits (Module 13)
    AGENT_MAX_PLAN_STEPS: int = Field(default=5)
    AGENT_MAX_TOOL_CALLS_PER_RUN: int = Field(default=8)
    AGENT_MAX_REPLANNING_ATTEMPTS: int = Field(default=2)
    AGENT_MAX_MUTATION_PROPOSALS_PER_RUN: int = Field(default=2)
    AGENT_MAX_TOOL_RETRIES: int = Field(default=2)
    AGENT_MAX_WORKFLOW_DURATION_SECONDS: int = Field(default=180)
    AGENT_MAX_PLAN_REVISIONS: int = Field(default=2)


settings = Settings()
