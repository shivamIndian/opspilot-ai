"""User information search tool definition with strict privacy controls."""

from typing import Optional, List
from pydantic import BaseModel, Field
from app.tools.base import ToolDefinition
from app.tools.context import ToolExecutionContext
from app.tools.schemas import ToolRiskLevel, ToolExecutionMode
from app.tools.clients.business_api_client import get_business_api_client


class SearchUserInput(BaseModel):
    query: Optional[str] = Field(None, max_length=100, description="Name search term")
    role: Optional[str] = Field(None, description="Filter by organization member role (owner, admin, member, viewer)")
    limit: int = Field(default=10, ge=1, le=50, description="Maximum number of users to return")


class UserSummaryItem(BaseModel):
    user_id: str
    name: str
    role: str
    status: str


class SearchUserOutput(BaseModel):
    total_found: int
    users: List[UserSummaryItem] = Field(default_factory=list)


class SearchUserInformationTool(ToolDefinition):
    """Tool that searches authorized organization members without exposing sensitive PII or credentials."""

    def __init__(self):
        super().__init__(
            name="search_user_information",
            description="Searches active members of the organization. Only reveals name, user ID, role and status.",
            category="users",
            risk_level=ToolRiskLevel.MEDIUM,
            execution_mode=ToolExecutionMode.READ_ONLY,
            approval_required=False,
            required_permissions=["tools:users:read"],
            input_schema=SearchUserInput,
            output_schema=SearchUserOutput,
            timeout_seconds=15.0,
            idempotent=True,
            enabled=True,
        )

    async def execute(
        self,
        input_data: BaseModel,
        context: ToolExecutionContext,
    ) -> BaseModel:
        typed_input: SearchUserInput = input_data  # type: ignore[assignment]
        client = get_business_api_client()

        raw_result = await client.search_users(
            payload={
                "query": typed_input.query,
                "role": typed_input.role,
                "limit": typed_input.limit,
            },
            context=context,
        )

        users: List[UserSummaryItem] = []
        for item in raw_result.get("users", []):
            users.append(
                UserSummaryItem(
                    user_id=item.get("userId", item.get("user_id", "")),
                    name=item.get("name", "Unknown User"),
                    role=item.get("role", "member"),
                    status=item.get("status", "active"),
                )
            )

        return SearchUserOutput(
            total_found=len(users),
            users=users,
        )
