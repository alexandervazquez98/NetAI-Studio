from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.models.analysis import Alert, Analysis, LogEntry
from backend.redis_client import publish_message

logger = logging.getLogger(__name__)


class AnalysisOrchestrator:
    """
    Central orchestrator that coordinates the analysis pipeline:
    1. topology_agent  → build network context
    2. metrics_agent   → collect metrics for all observable nodes
    3. analyst_agent   → call Claude with context + metrics, parse response
    4. config_agent    → generate CLI suggestions (dry_run) for actionable items
    5. Persist results → alerts, log entries, final status
    6. Emit events     → via Redis pub/sub for WebSocket streaming
    """

    def __init__(self):
        from backend.agents.topology_agent import TopologyAgent
        from backend.agents.metrics_agent import MetricsAgent
        from backend.agents.analyst_agent import AnalystAgent
        from backend.agents.config_agent import ConfigAgent

        self.topology_agent = TopologyAgent()
        self.metrics_agent = MetricsAgent()
        self.analyst_agent = AnalystAgent()
        self.config_agent = ConfigAgent()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _emit(
        self,
        analysis_id: str,
        event_type: str,
        agent: str,
        status: Optional[str] = None,
        level: str = "info",
        message: str = "",
        **extra,
    ) -> None:
        payload: Dict[str, Any] = {
            "type": event_type,
            "agent": agent,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        if status:
            payload["status"] = status
        if message:
            payload["message"] = message
        payload["level"] = level
        payload.update(extra)
        await publish_message(f"reasoning:{analysis_id}", payload)

    async def _log(
        self,
        db: AsyncSession,
        analysis_id: str,
        agent: str,
        message: str,
        level: str = "info",
        tool_call: Optional[Dict] = None,
    ) -> None:
        """Persist a log entry to DB and emit via Redis."""
        entry = LogEntry(
            analysis_id=analysis_id,
            agent=agent,
            level=level,
            message=message,
            tool_call=tool_call,
            created_at=datetime.utcnow(),
        )
        db.add(entry)
        await db.flush()

        await self._emit(
            analysis_id,
            event_type="log_entry",
            agent=agent,
            level=level,
            message=message,
        )

    # ------------------------------------------------------------------
    # Main pipeline
    # ------------------------------------------------------------------

    async def run_analysis(self, analysis_id: str, db: AsyncSession) -> None:
        """
        Execute the full analysis pipeline for the given analysis_id.
        All exceptions are caught, the Analysis record is set to 'error',
        and the failure is emitted via Redis before re-raising.
        """
        # --- Step 0: Mark as running ---
        analysis = await db.get(Analysis, analysis_id)
        if not analysis:
            logger.error("Analysis %s not found in DB", analysis_id)
            return

        analysis.status = "running"
        await db.commit()

        await self._emit(
            analysis_id, "analysis_start", "orchestrator", status="running"
        )

        try:
            await self._pipeline(analysis_id, analysis, db)
        except Exception as exc:
            logger.exception("Analysis %s failed: %s", analysis_id, exc)
            analysis.status = "error"
            analysis.summary = f"Pipeline error: {exc}"
            await db.commit()
            await self._emit(
                analysis_id,
                "analysis_error",
                "orchestrator",
                status="error",
                level="error",
                message=str(exc),
            )
            raise

    async def _pipeline(
        self,
        analysis_id: str,
        analysis: Analysis,
        db: AsyncSession,
    ) -> None:

        # --- Step 1: Topology ---
        await self._emit(analysis_id, "agent_status", "topology", status="running")
        await self._log(
            db, analysis_id, "topology", "Building network topology context..."
        )

        try:
            topology = await self.topology_agent.build_context(db)
        except Exception as exc:
            await self._log(
                db,
                analysis_id,
                "topology",
                f"Topology build failed: {exc}",
                level="error",
            )
            await db.commit()
            raise

        site_count = len(topology.get("sites", []))
        node_count = len(topology.get("nodes", []))
        await self._log(
            db,
            analysis_id,
            "topology",
            f"Topology context built: {site_count} sites, {node_count} nodes.",
        )
        await self._emit(analysis_id, "agent_status", "topology", status="done")

        # --- Step 2: Metrics ---
        await self._emit(analysis_id, "agent_status", "metrics", status="running")
        await self._log(
            db, analysis_id, "metrics", "Collecting metrics for all observable nodes..."
        )

        try:
            metrics = await self.metrics_agent.collect_metrics(topology)
        except Exception as exc:
            await self._log(
                db,
                analysis_id,
                "metrics",
                f"Metrics collection failed: {exc}",
                level="error",
            )
            await db.commit()
            metrics = {}  # Continue with empty metrics rather than failing

        await self._log(
            db, analysis_id, "metrics", f"Metrics collected for {len(metrics)} nodes."
        )
        await self._emit(analysis_id, "agent_status", "metrics", status="done")

        # --- Step 3: Analysis ---
        await self._emit(analysis_id, "agent_status", "analyst", status="running")
        await self._log(
            db, analysis_id, "analyst", "Calling Claude for network analysis..."
        )

        try:
            result = await self.analyst_agent.analyze(topology, metrics, analysis_id)
        except Exception as exc:
            await self._log(
                db, analysis_id, "analyst", f"Analysis failed: {exc}", level="error"
            )
            await db.commit()
            raise

        await self._log(
            db,
            analysis_id,
            "analyst",
            f"Analysis complete: {len(result.get('alerts', []))} alerts, "
            f"{len(result.get('suggestions', []))} suggestions.",
        )
        await self._emit(analysis_id, "agent_status", "analyst", status="done")

        # --- Step 4: Persist alerts ---
        alerts_data = result.get("alerts", [])
        for alert_dict in alerts_data:
            alert = Alert(
                analysis_id=analysis_id,
                severity=alert_dict.get("severity", "info"),
                node=alert_dict.get("node"),
                site=alert_dict.get("site"),
                description=alert_dict.get("description", ""),
                impact=alert_dict.get("impact"),
                metric=alert_dict.get("metric"),
                threshold=alert_dict.get("threshold"),
            )
            db.add(alert)

        # --- Step 5: Config agent for actionable suggestions ---
        suggestions = result.get("suggestions", [])
        config_results = []

        actionable = [s for s in suggestions if s.get("requires_config_change")]
        if actionable:
            await self._emit(analysis_id, "agent_status", "config", status="running")
            await self._log(
                db,
                analysis_id,
                "config",
                f"Generating CLI commands for {len(actionable)} suggestions (dry_run=True)...",
            )

            for suggestion in actionable:
                try:
                    cfg = await self.config_agent.generate_config(
                        suggestion,
                        dry_run=settings.config_agent_dry_run_default,
                    )
                    suggestion["config"] = cfg
                    config_results.append(cfg)

                    await self._log(
                        db,
                        analysis_id,
                        "config",
                        f"Config generated for '{suggestion.get('target', 'unknown')}': "
                        f"{len(cfg.get('commands', []))} commands.",
                        tool_call={
                            "suggestion": suggestion.get("target"),
                            "commands": cfg.get("commands", []),
                        },
                    )
                except Exception as exc:
                    await self._log(
                        db,
                        analysis_id,
                        "config",
                        f"Config generation failed for '{suggestion.get('target')}': {exc}",
                        level="warning",
                    )

            await self._emit(analysis_id, "agent_status", "config", status="done")

        # --- Step 6: Finalize analysis record ---
        analysis.status = "done"
        analysis.summary = result.get("summary", "")
        analysis.alert_count = len(alerts_data)
        analysis.raw_result = {
            "alerts": alerts_data,
            "suggestions": suggestions,
            "limitations": result.get("limitations", []),
            "config_results": config_results,
        }

        await db.commit()

        # --- Step 7: Broadcast completion ---
        await self._emit(
            analysis_id,
            "analysis_complete",
            "orchestrator",
            status="done",
            message=analysis.summary,
            alert_count=len(alerts_data),
        )
        logger.info(
            "Analysis %s completed with %d alerts.", analysis_id, len(alerts_data)
        )
