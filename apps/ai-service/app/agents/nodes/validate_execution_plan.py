"""Node for validating multi-step execution plans against DAG and safety invariants."""

import logging
from typing import Dict, Any
from langchain_core.runnables import RunnableConfig

from app.agents.state import OpsPilotWorkflowState
from app.agents.schemas import MultiStepExecutionPlan
from app.agents.services.plan_validation_service import PlanValidationService
from app.agents.exceptions import (
    PlanValidationError,
    PlanStepLimitExceededError,
    PlanUnknownDependencyError,
    PlanDependencyCycleError,
)

logger = logging.getLogger(__name__)


async def validate_execution_plan_node(
    state: OpsPilotWorkflowState,
    config: RunnableConfig,
) -> Dict[str, Any]:
    """Validates multi-step plan structure, dependencies, tool names, and argument schemas."""
    plan_dict = state.get("execution_plan") or {}
    steps = plan_dict.get("steps", [])

    # If 0 steps planned (e.g. conversational inquiry), validation passes trivially
    if not steps:
        return {
            "current_node": "validate_execution_plan",
            "policy_approved": True,
        }

    try:
        plan_model = MultiStepExecutionPlan(**plan_dict)
        PlanValidationService.validate_plan(plan_model)
        logger.info(
            f"[WorkflowNode:validate_execution_plan] Plan validated successfully ({len(steps)} steps) for run '{state.get('run_id')}'"
        )
        return {
            "current_node": "validate_execution_plan",
            "policy_approved": True,
        }
    except (
        PlanStepLimitExceededError,
        PlanUnknownDependencyError,
        PlanDependencyCycleError,
        PlanValidationError,
    ) as e:
        logger.error(
            f"[WorkflowNode:validate_execution_plan] Plan validation rejected: {e.error_code} - {e.message}"
        )
        return {
            "current_node": "validate_execution_plan",
            "policy_approved": False,
            "policy_reason": f"Plan validation rejected: {e.message}",
            "error_code": e.error_code,
            "workflow_status": "blocked",
        }
    except Exception as e:
        logger.error(f"[WorkflowNode:validate_execution_plan] Unexpected plan validation error: {e}")
        return {
            "current_node": "validate_execution_plan",
            "policy_approved": False,
            "policy_reason": f"Unexpected plan validation error: {str(e)}",
            "error_code": "PLAN_VALIDATION_ERROR",
            "workflow_status": "blocked",
        }
