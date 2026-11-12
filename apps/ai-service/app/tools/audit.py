"""Audit logger for agent tool execution lifecycle."""

import hashlib
import json
import logging
import uuid
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import AsyncSessionLocal
from app.tools.models import AgentToolExecution
from app.tools.context import ToolExecutionContext
from app.tools.schemas import ToolRiskLevel

logger = logging.getLogger(__name__)


class ToolAuditLogger:
    """Records sanitized tool execution telemetry to PostgreSQL ai.agent_tool_executions."""

    @staticmethod
    def compute_input_hash(data: Dict[str, Any]) -> str:
        """Computes SHA-256 fingerprint of input arguments."""
        try:
            serialized = json.dumps(data, sort_keys=True)
            return hashlib.sha256(serialized.encode("utf-8")).hexdigest()
        except Exception:
            return hashlib.sha256(str(data).encode("utf-8")).hexdigest()

    @classmethod
    async def log_execution(
        cls,
        context: ToolExecutionContext,
        tool_name: str,
        risk_level: ToolRiskLevel,
        status: str,
        input_data: Dict[str, Any],
        output_summary: Optional[str] = None,
        duration_ms: Optional[float] = None,
        error_code: Optional[str] = None,
    ) -> None:
        """Asynchronously persists audit entry, failing open on database error."""
        input_hash = cls.compute_input_hash(input_data)
        truncated_summary = output_summary[:1000] if output_summary else None

        try:
            async with AsyncSessionLocal() as session:
                audit_record = AgentToolExecution(
                    organization_id=uuid.UUID(context.organization_id),
                    request_id=context.request_id,
                    execution_id=context.execution_id,
                    tool_name=tool_name,
                    risk_level=risk_level.value,
                    execution_status=status,
                    input_hash=input_hash,
                    output_summary=truncated_summary,
                    duration_ms=duration_ms,
                    error_code=error_code,
                )
                session.add(audit_record)
                await session.commit()
        except Exception as e:
            # Audit failures must be logged as high-priority warnings but not interrupt execution
            logger.error(
                f"[ToolAuditLogger] Failed to record tool audit for execution_id={context.execution_id}: {e}"
            )
