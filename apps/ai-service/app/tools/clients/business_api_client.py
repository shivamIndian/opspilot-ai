"""Asynchronous HTTP client for invoking Node.js Express Internal Business Tool Gateway."""

import logging
from typing import Dict, Any, Optional
import httpx

from app.config.settings import settings
from app.tools.context import ToolExecutionContext
from app.tools.exceptions import (
    ToolError,
    ToolPermissionDeniedError,
    ToolExecutionFailedError,
    ToolRateLimitedError,
    DelegationExpiredError,
    DelegationInvalidError,
    OrganizationContextInvalidError,
)

logger = logging.getLogger(__name__)


class BusinessApiClient:
    """Invokes Node.js Core API agent-tools gateway with service token and delegation assertions."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        internal_token: Optional[str] = None,
        timeout_seconds: float = 30.0,
    ):
        self.base_url = (base_url or settings.CORE_API_URL).rstrip("/")
        self.internal_token = internal_token or settings.AI_SERVICE_INTERNAL_TOKEN
        self.timeout = timeout_seconds

    async def _request(
        self,
        endpoint: str,
        payload: Dict[str, Any],
        context: ToolExecutionContext,
    ) -> Dict[str, Any]:
        """Executes authenticated service-to-service call forwarding delegation assertion."""
        url = f"{self.base_url}/internal/v1/agent-tools/{endpoint.lstrip('/')}"
        headers = {
            "Authorization": f"Bearer {self.internal_token}",
            "x-delegation-token": context.delegated_authorization_token,
            "x-request-id": context.request_id,
            "x-correlation-id": context.correlation_id,
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(url, json=payload, headers=headers)

                if res.status_code == 200:
                    data = res.json()
                    return data.get("data", data)

                error_data: Dict[str, Any] = {}
                try:
                    error_data = res.json().get("error", {})
                except Exception:
                    pass

                error_code = error_data.get("code", "GATEWAY_ERROR")
                message = error_data.get("message", f"Business tool gateway returned HTTP {res.status_code}")

                if res.status_code == 401:
                    if "expired" in message.lower() or error_code == "DELEGATION_EXPIRED":
                        raise DelegationExpiredError(message)
                    raise DelegationInvalidError(message)

                if res.status_code == 403:
                    if error_code == "ORGANIZATION_MISMATCH":
                        raise OrganizationContextInvalidError(message)
                    raise ToolPermissionDeniedError(message, details={"error_code": error_code})

                if res.status_code == 429:
                    raise ToolRateLimitedError(message)

                raise ToolExecutionFailedError(
                    message=message,
                    is_retryable=(res.status_code >= 500),
                    details={"status_code": res.status_code, "error_code": error_code},
                )

        except (ToolError, httpx.RequestError) as e:
            if isinstance(e, ToolError):
                raise
            logger.error(f"[BusinessApiClient] Connection failure calling '{url}': {e}")
            raise ToolExecutionFailedError(
                message=f"Failed to connect to business tool gateway: {str(e)}",
                is_retryable=True,
            )

    async def search_knowledge(self, payload: Dict[str, Any], context: ToolExecutionContext) -> Dict[str, Any]:
        return await self._request("knowledge/search", payload, context)

    async def get_ticket(self, payload: Dict[str, Any], context: ToolExecutionContext) -> Dict[str, Any]:
        return await self._request("tickets/get", payload, context)

    async def create_ticket_proposal(self, payload: Dict[str, Any], context: ToolExecutionContext) -> Dict[str, Any]:
        return await self._request("tickets/create-proposal", payload, context)

    async def update_ticket_proposal(self, payload: Dict[str, Any], context: ToolExecutionContext) -> Dict[str, Any]:
        return await self._request("tickets/update-proposal", payload, context)

    async def search_users(self, payload: Dict[str, Any], context: ToolExecutionContext) -> Dict[str, Any]:
        return await self._request("users/search", payload, context)

    async def summarize_support_history(self, payload: Dict[str, Any], context: ToolExecutionContext) -> Dict[str, Any]:
        return await self._request("support-history/search", payload, context)


_client_instance: Optional[BusinessApiClient] = None


def get_business_api_client() -> BusinessApiClient:
    global _client_instance
    if _client_instance is None:
        _client_instance = BusinessApiClient()
    return _client_instance
