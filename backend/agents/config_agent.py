from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import anthropic

from backend.config import settings
from backend.redis_client import publish_message
from backend.utils.json_utils import extract_json_from_llm_response

logger = logging.getLogger(__name__)

CONFIG_GEN_SYSTEM_PROMPT = """
Eres un ingeniero de redes senior especialista en Cisco IOS/IOS-XE.
Genera comandos de configuración CLI de Cisco precisos y seguros basado en la sugerencia dada.

REGLAS:
- Usa solo comandos válidos para Cisco IOS/IOS-XE.
- Incluye siempre los comandos de verificación después de aplicar.
- Nunca incluyas contraseñas en claro.
- Si no tienes suficiente información para generar una configuración segura, dilo explícitamente.
- Responde SOLO con JSON estructurado:
{
  "commands": ["list", "of", "cli", "commands"],
  "verification_commands": ["show commands to verify"],
  "rollback_commands": ["commands to undo if needed"],
  "warnings": ["any important warnings"],
  "notes": "Additional context or caveats"
}
"""


class ConfigAgent:
    """
    Generates Cisco CLI configuration commands from analyst suggestions.
    Can optionally push them to devices via Netmiko (when dry_run=False and approved).
    """

    async def generate_config(
        self,
        suggestion: Dict[str, Any],
        dry_run: Optional[bool] = None,
    ) -> Dict[str, Any]:
        """
        Generate CLI commands for a suggestion from the analyst.

        If dry_run=True (default from settings): returns commands without applying.
        If dry_run=False and REQUIRE_APPROVAL=True: raises unless approved.
        If dry_run=False and approved: uses Netmiko to push config.

        Returns:
            { commands, dry_run, applied, result, verification_commands, rollback_commands, warnings }
        """
        if dry_run is None:
            dry_run = settings.config_agent_dry_run_default

        # Short-circuit for suggestions that don't need config changes
        if not suggestion.get("requires_config_change", False):
            return {
                "commands": [],
                "dry_run": dry_run,
                "applied": False,
                "result": "No configuration change required for this suggestion.",
                "verification_commands": [],
                "rollback_commands": [],
                "warnings": [],
            }

        if not settings.anthropic_api_key:
            raise RuntimeError("ANTHROPIC_API_KEY is not set")

        # Generate CLI commands via Claude
        generated = await self._generate_via_claude(suggestion)

        commands: List[str] = generated.get("commands", [])
        verification_commands: List[str] = generated.get("verification_commands", [])
        rollback_commands: List[str] = generated.get("rollback_commands", [])
        warnings: List[str] = generated.get("warnings", [])

        if dry_run:
            logger.info(
                "ConfigAgent: dry_run=True, returning %d commands without applying.",
                len(commands),
            )
            return {
                "commands": commands,
                "dry_run": True,
                "applied": False,
                "result": f"DRY RUN: {len(commands)} commands generated (not applied).",
                "verification_commands": verification_commands,
                "rollback_commands": rollback_commands,
                "warnings": warnings,
                "notes": generated.get("notes"),
            }

        # dry_run=False — check approval requirement
        if settings.config_agent_require_approval:
            approved = suggestion.get("approved", False)
            if not approved:
                raise PermissionError(
                    "Configuration push requires explicit approval. "
                    "Set suggestion['approved']=True or disable REQUIRE_APPROVAL."
                )

        # Push config via Netmiko
        target = suggestion.get("target", "")
        push_result = await self._push_via_netmiko(target, commands, suggestion)

        return {
            "commands": commands,
            "dry_run": False,
            "applied": push_result.get("success", False),
            "result": push_result.get("output", ""),
            "error": push_result.get("error"),
            "verification_commands": verification_commands,
            "rollback_commands": rollback_commands,
            "warnings": warnings,
            "notes": generated.get("notes"),
        }

    async def _generate_via_claude(self, suggestion: Dict[str, Any]) -> Dict[str, Any]:
        """Call Claude to generate CLI commands from a suggestion dict."""
        import json

        client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        user_content = (
            "Genera los comandos de configuración CLI de Cisco para la siguiente sugerencia:\n\n"
            + json.dumps(suggestion, indent=2, default=str)
        )

        try:
            response = await client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=2048,
                system=CONFIG_GEN_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_content}],
            )
            raw = response.content[0].text
            return extract_json_from_llm_response(raw)
        except anthropic.APIStatusError as exc:
            logger.error("ConfigAgent: Anthropic API error: %s", exc)
            raise
        except Exception as exc:
            logger.error("ConfigAgent: Unexpected error: %s", exc)
            raise


    async def _push_via_netmiko(
        self, target: str, commands: List[str], suggestion: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Push commands to a device using Netmiko (blocking in thread via asyncio.to_thread)."""

        def _sync_push() -> Dict[str, Any]:
            try:
                from netmiko import (
                    ConnectHandler,
                    NetmikoTimeoutException,
                    NetmikoAuthenticationException,
                )

                meta = suggestion.get("meta") or {}
                device = {
                    "device_type": meta.get("device_type", "cisco_ios"),
                    "host": meta.get("host", target),
                    "username": meta.get("username", "admin"),
                    "password": meta.get("password", ""),
                    "timeout": 30,
                }
                with ConnectHandler(**device) as conn:
                    conn.enable()
                    output = conn.send_config_set(commands)
                    return {"success": True, "output": output}
            except ImportError:
                return {
                    "success": False,
                    "error": "netmiko not installed",
                    "output": "",
                }
            except Exception as exc:
                return {"success": False, "error": str(exc), "output": ""}

        result = await asyncio.to_thread(_sync_push)
        return result
