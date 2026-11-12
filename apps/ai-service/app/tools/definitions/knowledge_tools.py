"""Knowledge base search tool definition."""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from app.tools.base import ToolDefinition
from app.tools.context import ToolExecutionContext
from app.tools.schemas import ToolRiskLevel, ToolExecutionMode
from app.tools.clients.business_api_client import get_business_api_client


class SearchKnowledgeBaseInput(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000, description="Natural language search query")
    top_k: int = Field(default=5, ge=1, le=20, description="Maximum number of relevant chunks to retrieve")
    retrieval_mode: str = Field(
        default="hybrid",
        pattern=r"^(hybrid|semantic|keyword)$",
        description="Search mode: hybrid, semantic, or keyword",
    )


class KnowledgePassageItem(BaseModel):
    chunk_id: str
    document_id: str
    document_name: str
    page_start: Optional[int] = None
    page_end: Optional[int] = None
    section_title: Optional[str] = None
    content: str
    relevance_score: float


class SearchKnowledgeBaseOutput(BaseModel):
    result_count: int
    query: str
    retrieval_mode: str
    passages: List[KnowledgePassageItem] = Field(default_factory=list)


class SearchKnowledgeBaseTool(ToolDefinition):
    """Tool that performs hybrid knowledge search across company documentation."""

    def __init__(self):
        super().__init__(
            name="search_knowledge_base",
            description="Searches authorized organization knowledge documents and returns verified, cited passages.",
            category="knowledge",
            risk_level=ToolRiskLevel.LOW,
            execution_mode=ToolExecutionMode.READ_ONLY,
            approval_required=False,
            required_permissions=["tools:knowledge:read"],
            input_schema=SearchKnowledgeBaseInput,
            output_schema=SearchKnowledgeBaseOutput,
            timeout_seconds=25.0,
            idempotent=True,
            enabled=True,
        )

    async def execute(
        self,
        input_data: BaseModel,
        context: ToolExecutionContext,
    ) -> BaseModel:
        typed_input: SearchKnowledgeBaseInput = input_data  # type: ignore[assignment]
        client = get_business_api_client()

        raw_result = await client.search_knowledge(
            payload={
                "query": typed_input.query,
                "topK": typed_input.top_k,
                "retrievalMode": typed_input.retrieval_mode,
            },
            context=context,
        )

        passages: List[KnowledgePassageItem] = []
        for item in raw_result.get("passages", []):
            passages.append(
                KnowledgePassageItem(
                    chunk_id=item.get("chunkId", item.get("chunk_id", "")),
                    document_id=item.get("documentId", item.get("document_id", "")),
                    document_name=item.get("documentName", item.get("document_name", "Untitled")),
                    page_start=item.get("pageStart", item.get("page_start")),
                    page_end=item.get("pageEnd", item.get("page_end")),
                    section_title=item.get("sectionTitle", item.get("section_title")),
                    content=item.get("content", item.get("text", "")),
                    relevance_score=float(item.get("relevanceScore", item.get("score", 0.0))),
                )
            )

        return SearchKnowledgeBaseOutput(
            result_count=len(passages),
            query=typed_input.query,
            retrieval_mode=typed_input.retrieval_mode,
            passages=passages,
        )
