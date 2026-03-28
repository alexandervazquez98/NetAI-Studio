import logging
from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.database import get_db
from backend.models.analysis import Analysis
from backend.models.graph import NetworkEdge, NetworkNode, Site
from backend.models.schemas import (
    NetworkEdgeSchema,
    NetworkNodeSchema,
    RunAnalysisResponseSchema,
    SiteSchema,
    TopologyGraphSchema,
)
from backend.utils.graph_builder import build_network_graph_json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/graph", tags=["Graph"])


@router.get("/", response_model=TopologyGraphSchema)
async def get_topology(db: AsyncSession = Depends(get_db)):
    """Return the full topology: all sites, nodes, and edges."""
    sites_result = await db.execute(select(Site))
    sites = sites_result.scalars().all()

    nodes_result = await db.execute(select(NetworkNode))
    nodes = nodes_result.scalars().all()

    edges_result = await db.execute(select(NetworkEdge))
    edges = edges_result.scalars().all()

    return TopologyGraphSchema(
        sites=[SiteSchema.model_validate(s) for s in sites],
        nodes=[NetworkNodeSchema.model_validate(n) for n in nodes],
        edges=[NetworkEdgeSchema.model_validate(e) for e in edges],
    )


@router.post("/", response_model=TopologyGraphSchema)
async def upsert_topology(
    payload: TopologyGraphSchema,
    db: AsyncSession = Depends(get_db),
):
    """Replace the full topology with the payload (insert/update + delete orphans)."""
    try:
        incoming_site_ids = {s.id for s in payload.sites}
        incoming_node_ids = {n.id for n in payload.nodes}
        incoming_edge_ids = {e.id for e in payload.edges}

        # ── Delete orphans (rows in DB not present in payload) ────────────────

        existing_sites = (await db.execute(select(Site))).scalars().all()
        for site in existing_sites:
            if site.id not in incoming_site_ids:
                await db.delete(site)

        existing_nodes = (await db.execute(select(NetworkNode))).scalars().all()
        for node in existing_nodes:
            if node.id not in incoming_node_ids:
                await db.delete(node)

        existing_edges = (await db.execute(select(NetworkEdge))).scalars().all()
        for edge in existing_edges:
            if edge.id not in incoming_edge_ids:
                await db.delete(edge)

        # Flush deletes before upserts to avoid FK constraint violations
        await db.flush()

        # ── Upsert what remains in the payload ───────────────────────────────

        # Sites
        for site_data in payload.sites:
            existing = await db.get(Site, site_data.id)
            if existing:
                existing.name = site_data.name
                existing.role = site_data.role
                existing.wan_type = site_data.wan_type
                existing.observable_boundary = site_data.observable_boundary
                existing.canvas_x = site_data.canvas_x
                existing.canvas_y = site_data.canvas_y
                existing.canvas_w = site_data.canvas_w
                existing.canvas_h = site_data.canvas_h
            else:
                db.add(Site(**site_data.model_dump(exclude_none=False)))

        # Nodes — normalize empty site_id to None
        for node_data in payload.nodes:
            node_dict = node_data.model_dump()
            if not node_dict.get("site_id"):
                node_dict["site_id"] = None
            existing = await db.get(NetworkNode, node_dict["id"])
            if existing:
                for field, value in node_dict.items():
                    if field != "id":
                        setattr(existing, field, value)
            else:
                db.add(NetworkNode(**node_dict))

        # Edges
        for edge_data in payload.edges:
            existing = await db.get(NetworkEdge, edge_data.id)
            if existing:
                for field, value in edge_data.model_dump(exclude={"id"}).items():
                    setattr(existing, field, value)
            else:
                db.add(NetworkEdge(**edge_data.model_dump()))

        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        logger.error("Topology upsert failed: %s", e)
        raise HTTPException(status_code=422, detail=str(e.orig))

    return await get_topology(db)


@router.get("/nodes/{node_id}", response_model=NetworkNodeSchema)
async def get_node(node_id: str, db: AsyncSession = Depends(get_db)):
    """Return a single node by its primary key."""
    node = await db.get(NetworkNode, node_id)
    if not node:
        raise HTTPException(status_code=404, detail=f"Node '{node_id}' not found")
    return NetworkNodeSchema.model_validate(node)


@router.put("/nodes/{node_id}", response_model=NetworkNodeSchema)
async def update_node(
    node_id: str,
    payload: NetworkNodeSchema,
    db: AsyncSession = Depends(get_db),
):
    """Update a node's properties."""
    node = await db.get(NetworkNode, node_id)
    if not node:
        raise HTTPException(status_code=404, detail=f"Node '{node_id}' not found")
    for field, value in payload.model_dump(exclude={"id"}, exclude_none=True).items():
        setattr(node, field, value)
    await db.commit()
    await db.refresh(node)
    return NetworkNodeSchema.model_validate(node)


@router.delete("/nodes/{node_id}", status_code=204)
async def delete_node(node_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a node and its associated edges."""
    node = await db.get(NetworkNode, node_id)
    if not node:
        raise HTTPException(status_code=404, detail=f"Node '{node_id}' not found")
    await db.delete(node)
    await db.commit()


@router.get("/export")
async def export_topology(db: AsyncSession = Depends(get_db)):
    """Return topology serialized as network_graph JSON for AI consumption."""
    sites_result = await db.execute(select(Site))
    sites = sites_result.scalars().all()

    nodes_result = await db.execute(select(NetworkNode))
    nodes = nodes_result.scalars().all()

    edges_result = await db.execute(select(NetworkEdge))
    edges = edges_result.scalars().all()

    return build_network_graph_json(sites, nodes, edges)
