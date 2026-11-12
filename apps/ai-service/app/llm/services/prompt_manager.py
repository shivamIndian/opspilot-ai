"""Centralized versioned prompt manager for OpsPilot AI."""

import os
from pathlib import Path
from typing import Dict, List, Any, Optional

from app.llm.exceptions import LLMConfigurationError

PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"


class PromptManager:
    """Manages loading, versioning, and formatting of system prompts and RAG templates."""

    def __init__(self, prompts_base_dir: Optional[Path] = None):
        self.base_dir = prompts_base_dir or PROMPTS_DIR
        self._system_cache: Dict[str, str] = {}
        self._template_cache: Dict[str, str] = {}

    def get_system_prompt(self, version: str = "rag_assistant_v1") -> str:
        """Retrieves and caches the system prompt by version."""
        if version in self._system_cache:
            return self._system_cache[version]

        prompt_file = self.base_dir / "system" / f"{version}.txt"
        if not prompt_file.exists():
            raise LLMConfigurationError(
                f"Requested system prompt version '{version}' not found at {prompt_file}"
            )

        with open(prompt_file, "r", encoding="utf-8") as f:
            content = f.read().strip()

        self._system_cache[version] = content
        return content

    def get_template(self, template_name: str = "rag_answer_v1") -> str:
        """Retrieves and caches the user prompt template."""
        if template_name in self._template_cache:
            return self._template_cache[template_name]

        template_file = self.base_dir / "templates" / f"{template_name}.txt"
        if not template_file.exists():
            raise LLMConfigurationError(
                f"Requested prompt template '{template_name}' not found at {template_file}"
            )

        with open(template_file, "r", encoding="utf-8") as f:
            content = f.read().strip()

        self._template_cache[template_name] = content
        return content

    def build_messages(
        self,
        query: str,
        formatted_context: str,
        system_version: str = "rag_assistant_v1",
        template_name: str = "rag_answer_v1",
    ) -> List[Dict[str, str]]:
        """Constructs the complete chat messages array for LLM invocation."""
        system_prompt = self.get_system_prompt(system_version)
        template = self.get_template(template_name)

        user_content = template.format(
            query=query.strip(),
            context=formatted_context.strip() if formatted_context.strip() else "[NO RELEVANT DOCUMENTS FOUND]",
        )

        return [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ]


_default_prompt_manager: Optional[PromptManager] = None


def get_prompt_manager() -> PromptManager:
    global _default_prompt_manager
    if _default_prompt_manager is None:
        _default_prompt_manager = PromptManager()
    return _default_prompt_manager
