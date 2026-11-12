import asyncio
from typing import Literal, Optional
from fastapi import APIRouter, Response, status
from pydantic import BaseModel, Field
from app.database.health import check_database_health
from app.redis.health import check_redis_health

api_router = APIRouter()


class RootResponse(BaseModel):
    success: bool = True
    service: str = "OpsPilot AI Service"
    message: str = "AI service is running"


class HealthResponse(BaseModel):
    success: bool = True
    service: str = "opspilot-ai-service"
    status: str = "healthy"


class DependenciesState(BaseModel):
    database: Literal["up", "down"]
    redis: Literal["up", "down"]


class ErrorDetail(BaseModel):
    code: str
    message: str


class ReadinessResponse(BaseModel):
    success: bool
    service: str = "opspilot-ai-service"
    status: Literal["ready", "unhealthy"]
    dependencies: DependenciesState
    error: Optional[ErrorDetail] = None


@api_router.get(
    "/",
    response_model=RootResponse,
    summary="Root Service Verification",
    description="Returns acknowledgment that OpsPilot AI service is operational.",
)
async def get_root() -> RootResponse:
    return RootResponse()


@api_router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health Status Probe (Liveness)",
    description="Returns process-level vitality status for orchestrator liveness probes.",
)
async def get_health() -> HealthResponse:
    return HealthResponse()


@api_router.get(
    "/health/ready",
    response_model=ReadinessResponse,
    summary="Infrastructure Readiness Probe",
    description="Verifies asynchronous connectivity to PostgreSQL (ai schema) and Redis.",
    responses={
        status.HTTP_200_OK: {"model": ReadinessResponse},
        status.HTTP_503_SERVICE_UNAVAILABLE: {"model": ReadinessResponse},
    },
)
async def get_readiness(response: Response) -> ReadinessResponse:
    db_result, redis_result = await asyncio.gather(
        check_database_health(),
        check_redis_health(),
    )

    is_db_up = db_result["status"] == "up"
    is_redis_up = redis_result["status"] == "up"
    is_all_ready = is_db_up and is_redis_up

    res_body = ReadinessResponse(
        success=is_all_ready,
        status="ready" if is_all_ready else "unhealthy",
        dependencies=DependenciesState(
            database="up" if is_db_up else "down",
            redis="up" if is_redis_up else "down",
        ),
    )

    if not is_all_ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        res_body.error = ErrorDetail(
            code="DEPENDENCY_UNAVAILABLE",
            message="One or more required infrastructure dependencies are unavailable",
        )

    return res_body
