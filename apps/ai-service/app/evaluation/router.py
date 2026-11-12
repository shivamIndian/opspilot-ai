"""Internal API router for AI Evaluation datasets, runs, metrics, and comparisons."""

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status

from app.embeddings.router import verify_internal_service_token
from app.evaluation.schemas import (
    EvaluationDatasetCreate,
    EvaluationDatasetItem,
    EvaluationExampleCreate,
    EvaluationExampleItem,
    EvaluationRunCreate,
    EvaluationRunItem,
    EvaluationRunResultItem,
    EvaluationComparisonResult,
)
from app.evaluation.service import EvaluationService, get_evaluation_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/internal/v1/evaluation", tags=["internal-ai-evaluation"])


@router.get(
    "/datasets",
    response_model=List[EvaluationDatasetItem],
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(verify_internal_service_token)],
    summary="List Evaluation Datasets",
)
async def list_datasets_endpoint(
    organization_id: str = Query(..., description="Target organization UUID"),
    service: EvaluationService = Depends(get_evaluation_service),
) -> List[EvaluationDatasetItem]:
    return await service.list_datasets(organization_id)


@router.post(
    "/datasets",
    response_model=EvaluationDatasetItem,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_internal_service_token)],
    summary="Create Evaluation Dataset",
)
async def create_dataset_endpoint(
    payload: EvaluationDatasetCreate,
    organization_id: str = Query(..., description="Target organization UUID"),
    service: EvaluationService = Depends(get_evaluation_service),
) -> EvaluationDatasetItem:
    return await service.create_dataset(organization_id, payload)


@router.get(
    "/datasets/{dataset_id}",
    dependencies=[Depends(verify_internal_service_token)],
    summary="Get Evaluation Dataset Details",
)
async def get_dataset_endpoint(
    dataset_id: str,
    organization_id: str = Query(..., description="Target organization UUID"),
    service: EvaluationService = Depends(get_evaluation_service),
):
    data = await service.get_dataset(organization_id, dataset_id)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "DATASET_NOT_FOUND", "message": f"Dataset '{dataset_id}' not found"},
        )
    return data


@router.post(
    "/datasets/{dataset_id}/examples",
    response_model=List[EvaluationExampleItem],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_internal_service_token)],
    summary="Add Examples to Evaluation Dataset",
)
async def add_examples_endpoint(
    dataset_id: str,
    examples: List[EvaluationExampleCreate],
    organization_id: str = Query(..., description="Target organization UUID"),
    service: EvaluationService = Depends(get_evaluation_service),
) -> List[EvaluationExampleItem]:
    try:
        return await service.add_examples(organization_id, dataset_id, examples)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "DATASET_NOT_FOUND", "message": str(e)},
        )


@router.post(
    "/runs",
    response_model=EvaluationRunItem,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_internal_service_token)],
    summary="Execute Evaluation Run",
)
async def start_evaluation_run_endpoint(
    payload: EvaluationRunCreate,
    organization_id: str = Query(..., description="Target organization UUID"),
    service: EvaluationService = Depends(get_evaluation_service),
) -> EvaluationRunItem:
    try:
        return await service.start_evaluation_run(organization_id, payload)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "DATASET_NOT_FOUND", "message": str(e)},
        )


@router.get(
    "/runs",
    response_model=List[EvaluationRunItem],
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(verify_internal_service_token)],
    summary="List Evaluation Runs",
)
async def list_runs_endpoint(
    organization_id: str = Query(..., description="Target organization UUID"),
    service: EvaluationService = Depends(get_evaluation_service),
) -> List[EvaluationRunItem]:
    return await service.list_runs(organization_id)


@router.get(
    "/runs/{run_id}",
    response_model=EvaluationRunItem,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(verify_internal_service_token)],
    summary="Get Evaluation Run Details",
)
async def get_run_endpoint(
    run_id: str,
    organization_id: str = Query(..., description="Target organization UUID"),
    service: EvaluationService = Depends(get_evaluation_service),
) -> EvaluationRunItem:
    run = await service.get_run(organization_id, run_id)
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "RUN_NOT_FOUND", "message": f"Evaluation run '{run_id}' not found"},
        )
    return run


@router.get(
    "/runs/{run_id}/results",
    response_model=List[EvaluationRunResultItem],
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(verify_internal_service_token)],
    summary="Get Evaluation Run Detailed Results",
)
async def get_run_results_endpoint(
    run_id: str,
    organization_id: str = Query(..., description="Target organization UUID"),
    service: EvaluationService = Depends(get_evaluation_service),
) -> List[EvaluationRunResultItem]:
    try:
        return await service.get_run_results(organization_id, run_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "RUN_NOT_FOUND", "message": str(e)},
        )


@router.get(
    "/compare",
    response_model=EvaluationComparisonResult,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(verify_internal_service_token)],
    summary="Compare Two Evaluation Runs",
)
async def compare_runs_endpoint(
    organization_id: str = Query(..., description="Target organization UUID"),
    run_id_a: str = Query(..., description="First run identifier (baseline)"),
    run_id_b: str = Query(..., description="Second run identifier (candidate)"),
    service: EvaluationService = Depends(get_evaluation_service),
) -> EvaluationComparisonResult:
    try:
        return await service.compare_runs(organization_id, run_id_a, run_id_b)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "RUN_NOT_FOUND", "message": str(e)},
        )
