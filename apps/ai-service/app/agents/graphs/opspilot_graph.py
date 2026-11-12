"""StateGraph definition and compilation for OpsPilot enterprise multi-step agent workflow."""

import logging
from typing import Optional
from langgraph.graph import StateGraph, START, END

from app.agents.state import OpsPilotWorkflowState
from app.agents.nodes import (
    validate_input_node,
    classify_intent_node,
    create_execution_plan_node,
    validate_execution_plan_node,
    policy_evaluation_node,
    execute_next_step_node,
    observe_tool_result_node,
    evaluate_progress_node,
    revise_plan_node,
    generate_final_response_node,
    validate_response_node,
    finalize_run_node,
    await_human_approval_node,
)
from app.agents.routing import (
    route_after_policy,
    route_step_progress,
    route_after_validation,
)

logger = logging.getLogger(__name__)


def build_opspilot_workflow(checkpointer=None):
    """Builds and compiles the OpsPilot multi-step stateful agent execution graph.

    Graph Topology:
    START -> validate_input -> classify_intent -> create_execution_plan -> validate_execution_plan -> policy_evaluation
          -> [conditional routing: execute_next_step | generate_final_response]
          
    Multi-Step Execution Loop:
    execute_next_step -> observe_tool_result -> evaluate_progress
          -> [conditional routing: next_step -> execute_next_step | replan -> revise_plan -> execute_next_step | finalize -> generate_final_response]

    Output Pipeline:
    generate_final_response -> validate_response -> finalize_execution -> END
    """
    builder = StateGraph(OpsPilotWorkflowState)

    # 1. Register Nodes
    builder.add_node("validate_input", validate_input_node)
    builder.add_node("classify_intent", classify_intent_node)
    builder.add_node("create_execution_plan", create_execution_plan_node)
    builder.add_node("validate_execution_plan", validate_execution_plan_node)
    builder.add_node("policy_evaluation", policy_evaluation_node)
    builder.add_node("execute_next_step", execute_next_step_node)
    builder.add_node("observe_tool_result", observe_tool_result_node)
    builder.add_node("evaluate_progress", evaluate_progress_node)
    builder.add_node("revise_plan", revise_plan_node)
    builder.add_node("generate_final_response", generate_final_response_node)
    builder.add_node("validate_response", validate_response_node)
    builder.add_node("await_human_approval", await_human_approval_node)
    builder.add_node("finalize_execution", finalize_run_node)

    # 2. Sequential Ingestion, Classification & Planning Edges
    builder.add_edge(START, "validate_input")
    builder.add_edge("validate_input", "classify_intent")
    builder.add_edge("classify_intent", "create_execution_plan")
    builder.add_edge("create_execution_plan", "validate_execution_plan")
    builder.add_edge("validate_execution_plan", "policy_evaluation")

    # 3. Policy Conditional Routing Edge
    builder.add_conditional_edges(
        "policy_evaluation",
        route_after_policy,
        {
            "execute_next_step": "execute_next_step",
            "generate_final_response": "generate_final_response",
        },
    )

    # 4. Multi-Step Execution Loop Edges
    builder.add_edge("execute_next_step", "observe_tool_result")
    builder.add_edge("observe_tool_result", "evaluate_progress")

    # 5. Progress Conditional Routing Edge
    builder.add_conditional_edges(
        "evaluate_progress",
        route_step_progress,
        {
            "execute_next_step": "execute_next_step",
            "revise_plan": "revise_plan",
            "generate_final_response": "generate_final_response",
        },
    )

    # Replan resumes execution loop at execute_next_step
    builder.add_edge("revise_plan", "execute_next_step")

    # 6. Response Synthesis, Validation & Finalization Pipeline
    builder.add_edge("generate_final_response", "validate_response")
    builder.add_conditional_edges(
        "validate_response",
        route_after_validation,
        {
            "await_human_approval": "await_human_approval",
            "finalize_execution": "finalize_execution",
        },
    )
    # When human approval decision is delivered via resume, await_human_approval routes back to response generation
    builder.add_edge("await_human_approval", "generate_final_response")
    builder.add_edge("finalize_execution", END)

    compiled_graph = builder.compile(checkpointer=checkpointer)
    logger.info("OpsPilot Multi-Step Agent StateGraph successfully constructed and compiled.")
    return compiled_graph
