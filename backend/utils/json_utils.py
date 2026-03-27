"""Shared utility for extracting JSON from LLM (Claude) responses."""

from __future__ import annotations

import json
import logging
from typing import Any, Dict

logger = logging.getLogger(__name__)


def extract_json_from_llm_response(text: str) -> Dict[str, Any]:
    """
    Extract and parse JSON from an LLM response.

    Handles:
    - Clean JSON strings
    - Markdown fenced blocks (```json ... ``` or ``` ... ```)
    - JSON embedded within surrounding free text

    Returns a parsed dict on success, or a safe fallback dict on failure.
    """
    cleaned = text.strip()

    # Strip markdown code fences if present
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        inner = lines[1:-1] if lines[-1].startswith("```") else lines[1:]
        cleaned = "\n".join(inner)

    # Attempt direct parse
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Fallback: locate the outermost JSON object in free text
    start = cleaned.find("{")
    end = cleaned.rfind("}") + 1
    if start != -1 and end > start:
        try:
            return json.loads(cleaned[start:end])
        except json.JSONDecodeError:
            pass

    logger.warning("extract_json_from_llm_response: could not parse JSON from LLM response")
    return {
        "error": "Could not parse LLM response as JSON.",
        "raw_text": text,
    }
