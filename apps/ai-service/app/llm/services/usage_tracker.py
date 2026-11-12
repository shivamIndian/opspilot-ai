"""Latency and token usage telemetry tracker."""

import time
from typing import Optional
from app.llm.schemas import LLMUsage, LLMMetadata


class UsageTracker:
    """Tracks generation latency and token usage metrics."""

    def __init__(self, provider: str, model: str, prompt_version: str, retrieval_mode: Optional[str] = None):
        self.provider = provider
        self.model = model
        self.prompt_version = prompt_version
        self.retrieval_mode = retrieval_mode
        self._start_time: float = 0.0
        self._latency_ms: Optional[float] = None
        self._usage: LLMUsage = LLMUsage()

    def start(self) -> "UsageTracker":
        self._start_time = time.perf_counter()
        return self

    def stop(self, usage: Optional[LLMUsage] = None) -> float:
        duration_s = time.perf_counter() - self._start_time
        self._latency_ms = round(duration_s * 1000.0, 2)
        if usage:
            self._usage = usage
        return self._latency_ms

    def to_metadata(self) -> LLMMetadata:
        return LLMMetadata(
            provider=self.provider,
            model=self.model,
            prompt_version=self.prompt_version,
            retrieval_mode=self.retrieval_mode,
            usage=self._usage,
            latency_ms=self._latency_ms,
        )
