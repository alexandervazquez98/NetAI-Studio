import logging
from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.database import get_db
from backend.models.analysis import Analysis, Alert, LogEntry
from backend.models.schemas import AnalysisSchema, RunAnalysisResponseSchema

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analysis", tags=["Analysis"])


async def _run_analysis_task(analysis_id: str) -> None:
    """Background task that imports and runs the orchestrator."""
    from backend.agents.orchestrator import AnalysisOrchestrator
    from backend.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        orchestrator = AnalysisOrchestrator()
        try:
            await orchestrator.run_analysis(analysis_id, db)
        except Exception as exc:
            logger.error("Orchestrator failed for analysis %s: %s", analysis_id, exc)


@router.post("/run", response_model=RunAnalysisResponseSchema)
async def run_analysis(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Create an Analysis record and trigger the orchestrator as a background task."""
    analysis = Analysis(status="running")
    db.add(analysis)
    await db.commit()
    await db.refresh(analysis)

    background_tasks.add_task(_run_analysis_task, analysis.id)

    return RunAnalysisResponseSchema(analysis_id=analysis.id, status=analysis.status)


@router.get("/history", response_model=List[AnalysisSchema])
async def get_history(db: AsyncSession = Depends(get_db)):
    """Return the last 20 analyses ordered by creation date, newest first."""
    result = await db.execute(
        select(Analysis)
        .options(selectinload(Analysis.alerts), selectinload(Analysis.log_entries))
        .order_by(desc(Analysis.created_at))
        .limit(20)
    )
    analyses = result.scalars().all()
    return [AnalysisSchema.model_validate(a) for a in analyses]


@router.get("/{analysis_id}", response_model=AnalysisSchema)
async def get_analysis(analysis_id: str, db: AsyncSession = Depends(get_db)):
    """Return a specific analysis with its alerts and log entries."""
    result = await db.execute(
        select(Analysis)
        .options(selectinload(Analysis.alerts), selectinload(Analysis.log_entries))
        .where(Analysis.id == analysis_id)
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(
            status_code=404, detail=f"Analysis '{analysis_id}' not found"
        )
    return AnalysisSchema.model_validate(analysis)
