"""Centralized operational constants and bounded execution limits for OpsPilot AI agents."""

from app.config.settings import settings

# Bounded Execution Limits (Section 6)
MAX_PLAN_STEPS: int = settings.AGENT_MAX_PLAN_STEPS
MAX_TOOL_CALLS_PER_RUN: int = settings.AGENT_MAX_TOOL_CALLS_PER_RUN
MAX_REPLANNING_ATTEMPTS: int = settings.AGENT_MAX_REPLANNING_ATTEMPTS
MAX_MUTATION_PROPOSALS_PER_RUN: int = settings.AGENT_MAX_MUTATION_PROPOSALS_PER_RUN
MAX_TOOL_RETRIES: int = settings.AGENT_MAX_TOOL_RETRIES
MAX_WORKFLOW_DURATION_SECONDS: int = settings.AGENT_MAX_WORKFLOW_DURATION_SECONDS
MAX_PLAN_REVISIONS: int = settings.AGENT_MAX_PLAN_REVISIONS

# Allowlisted Action Types
ACTION_TYPE_READ: str = "read"
ACTION_TYPE_MUTATION_PROPOSAL: str = "mutation_proposal"
ACTION_TYPE_NONE: str = "none"

ALLOWED_ACTION_TYPES = {
    ACTION_TYPE_READ,
    ACTION_TYPE_MUTATION_PROPOSAL,
    ACTION_TYPE_NONE,
    # Backward compatibility with Module 12
    "propose_mutation",
}

# Allowlisted Tools
APPROVED_TOOL_NAMES = {
    "search_knowledge_base",
    "get_ticket_details",
    "search_user_information",
    "summarize_support_history",
    "create_support_ticket",
    "update_support_ticket",
}
