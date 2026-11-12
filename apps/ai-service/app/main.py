import sys
import asyncio

# Ensure Windows uses SelectorEventLoop for async psycopg / langgraph checkpointer
if sys.platform == "win32":
    try:
        from asyncio import WindowsSelectorEventLoopPolicy
        if not isinstance(asyncio.get_event_loop_policy(), WindowsSelectorEventLoopPolicy):
            asyncio.set_event_loop_policy(WindowsSelectorEventLoopPolicy())
    except Exception:
        pass

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config.settings import settings
from app.core.logging import setup_logging, get_logger
from app.api.router import api_router
from app.document_processing.router import router as document_processing_router
from app.embeddings.router import router as embeddings_router
from app.retrieval.router import router as retrieval_router
from app.llm.router import router as llm_router
from app.tools.router import router as tools_router
from app.tools.definitions import register_default_tools
from app.agents.router import router as agents_router
from app.memory.router import router as memory_router
from app.evaluation.router import router as evaluation_router
from app.agents.persistence import init_workflow_checkpointer, close_workflow_checkpointer
from app.embeddings.provider_factory import close_embedding_providers
from app.llm.provider_factory import close_llm_provider
from app.database.connection import dispose_engine, get_sanitized_database_url
from app.redis.client import close_redis, get_sanitized_redis_url

logger = get_logger("opspilot_ai.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for startup and shutdown events."""
    setup_logging()
    logger.info("Initializing OpsPilot AI Microservice...")
    logger.info(f"Environment: {settings.APP_ENV} | Host: {settings.APP_HOST}:{settings.APP_PORT}")
    logger.info(f"Database Target: {get_sanitized_database_url(settings.AI_DATABASE_URL)}")
    logger.info(f"Redis Target: {get_sanitized_redis_url(settings.REDIS_URL)}")
    register_default_tools()
    logger.info("Agent tool registry populated with default tools.")
    await init_workflow_checkpointer()
    logger.info("LangGraph workflow checkpointer initialized.")
    yield
    logger.info("Shutting down OpsPilot AI Microservice and disposing infrastructure pools...")
    await close_workflow_checkpointer()
    await close_llm_provider()
    await close_embedding_providers()
    await dispose_engine()
    await close_redis()
    logger.info("Shutdown completed cleanly.")


app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    description="Enterprise Agentic AI Support Platform - AI Orchestration Microservice",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Enable CORS for frontend and API integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(api_router)
app.include_router(document_processing_router)
app.include_router(embeddings_router)
app.include_router(retrieval_router)
app.include_router(llm_router)
app.include_router(tools_router)
app.include_router(agents_router)
app.include_router(memory_router)
app.include_router(evaluation_router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.APP_HOST,
        port=settings.APP_PORT,
        reload=settings.APP_ENV == "development",
    )
