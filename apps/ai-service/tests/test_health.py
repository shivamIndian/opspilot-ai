from unittest.mock import patch
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_root_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["service"] == "OpsPilot AI Service"
        assert data["message"] == "AI service is running"


@pytest.mark.asyncio
async def test_health_liveness_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["service"] == "opspilot-ai-service"
        assert data["status"] == "healthy"


@pytest.mark.asyncio
async def test_health_readiness_success():
    transport = ASGITransport(app=app)
    with patch(
        "app.api.router.check_database_health",
        return_value={"status": "up", "latency_ms": 2.5},
    ), patch(
        "app.api.router.check_redis_health",
        return_value={"status": "up", "latency_ms": 1.1},
    ):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/health/ready")
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["status"] == "ready"
            assert data["dependencies"] == {"database": "up", "redis": "up"}
            assert data["error"] is None


@pytest.mark.asyncio
async def test_health_readiness_database_failure():
    transport = ASGITransport(app=app)
    with patch(
        "app.api.router.check_database_health",
        return_value={"status": "down", "latency_ms": 15.0, "error": "Connection refused"},
    ), patch(
        "app.api.router.check_redis_health",
        return_value={"status": "up", "latency_ms": 1.0},
    ):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/health/ready")
            assert response.status_code == 503
            data = response.json()
            assert data["success"] is False
            assert data["status"] == "unhealthy"
            assert data["dependencies"]["database"] == "down"
            assert data["dependencies"]["redis"] == "up"
            assert data["error"]["code"] == "DEPENDENCY_UNAVAILABLE"
            assert "password" not in response.text
            assert "postgresql" not in response.text


@pytest.mark.asyncio
async def test_health_readiness_redis_failure():
    transport = ASGITransport(app=app)
    with patch(
        "app.api.router.check_database_health",
        return_value={"status": "up", "latency_ms": 1.5},
    ), patch(
        "app.api.router.check_redis_health",
        return_value={"status": "down", "latency_ms": 20.0, "error": "Redis timeout"},
    ):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/health/ready")
            assert response.status_code == 503
            data = response.json()
            assert data["dependencies"]["redis"] == "down"
            assert data["error"]["code"] == "DEPENDENCY_UNAVAILABLE"
