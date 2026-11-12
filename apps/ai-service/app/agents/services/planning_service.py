"""Planning service coordinating multi-step execution plan generation and revision."""

import logging
from pathlib import Path
from typing import Optional, Dict, Any, List
from app.llm import get_llm_provider
from app.agents.schemas import MultiStepExecutionPlan, PlanStep
from app.agents.services.plan_validation_service import PlanValidationService

logger = logging.getLogger(__name__)

PROMPTS_DIR = Path(__file__).parent.parent / "prompts"


class PlanningService:
    """Generates and revises structured multi-step execution plans."""

    def __init__(self):
        self._planner_prompt: Optional[str] = None

    def _load_prompt(self) -> str:
        if self._planner_prompt is None:
            prompt_path = PROMPTS_DIR / "multistep_planner_v1.txt"
            if prompt_path.exists():
                self._planner_prompt = prompt_path.read_text(encoding="utf-8")
            else:
                self._planner_prompt = (
                    "You are OpsPilot AI Multi-Step Planner. Create a structured execution plan with max 5 steps."
                )
        return self._planner_prompt

    async def create_initial_plan(
        self,
        query: str,
        intent: str,
    ) -> MultiStepExecutionPlan:
        """Invokes structured LLM to formulate an ordered multi-step execution plan."""
        system_prompt = self._load_prompt()
        user_message = (
            f"User Query: {query}\n"
            f"Classified Intent: {intent}\n\n"
            "Formulate an ordered execution plan to fulfill the user's objective using available tools."
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ]

        llm = get_llm_provider()
        plan, _ = await llm.generate_structured(
            messages=messages,
            response_schema=MultiStepExecutionPlan,
        )

        # Validate against safety rules and DAG invariants
        PlanValidationService.validate_plan(plan)
        return plan

    async def revise_plan(
        self,
        original_plan: MultiStepExecutionPlan,
        completed_steps: List[str],
        tool_results: Dict[str, Any],
        replan_reason: str,
    ) -> MultiStepExecutionPlan:
        """Revises an existing plan to adapt to intermediate observations while preserving completed work."""
        system_prompt = self._load_prompt()

        summary_completed = ", ".join(completed_steps) if completed_steps else "None"
        user_message = (
            f"Original Objective: {original_plan.objective}\n"
            f"Completed Steps (DO NOT REPEAT): {summary_completed}\n"
            f"Reason for Revision: {replan_reason}\n"
            f"Intermediate Observations: {str(tool_results)[:1000]}\n\n"
            "Create a revised plan for the REMAINING steps necessary to achieve the objective."
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ]

        llm = get_llm_provider()
        revised_plan, _ = await llm.generate_structured(
            messages=messages,
            response_schema=MultiStepExecutionPlan,
        )

        # Validate revised plan
        PlanValidationService.validate_plan(revised_plan)
        return revised_plan


planning_service = PlanningService()
