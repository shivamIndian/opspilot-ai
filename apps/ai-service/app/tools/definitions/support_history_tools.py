"""Support history tool definition for summarizing activity and prior tickets."""

from typing import Optional, List
from pydantic import BaseModel, Field
from app.tools.base import ToolDefinition
from app.tools.context import ToolExecutionContext
from app.tools.schemas import ToolRiskLevel, ToolExecutionMode
from app.tools.clients.business_api_client import get_business_api_client


class SupportHistoryInput(BaseModel):
    ticket_id: Optional[str] = Field(None, description="Optional ticket UUID to query specific history")
    user_id: Optional[str] = Field(None, description="Optional user UUID to query tickets opened by a user")
    status_filter: Optional[str] = Field(None, description="Filter by status (open, in_progress, resolved, closed)")
    limit: int = Field(default=10, ge=1, le=50, description="Max history records to retrieve")


class SupportHistoryItem(BaseModel):
    item_id: str
    ticket_id: str
    activity_type: str
    summary: str
    actor_id: Optional[str] = None
    created_at: str


class SupportHistoryOutput(BaseModel):
    total_records: int
    history_records: List[SupportHistoryItem] = Field(default_factory=list)


class SummarizeSupportHistoryTool(ToolDefinition):
    """Tool that retrieves historical support activity and past ticket context."""

    def __init__(self):
        super().__init__(
            name="summarize_support_history",
            description="Summarizes past support interactions, status transitions, and activity history.",
            category="tickets",
            risk_level=ToolRiskLevel.MEDIUM,
            execution_mode=ToolExecutionMode.READ_ONLY,
            approval_required=False,
            required_permissions=["tools:history:read"],
            input_schema=SupportHistoryInput,
            output_schema=SupportHistoryOutput,
            timeout_seconds=20.0,
            idempotent=True,
            enabled=True,
        )

    async def execute(
        self,
        input_data: BaseModel,
        context: ToolExecutionContext,
    ) -> BaseModel:
        typed_input: SupportHistoryInput = input_data  # type: ignore[assignment]
        client = get_business_api_client()

        raw_result = await client.summarize_support_history(
            payload={
                "ticketId": typed_input.ticket_id,
                "userId": typed_input.user_id,
                "status": typed_input.status_filter,
                "limit": typed_input.limit,
            },
            context=context,
        )

        records: List[SupportHistoryItem] = []
        for item in raw_result.get("records", []):
            records.append(
                SupportHistoryItem(
                    item_id=item.get("itemId", item.get("id", "")),
                    ticket_id=item.get("ticketId", item.get("ticket_id", "")),
                    activity_type=item.get("activityType", item.get("action", "activity")),
                    summary=item.get("summary", item.get("details", "")),
                    actor_id=item.get("actorId", item.get("user_id")),
                    created_at=item.get("createdAt", item.get("created_at", "")),
                )
            )

        return SupportHistoryOutput(
            total_records=len(records),
            history_records=records,
        )
