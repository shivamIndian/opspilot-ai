"""Support ticket tool definitions (read and mutation proposals)."""

import uuid
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, model_validator
from app.tools.base import ToolDefinition
from app.tools.context import ToolExecutionContext
from app.tools.schemas import ToolRiskLevel, ToolExecutionMode, ToolActionProposal
from app.tools.clients.business_api_client import get_business_api_client


class GetTicketDetailsInput(BaseModel):
    ticket_id: Optional[str] = Field(None, description="Unique UUID identifier of the support ticket")
    ticket_number: Optional[int] = Field(None, description="Sequential ticket number")

    @model_validator(mode="after")
    def validate_ticket_identifier(self):
        if not self.ticket_id and not self.ticket_number:
            raise ValueError("Either ticket_id or ticket_number must be provided.")
        if not self.ticket_id and self.ticket_number:
            self.ticket_id = f"ticket-{self.ticket_number}"
        return self


class SafeTicketOutput(BaseModel):
    ticket_id: str
    organization_id: str
    ticket_number: Optional[int] = None
    title: str
    description: str
    status: str
    priority: str
    category: str
    created_by: Optional[str] = None
    assigned_to: Optional[str] = None
    created_at: str
    updated_at: str


class GetTicketDetailsTool(ToolDefinition):
    """Tool that retrieves details of an authorized support ticket."""

    def __init__(self):
        super().__init__(
            name="get_ticket_details",
            description="Retrieves full details for a specified support ticket within the organization.",
            category="tickets",
            risk_level=ToolRiskLevel.MEDIUM,
            execution_mode=ToolExecutionMode.READ_ONLY,
            approval_required=False,
            required_permissions=["tools:tickets:read"],
            input_schema=GetTicketDetailsInput,
            output_schema=SafeTicketOutput,
            timeout_seconds=20.0,
            idempotent=True,
            enabled=True,
        )

    async def execute(
        self,
        input_data: BaseModel,
        context: ToolExecutionContext,
    ) -> BaseModel:
        typed_input: GetTicketDetailsInput = input_data  # type: ignore[assignment]
        client = get_business_api_client()

        raw = await client.get_ticket(
            payload={"ticketId": typed_input.ticket_id},
            context=context,
        )

        return SafeTicketOutput(
            ticket_id=raw.get("ticket_id") or raw.get("id", typed_input.ticket_id),
            organization_id=raw.get("organization_id", context.organization_id),
            ticket_number=raw.get("ticket_number"),
            title=raw.get("title", ""),
            description=raw.get("description", ""),
            status=raw.get("status", "open"),
            priority=raw.get("priority", "medium"),
            category=raw.get("category", "general"),
            created_by=raw.get("created_by"),
            assigned_to=raw.get("assigned_to"),
            created_at=raw.get("created_at", ""),
            updated_at=raw.get("updated_at", ""),
        )


class CreateSupportTicketInput(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=200, description="Ticket title / summary")
    subject: Optional[str] = Field(None, min_length=3, max_length=200, description="Ticket subject alias")
    description: str = Field(..., min_length=5, max_length=5000, description="Detailed problem description")
    category: str = Field(
        default="technical",
        description="Ticket category: technical, billing, account, or feature_request",
    )
    priority: str = Field(
        default="medium",
        pattern=r"^(low|medium|high|urgent)$",
        description="Ticket priority level: low, medium, high, or urgent",
    )

    @model_validator(mode="after")
    def validate_title_alias(self):
        if not self.title and not self.subject:
            raise ValueError("Ticket title is required.")
        if not self.title and self.subject:
            self.title = self.subject
        return self


class CreateSupportTicketTool(ToolDefinition):
    """Tool that prepares a ticket creation proposal. DOES NOT mutate database directly."""

    def __init__(self):
        super().__init__(
            name="create_support_ticket",
            description="Proposes creating a new customer support ticket. Produces a proposal awaiting human approval.",
            category="tickets",
            risk_level=ToolRiskLevel.HIGH,
            execution_mode=ToolExecutionMode.PROPOSAL_ONLY,
            approval_required=True,
            required_permissions=["tools:tickets:write"],
            input_schema=CreateSupportTicketInput,
            output_schema=ToolActionProposal,
            timeout_seconds=15.0,
            idempotent=False,
            enabled=True,
        )

    async def execute(
        self,
        input_data: BaseModel,
        context: ToolExecutionContext,
    ) -> BaseModel:
        typed_input: CreateSupportTicketInput = input_data  # type: ignore[assignment]
        client = get_business_api_client()

        proposal_data = await client.create_ticket_proposal(
            payload={
                "title": typed_input.title,
                "description": typed_input.description,
                "category": typed_input.category,
                "priority": typed_input.priority,
            },
            context=context,
        )

        return ToolActionProposal(
            proposal_id=proposal_data.get("proposalId", str(uuid.uuid4())),
            organization_id=context.organization_id,
            requested_by=context.authenticated_user_id,
            tool_name=self.name,
            risk_level=ToolRiskLevel.HIGH,
            approval_required=True,
            execution_mode=ToolExecutionMode.PROPOSAL_ONLY,
            proposed_action={
                "action": "create_ticket",
                "title": typed_input.title,
                "description": typed_input.description,
                "category": typed_input.category,
                "priority": typed_input.priority,
            },
            status="awaiting_approval",
        )


class UpdateSupportTicketInput(BaseModel):
    ticket_id: str = Field(..., description="UUID of the ticket to modify")
    title: Optional[str] = Field(None, min_length=3, max_length=200, description="New ticket title")
    description: Optional[str] = Field(None, min_length=5, max_length=5000, description="New description")
    priority: Optional[str] = Field(
        None,
        pattern=r"^(low|medium|high|urgent)$",
        description="New priority level",
    )
    category: Optional[str] = Field(None, description="New ticket category")
    status: Optional[str] = Field(
        None,
        pattern=r"^(open|in_progress|resolved|closed)$",
        description="New ticket lifecycle status",
    )


class UpdateSupportTicketTool(ToolDefinition):
    """Tool that prepares a ticket modification proposal. DOES NOT mutate database directly."""

    def __init__(self):
        super().__init__(
            name="update_support_ticket",
            description="Proposes modifications to an existing support ticket. Produces a proposal awaiting human approval.",
            category="tickets",
            risk_level=ToolRiskLevel.HIGH,
            execution_mode=ToolExecutionMode.PROPOSAL_ONLY,
            approval_required=True,
            required_permissions=["tools:tickets:write"],
            input_schema=UpdateSupportTicketInput,
            output_schema=ToolActionProposal,
            timeout_seconds=15.0,
            idempotent=False,
            enabled=True,
        )

    async def execute(
        self,
        input_data: BaseModel,
        context: ToolExecutionContext,
    ) -> BaseModel:
        typed_input: UpdateSupportTicketInput = input_data  # type: ignore[assignment]
        client = get_business_api_client()

        update_fields: Dict[str, Any] = {}
        if typed_input.title is not None:
            update_fields["title"] = typed_input.title
        if typed_input.description is not None:
            update_fields["description"] = typed_input.description
        if typed_input.priority is not None:
            update_fields["priority"] = typed_input.priority
        if typed_input.category is not None:
            update_fields["category"] = typed_input.category
        if typed_input.status is not None:
            update_fields["status"] = typed_input.status

        proposal_data = await client.update_ticket_proposal(
            payload={
                "ticketId": typed_input.ticket_id,
                "changes": update_fields,
            },
            context=context,
        )

        return ToolActionProposal(
            proposal_id=proposal_data.get("proposalId", str(uuid.uuid4())),
            organization_id=context.organization_id,
            requested_by=context.authenticated_user_id,
            tool_name=self.name,
            risk_level=ToolRiskLevel.HIGH,
            approval_required=True,
            execution_mode=ToolExecutionMode.PROPOSAL_ONLY,
            proposed_action={
                "action": "update_ticket",
                "ticket_id": typed_input.ticket_id,
                "changes": update_fields,
            },
            status="awaiting_approval",
        )
