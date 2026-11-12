"""Progress evaluation service for determining subsequent workflow graph edge."""

import logging
from typing import Dict, Any, List, Optional
from app.agents.schemas import StepProgressDecision, ProgressEvaluation
from app.agents.constants import (
    MAX_TOOL_CALLS_PER_RUN,
    MAX_REPLANNING_ATTEMPTS,
    MAX_PLAN_STEPS,
)

logger = logging.getLogger(__name__)


class ProgressService:
    """Evaluates intermediate execution state to select next branch (next_step, replan, finalize)."""

    @classmethod
    def evaluate_step_outcome(
        cls,
        current_step_index: int,
        total_steps: int,
        tool_call_count: int,
        replan_count: int,
        completed_steps: List[str],
        failed_steps: List[str],
        tool_results: Dict[str, Any],
        plan_steps: List[Dict[str, Any]],
    ) -> ProgressEvaluation:
        """Determines whether the workflow should proceed to the next planned step, trigger replanning, or finalize."""

        # 1. Enforce Hard Execution Limits
        if tool_call_count >= MAX_TOOL_CALLS_PER_RUN:
            logger.warning(
                f"[ProgressService] Max tool calls ({MAX_TOOL_CALLS_PER_RUN}) reached. Finalizing run."
            )
            return ProgressEvaluation(
                decision=StepProgressDecision.FINALIZE,
                rationale=f"Maximum tool invocations ({MAX_TOOL_CALLS_PER_RUN}) reached.",
            )

        # 2. Check for step failure and evaluate replan feasibility
        if failed_steps:
            if replan_count < MAX_REPLANNING_ATTEMPTS:
                last_failed = failed_steps[-1]
                logger.info(
                    f"[ProgressService] Step '{last_failed}' failed. Triggering bounded replan ({replan_count + 1}/{MAX_REPLANNING_ATTEMPTS})."
                )
                return ProgressEvaluation(
                    decision=StepProgressDecision.REPLAN,
                    rationale=f"Step '{last_failed}' encountered recoverable failure. Formulating revised plan.",
                    replan_reason=f"Step '{last_failed}' failed.",
                    step_id_to_retry=last_failed,
                )
            else:
                logger.warning(
                    f"[ProgressService] Replanning limit ({MAX_REPLANNING_ATTEMPTS}) reached. Finalizing execution."
                )
                return ProgressEvaluation(
                    decision=StepProgressDecision.FINALIZE,
                    rationale=f"Replanning limit ({MAX_REPLANNING_ATTEMPTS}) reached. Unable to recover step failure.",
                )

        # 3. Smart operational heuristics (e.g. duplicate ticket prevention)
        # If a previous step searched tickets or history and found a matching open ticket,
        # and the next step is proposing to create a ticket with condition "no existing ticket":
        next_step_idx = current_step_index + 1
        if next_step_idx < total_steps and next_step_idx < len(plan_steps):
            next_step = plan_steps[next_step_idx]
            condition = str(next_step.get("condition") or "").lower()

            if "no matching" in condition or "not already reported" in condition:
                # Check previous tool results for found tickets
                for res in tool_results.values():
                    if isinstance(res, dict):
                        # If get_ticket_details or summarize_support_history returned open tickets
                        tickets = res.get("history_records") or res.get("tickets") or []
                        if isinstance(tickets, list) and len(tickets) > 0:
                            # Existing open issue found! Condition not satisfied.
                            logger.info(
                                "[ProgressService] Found existing support record matching condition. Skipping ticket creation."
                            )
                            # Finalize early or replan
                            return ProgressEvaluation(
                                decision=StepProgressDecision.FINALIZE,
                                rationale="Existing support ticket already found. Skipped duplicate creation step.",
                            )

        # 4. Check if more steps remain in the active plan
        if next_step_idx < total_steps and next_step_idx < len(plan_steps):
            return ProgressEvaluation(
                decision=StepProgressDecision.NEXT_STEP,
                rationale=f"Step {current_step_index + 1}/{total_steps} complete. Advancing to step {next_step_idx + 1}.",
            )

        # 5. All planned steps completed
        return ProgressEvaluation(
            decision=StepProgressDecision.FINALIZE,
            rationale="All planned steps executed successfully.",
        )


progress_service = ProgressService()
