from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, List, Optional

from backend.utils.snmp_collector import SNMPCollector
from backend.utils.aviat_client import AviatClient
from backend.utils.topology_classifier import infer_sdwan_metrics_from_uplink
from backend.config import settings

logger = logging.getLogger(__name__)


class MetricsAgent:
    """
    Collects network metrics for each observable node in the topology.

    Strategy per node:
    - vendor == 'Cisco'  → SNMP (pysnmp)
    - vendor == 'Aviat'  → Aviat REST API
    - observable == False → build inferred metrics placeholder
    """

    def __init__(self):
        self._snmp = SNMPCollector(community="public")

    async def _collect_cisco(self, node: Dict[str, Any]) -> Dict[str, Any]:
        """Collect SNMP metrics for a Cisco node."""
        ip = node.get("management_ip")
        if not ip:
            return {"error": "no management_ip", "source": "snmp_skipped"}
        try:
            iface_stats = await self._snmp.get_interface_stats(ip)
            cpu = await self._snmp.get_cpu_utilization(ip)
            return {
                "source": "snmp",
                "interface_stats": iface_stats,
                "cpu_utilization_pct": cpu,
            }
        except Exception as exc:
            logger.warning("SNMP failed for node %s (%s): %s", node.get("id"), ip, exc)
            return {"source": "snmp_error", "error": str(exc)}

    async def _collect_aviat(self, node: Dict[str, Any]) -> Dict[str, Any]:
        """Collect metrics from the Aviat API for an Aviat CTR node."""
        # Aviat base URL is derived from the management IP or from node meta
        ip = node.get("management_ip")
        if not ip:
            return {"error": "no management_ip", "source": "aviat_skipped"}

        meta = node.get("meta") or {}
        base_url = meta.get("aviat_api_url") or f"http://{ip}"
        username = meta.get("aviat_username", "admin")
        password = meta.get("aviat_password", "admin")

        client = AviatClient(base_url, username, password)
        try:
            link_metrics = await client.get_link_metrics(node["id"])
            system_info = await client.get_system_info(node["id"])
            return {
                "source": "aviat_api",
                "link_metrics": link_metrics,
                "system_info": system_info,
            }
        except Exception as exc:
            logger.warning("Aviat API failed for node %s: %s", node.get("id"), exc)
            return {"source": "aviat_api_error", "error": str(exc)}
        finally:
            await client.close()

    async def _collect_sdwan_inferred(self, node: Dict[str, Any]) -> Dict[str, Any]:
        """
        Build an inferred metrics placeholder for SD-WAN CPE nodes.
        Uses uplink counters from the node's meta if available.
        """
        meta = node.get("meta") or {}
        uplink_counters = meta.get("uplink_counters", {})
        inferred = infer_sdwan_metrics_from_uplink(uplink_counters)
        return {
            "source": "inferred_sdwan",
            "observable": False,
            "inferred_metrics": inferred,
        }

    async def collect_metrics(self, topology: Dict[str, Any]) -> Dict[str, Any]:
        """
        Collect metrics for every node in the topology dict.
        Returns: { node_id: { metric_name: value_or_null } }
        """
        nodes: List[Dict] = topology.get("nodes", [])

        async def collect_one(node: Dict[str, Any]) -> tuple[str, Dict]:
            node_id = node["id"]
            vendor = (node.get("vendor") or "").lower()
            observable = node.get("observable", True)
            node_type = (node.get("node_type") or "").lower()

            if not observable or node_type == "sdwan_cpe":
                metrics = await self._collect_sdwan_inferred(node)
            elif vendor == "aviat" or node_type == "aviat_ctr":
                metrics = await self._collect_aviat(node)
            elif vendor == "cisco":
                metrics = await self._collect_cisco(node)
            else:
                metrics = {"source": "unsupported_vendor", "vendor": vendor}

            return node_id, metrics

        tasks = [collect_one(node) for node in nodes]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        output: Dict[str, Any] = {}
        for item in results:
            if isinstance(item, Exception):
                logger.error("Metric collection task raised: %s", item)
                continue
            node_id, metrics = item
            output[node_id] = metrics

        logger.info("MetricsAgent: collected metrics for %d nodes", len(output))
        return output
