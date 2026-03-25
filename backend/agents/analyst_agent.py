from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List

import anthropic

from backend.config import settings
from backend.redis_client import publish_message

logger = logging.getLogger(__name__)

ANALYST_SYSTEM_PROMPT = """
Eres el analista de red de una organización con 7 sedes y aproximadamente 70 nodos Cisco/Aviat.

ZONAS DE OBSERVABILIDAD:
- Sedes HQ, A, B, C, D, E: acceso completo vía SNMP, SSH y Aviat API.
  Puedes consultar interfaces, rutas, VRFs, señal de microondas, etc.
- Sedes F y G: conectadas por SD-WAN de terceros.
  SOLO tienes visibilidad del lado LAN (switches internos y externos).
  NO tienes: estado de túneles, latencia WAN real, path selection.
  Cuando analices estas sedes, indica siempre esta limitación explícitamente.

TOPOLOGÍA:
- Cada sede tiene SW core interno (planta interna) y SW core externo (planta externa).
- El SW externo es el uplink hacia WAN.
- En sedes MPLS: el CTR Aviat es el único gateway WAN. No hay redundancia salvo que se especifique.
- En sedes SD-WAN: el CPE es caja negra. Infiere tráfico desde counters del SW-EXT.

REGLAS DE ANÁLISIS DE IMPACTO:
- Fallo en CTR Aviat = corte total de sede (no hay redundancia WAN por defecto).
- Fallo en SW-EXT = corte LAN + WAN de la sede.
- Fallo en SW-INT = corte solo de planta interna, WAN puede mantenerse.
- Señal Aviat < -70dBm = riesgo alto de degradación o corte inminente.
- Utilización WAN > 80% = riesgo de congestión.
- Utilización WAN > 95% = crítico, acción inmediata requerida.

FORMATO DE RESPUESTA:
Siempre responde con JSON estructurado así:
{
  "summary": "Resumen ejecutivo en 2-3 oraciones",
  "alerts": [
    {
      "severity": "critical|warning|info",
      "node": "nombre del nodo",
      "site": "nombre de la sede",
      "description": "Descripción clara del problema",
      "impact": "Impacto en la operación",
      "metric": "valor observado",
      "threshold": "umbral superado"
    }
  ],
  "suggestions": [
    {
      "priority": "immediate|medium_term|long_term",
      "target": "nodo o sede afectada",
      "action": "Acción recomendada",
      "reasoning": "Por qué se recomienda esto",
      "requires_config_change": true/false,
      "estimated_impact": "Qué mejoraría al implementar esto"
    }
  ],
  "limitations": ["Lista de cosas que no pudo analizar por falta de visibilidad"]
}

Nunca propongas cambios en sedes SD-WAN que requieran acceso al CPE.
Nunca inventes métricas. Si un dato no está disponible, indícalo explícitamente en limitations.
"""


class AnalystAgent:
    """
    Calls Claude with the full topology + metrics context and parses the
    structured JSON response into alerts, suggestions, and a summary.
    """

    async def analyze(
        self,
        topology: Dict[str, Any],
        metrics: Dict[str, Any],
        analysis_id: str,
    ) -> Dict[str, Any]:
        """
        Call Claude claude-sonnet-4-6 with topology + metrics.
        Emit log events via Redis.
        Returns parsed dict: { summary, alerts, suggestions, limitations }.
        """
        if not settings.anthropic_api_key:
            raise RuntimeError("ANTHROPIC_API_KEY is not set")

        channel = f"reasoning:{analysis_id}"

        async def emit(level: str, message: str) -> None:
            await publish_message(
                channel,
                {
                    "type": "log_entry",
                    "agent": "analyst",
                    "level": level,
                    "message": message,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                },
            )

        await emit("info", "Analyst agent starting analysis...")

        user_content = (
            "=== TOPOLOGÍA DE RED ===\n"
            + json.dumps(topology, indent=2, default=str)
            + "\n\n=== MÉTRICAS RECOLECTADAS ===\n"
            + json.dumps(metrics, indent=2, default=str)
            + "\n\nAnaliza la red y genera el informe estructurado en JSON."
        )

        await emit("info", "Sending context to Claude (claude-sonnet-4-6)...")

        try:
            client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
            response = await client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=4096,
                system=ANALYST_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_content}],
            )
        except anthropic.APIStatusError as exc:
            await emit("error", f"Anthropic API error: {exc.message}")
            raise
        except Exception as exc:
            await emit("error", f"Unexpected error calling Claude: {exc}")
            raise

        raw_text = response.content[0].text
        await emit("info", "Received response from Claude, parsing JSON...")

        # Parse JSON — Claude may wrap it in markdown code blocks
        parsed = self._extract_json(raw_text)

        await emit(
            "info",
            f"Analysis complete: {len(parsed.get('alerts', []))} alerts, "
            f"{len(parsed.get('suggestions', []))} suggestions.",
        )

        return parsed

    @staticmethod
    def _extract_json(text: str) -> Dict[str, Any]:
        """
        Extract and parse JSON from the Claude response.
        Handles markdown code fences (```json ... ```).
        Falls back to returning error dict on failure.
        """
        # Strip markdown fences if present
        cleaned = text.strip()
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            # Remove first and last fence lines
            inner_lines = lines[1:-1] if lines[-1].startswith("```") else lines[1:]
            cleaned = "\n".join(inner_lines)

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            # Attempt to locate JSON object within free text
            start = cleaned.find("{")
            end = cleaned.rfind("}") + 1
            if start != -1 and end > start:
                try:
                    return json.loads(cleaned[start:end])
                except json.JSONDecodeError:
                    pass

        logger.warning("AnalystAgent: Could not parse JSON from Claude response")
        return {
            "summary": "Error: Could not parse analyst response.",
            "alerts": [],
            "suggestions": [],
            "limitations": ["Response parsing failed — raw response logged."],
            "raw_text": text,
        }
