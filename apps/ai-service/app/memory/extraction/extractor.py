"""LLM-based candidate memory extractor from multi-turn conversations."""

import json
import logging
import os
import uuid
from typing import List, Dict, Any, Optional
from app.llm.provider_factory import get_llm_provider
from app.memory.schemas import MemoryCandidateProposal, MemoryType
from app.memory.extraction.memory_classifier import MemoryClassifier
from app.memory.extraction.memory_validator import MemoryValidator
from app.memory.services.memory_screening_service import get_memory_screening_service
from app.memory.exceptions import MemoryExtractionError

logger = logging.getLogger("opspilot.memory.extractor")


class ConversationMemoryExtractor:
    """Extracts proposed long-term user memories from conversation messages using LLM."""

    def __init__(self, prompt_template_path: Optional[str] = None):
        if prompt_template_path is None:
            prompt_template_path = os.path.join(
                os.path.dirname(os.path.dirname(__file__)),
                "prompts",
                "memory_extraction_v1.txt",
            )
        self.prompt_template_path = prompt_template_path
        self._template: Optional[str] = None
        self.screening_service = get_memory_screening_service()

    def _load_template(self) -> str:
        if self._template is None:
            with open(self.prompt_template_path, "r", encoding="utf-8") as f:
                self._template = f.read()
        return self._template

    def _format_transcript(self, messages: List[Dict[str, Any]]) -> str:
        transcript_lines = []
        for msg in messages:
            role = msg.get("role", "unknown").upper()
            content = msg.get("content", "")
            if isinstance(content, list):
                # in case of multi-part content
                parts = []
                for p in content:
                    if isinstance(p, dict) and "text" in p:
                        parts.append(p["text"])
                    elif isinstance(p, str):
                        parts.append(p)
                content = " ".join(parts)
            transcript_lines.append(f"{role}: {content}")
        return "\n".join(transcript_lines)

    async def extract_candidates(
        self,
        messages: List[Dict[str, Any]],
        workflow_context: Optional[Dict[str, Any]] = None,
    ) -> List[MemoryCandidateProposal]:
        """Extract memory proposals from conversation messages."""
        if not messages:
            return []

        transcript = self._format_transcript(messages)
        template = self._load_template()
        prompt = template.replace("{transcript}", transcript)

        llm_provider = get_llm_provider()

        try:
            messages_payload = [
                {
                    "role": "system",
                    "content": "You are an enterprise AI memory extraction specialist. Respond only with valid JSON.",
                },
                {"role": "user", "content": prompt},
            ]
            raw_text, _ = await llm_provider.generate(
                messages=messages_payload,
                temperature=0.1,
                max_tokens=1500,
            )
            raw_text = raw_text.strip()
            
            # Clean markdown JSON wrapping if present
            if raw_text.startswith("```json"):
                raw_text = raw_text[7:]
            if raw_text.startswith("```"):
                raw_text = raw_text[3:]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]
            raw_text = raw_text.strip()

            parsed = json.loads(raw_text)
            raw_candidates = parsed.get("candidates", [])
        except Exception as e:
            logger.warning("Failed to extract memories via LLM: %s", e)
            return []

        valid_proposals: List[MemoryCandidateProposal] = []

        for item in raw_candidates:
            try:
                mem_type, category = MemoryClassifier.normalize_type_and_category(
                    item.get("memory_type", "preference"),
                    item.get("category", ""),
                )
                title = str(item.get("title", "")).strip()
                content = str(item.get("content", "")).strip()
                importance = MemoryClassifier.clamp_importance(item.get("importance_score", 5))
                confidence = float(item.get("confidence", 0.85))
                reasoning = str(item.get("reasoning", "Extracted from recent conversation")).strip()

                proposal = MemoryCandidateProposal(
                    candidate_id=str(uuid.uuid4()),
                    memory_type=mem_type,
                    category=category,
                    title=title,
                    content=content,
                    importance_score=importance,
                    confidence=confidence,
                    reasoning=reasoning,
                )

                # 1. Structural validation
                is_valid, errs = MemoryValidator.validate_candidate(proposal)
                if not is_valid:
                    logger.debug("Candidate failed validation: %s", errs)
                    continue

                # 2. Security screening (credentials, PII, prompt injections)
                is_safe, violations = self.screening_service.screen_text(proposal.content)
                if not is_safe:
                    logger.warning("Extracted memory candidate screened out: %s", violations)
                    continue

                is_title_safe, _ = self.screening_service.screen_text(proposal.title)
                if not is_title_safe:
                    continue

                valid_proposals.append(proposal)

            except Exception as item_err:
                logger.debug("Error parsing memory candidate item: %s", item_err)
                continue

        return valid_proposals
