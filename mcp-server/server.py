from __future__ import annotations

import logging
import os

from mcp.server.fastmcp import FastMCP

from tools.topology import get_topology_context
from tools.metrics import get_wan_link_metrics
from tools.anomalies import get_anomalies
from tools.config import push_config

logger = logging.getLogger(__name__)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

mcp = FastMCP("netai-tools")

# Register all tools by importing and re-exporting through FastMCP decorators
mcp.tool()(get_topology_context)
mcp.tool()(get_wan_link_metrics)
mcp.tool()(get_anomalies)
mcp.tool()(push_config)

if __name__ == "__main__":
    logger.info("Starting NetAI MCP server...")
    mcp.run(transport="stdio")
