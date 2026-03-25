from __future__ import annotations

import logging
from typing import Any, Dict, Optional

import httpx

logger = logging.getLogger(__name__)


class AviatClient:
    """
    HTTP client for the Aviat Networks management API.
    Handles authentication and data retrieval for microwave link metrics.

    The Aviat platform typically exposes a REST/RESTCONF API.
    This client uses httpx for async HTTP with connection pooling.
    """

    def __init__(self, base_url: str, username: str, password: str):
        self.base_url = base_url.rstrip("/")
        self._auth = (username, password)
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                auth=self._auth,
                timeout=httpx.Timeout(10.0),
                verify=False,  # Aviat devices often use self-signed certs
            )
        return self._client

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def _get(self, path: str) -> Dict[str, Any]:
        """Generic GET request with error handling."""
        client = await self._get_client()
        try:
            response = await client.get(path)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as exc:
            logger.error("Aviat API HTTP error at %s: %s", path, exc)
            raise
        except httpx.RequestError as exc:
            logger.error("Aviat API request error at %s: %s", path, exc)
            raise

    async def get_link_metrics(self, node_id: str) -> Dict[str, Any]:
        """
        Retrieve WAN link metrics for an Aviat CTR node.

        Returns:
            capacity_mbps: Link capacity in Mbps
            utilization_pct: Current utilization percentage (0-100)
            signal_dbm: Receive signal level in dBm
            latency_ms: Round-trip latency in milliseconds
            availability_30d: 30-day availability percentage
        """
        try:
            data = await self._get(f"/api/v1/nodes/{node_id}/link-metrics")
            return {
                "node_id": node_id,
                "capacity_mbps": data.get("capacity_mbps"),
                "utilization_pct": data.get("utilization_pct"),
                "signal_dbm": data.get("rsl_dbm"),
                "latency_ms": data.get("latency_ms"),
                "availability_30d": data.get("availability_30d"),
                "source": "aviat_api",
            }
        except Exception as exc:
            logger.warning("get_link_metrics failed for node %s: %s", node_id, exc)
            return {
                "node_id": node_id,
                "error": str(exc),
                "capacity_mbps": None,
                "utilization_pct": None,
                "signal_dbm": None,
                "latency_ms": None,
                "availability_30d": None,
                "source": "aviat_api_error",
            }

    async def get_system_info(self, node_id: str) -> Dict[str, Any]:
        """
        Retrieve system information for an Aviat node.

        Returns:
            model: Device model string
            firmware: Firmware version
            uptime: Uptime in seconds
        """
        try:
            data = await self._get(f"/api/v1/nodes/{node_id}/system")
            return {
                "node_id": node_id,
                "model": data.get("model"),
                "firmware": data.get("firmware_version"),
                "uptime": data.get("uptime_seconds"),
                "source": "aviat_api",
            }
        except Exception as exc:
            logger.warning("get_system_info failed for node %s: %s", node_id, exc)
            return {
                "node_id": node_id,
                "error": str(exc),
                "model": None,
                "firmware": None,
                "uptime": None,
                "source": "aviat_api_error",
            }
