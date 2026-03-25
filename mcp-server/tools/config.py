from __future__ import annotations

import asyncio
import logging
import os
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

REQUIRE_APPROVAL = (
    os.environ.get("CONFIG_AGENT_REQUIRE_APPROVAL", "true").lower() == "true"
)


async def push_config(
    host: str,
    config: List[str],
    dry_run: bool = True,
) -> Dict[str, Any]:
    """
    Apply configuration commands to a network device.

    dry_run=True (DEFAULT):
      Returns the commands that WOULD be applied without executing anything.
      This is the safe default — always use this first.

    dry_run=False:
      Uses Netmiko to SSH into the device and apply the commands.
      REQUIRES: CONFIG_AGENT_REQUIRE_APPROVAL=false in environment,
                OR the call must include explicit approval context.
      NEVER executes without this safety check.

    Returns:
      {
        "commands": list of commands,
        "dry_run": bool,
        "applied": bool,
        "output": str | None,
        "error": str | None
      }
    """
    if not config:
        return {
            "commands": [],
            "dry_run": dry_run,
            "applied": False,
            "output": None,
            "error": "No commands provided",
        }

    if dry_run:
        logger.info("push_config: DRY RUN for host=%s, %d commands", host, len(config))
        return {
            "commands": config,
            "dry_run": True,
            "applied": False,
            "output": _format_dry_run_output(host, config),
            "error": None,
        }

    # --- Live execution ---
    if REQUIRE_APPROVAL:
        msg = (
            "Configuration push blocked: CONFIG_AGENT_REQUIRE_APPROVAL is enabled. "
            "Set environment variable CONFIG_AGENT_REQUIRE_APPROVAL=false to allow "
            "live config pushes, or use dry_run=True to preview commands."
        )
        logger.warning("push_config: approval required, blocking live push to %s", host)
        return {
            "commands": config,
            "dry_run": False,
            "applied": False,
            "output": None,
            "error": msg,
        }

    logger.info("push_config: LIVE push to %s (%d commands)", host, len(config))
    result = await _push_via_netmiko(host, config)
    return {
        "commands": config,
        "dry_run": False,
        "applied": result.get("success", False),
        "output": result.get("output"),
        "error": result.get("error"),
    }


def _format_dry_run_output(host: str, commands: List[str]) -> str:
    lines = [
        f"[DRY RUN] Would execute {len(commands)} command(s) on {host}:",
        "=" * 60,
    ]
    for i, cmd in enumerate(commands, 1):
        lines.append(f"  {i:02d}. {cmd}")
    lines.append("=" * 60)
    lines.append("No changes were applied.")
    return "\n".join(lines)


async def _push_via_netmiko(host: str, commands: List[str]) -> Dict[str, Any]:
    """Run Netmiko config push in an executor (blocking I/O)."""
    loop = asyncio.get_event_loop()

    def _sync() -> Dict[str, Any]:
        try:
            from netmiko import ConnectHandler

            device = {
                "device_type": "cisco_ios",
                "host": host,
                "username": os.environ.get("NETMIKO_USERNAME", "admin"),
                "password": os.environ.get("NETMIKO_PASSWORD", ""),
                "timeout": 30,
            }
            with ConnectHandler(**device) as conn:
                conn.enable()
                output = conn.send_config_set(commands)
                # Save config
                conn.save_config()
                return {"success": True, "output": output, "error": None}
        except ImportError:
            return {
                "success": False,
                "output": None,
                "error": "netmiko not installed. Install with: pip install netmiko",
            }
        except Exception as exc:
            return {"success": False, "output": None, "error": str(exc)}

    return await loop.run_in_executor(None, _sync)
