from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# OID constants
# ---------------------------------------------------------------------------
OID_SYS_UPTIME = "1.3.6.1.2.1.1.3.0"
OID_IF_IN_OCTETS = "1.3.6.1.2.1.2.2.1.10"
OID_IF_OUT_OCTETS = "1.3.6.1.2.1.2.2.1.16"
OID_IF_OPER_STATUS = "1.3.6.1.2.1.2.2.1.8"
OID_IF_DESCR = "1.3.6.1.2.1.2.2.1.2"
OID_CISCO_CPU = "1.3.6.1.4.1.9.2.1.56.0"


class SNMPCollector:
    """
    Async SNMP collector for Cisco devices.
    Uses pysnmp (asyncio-compatible) under the hood.
    Falls back gracefully when the host is unreachable or the library is absent.
    """

    def __init__(self, community: str = "public", timeout: int = 5, retries: int = 1):
        self.community = community
        self.timeout = timeout
        self.retries = retries

    async def _snmp_get(self, host: str, oids: List[str]) -> Dict[str, Any]:
        """
        Low-level SNMP GET for a list of OIDs.
        Returns {oid: value} or raises on failure.
        """
        try:
            from pysnmp.hlapi.asyncio import (
                CommunityData,
                ContextData,
                ObjectIdentity,
                ObjectType,
                SnmpEngine,
                UdpTransportTarget,
                getCmd,
            )

            engine = SnmpEngine()
            transport = await UdpTransportTarget.create(
                (host, 161),
                timeout=self.timeout,
                retries=self.retries,
            )
            object_types = [ObjectType(ObjectIdentity(oid)) for oid in oids]

            error_indication, error_status, error_index, var_binds = await getCmd(
                engine,
                CommunityData(self.community, mpModel=1),
                transport,
                ContextData(),
                *object_types,
            )

            if error_indication:
                raise RuntimeError(str(error_indication))
            if error_status:
                raise RuntimeError(f"SNMP error status: {error_status}")

            return {str(vb[0]): vb[1].prettyPrint() for vb in var_binds}

        except ImportError:
            logger.warning("pysnmp not installed; SNMP collection disabled")
            return {}

    async def _snmp_walk(self, host: str, oid_prefix: str) -> Dict[str, Any]:
        """
        Low-level SNMP WALK for a sub-tree.
        Returns {oid: value} dict.
        """
        try:
            from pysnmp.hlapi.asyncio import (
                CommunityData,
                ContextData,
                ObjectIdentity,
                ObjectType,
                SnmpEngine,
                UdpTransportTarget,
                nextCmd,
            )

            engine = SnmpEngine()
            transport = await UdpTransportTarget.create(
                (host, 161),
                timeout=self.timeout,
                retries=self.retries,
            )

            results: Dict[str, Any] = {}
            async for ei, es, ei_idx, vbs in nextCmd(
                engine,
                CommunityData(self.community, mpModel=1),
                transport,
                ContextData(),
                ObjectType(ObjectIdentity(oid_prefix)),
                lexicographicMode=False,
            ):
                if ei:
                    break
                for vb in vbs:
                    results[str(vb[0])] = vb[1].prettyPrint()
            return results

        except ImportError:
            logger.warning("pysnmp not installed; SNMP walk disabled")
            return {}

    async def get_interface_stats(
        self, host: str, community: str = "public"
    ) -> Dict[str, Any]:
        """
        Poll key interface statistics via SNMP.
        Returns a dict with per-interface in/out octets, oper status, and sysUpTime.
        """
        self.community = community
        try:
            # Get sysUpTime separately
            scalar = await self._snmp_get(host, [OID_SYS_UPTIME])
            uptime_raw = scalar.get(OID_SYS_UPTIME)

            # Walk interface tables
            in_octets = await self._snmp_walk(host, OID_IF_IN_OCTETS)
            out_octets = await self._snmp_walk(host, OID_IF_OUT_OCTETS)
            oper_status = await self._snmp_walk(host, OID_IF_OPER_STATUS)
            descriptions = await self._snmp_walk(host, OID_IF_DESCR)

            interfaces: Dict[str, Any] = {}
            # Build index mapping from last OID segment
            for oid, descr in descriptions.items():
                idx = oid.rsplit(".", 1)[-1]
                in_key = next((k for k in in_octets if k.endswith(f".{idx}")), None)
                out_key = next((k for k in out_octets if k.endswith(f".{idx}")), None)
                status_key = next(
                    (k for k in oper_status if k.endswith(f".{idx}")), None
                )

                interfaces[idx] = {
                    "description": descr,
                    "in_octets": int(in_octets.get(in_key, 0)) if in_key else None,
                    "out_octets": int(out_octets.get(out_key, 0)) if out_key else None,
                    "oper_status": oper_status.get(status_key),  # "1"=up, "2"=down
                }

            return {
                "host": host,
                "sys_uptime_ticks": uptime_raw,
                "interfaces": interfaces,
            }

        except Exception as exc:
            logger.error("SNMP interface stats failed for %s: %s", host, exc)
            return {"host": host, "error": str(exc), "interfaces": {}}

    async def get_cpu_utilization(
        self, host: str, community: str = "public"
    ) -> Optional[float]:
        """
        Returns CPU utilization (%) from Cisco-specific OID 1.3.6.1.4.1.9.2.1.56.0.
        Returns None if unavailable.
        """
        self.community = community
        try:
            result = await self._snmp_get(host, [OID_CISCO_CPU])
            raw = result.get(OID_CISCO_CPU)
            if raw is not None:
                return float(raw)
        except Exception as exc:
            logger.error("SNMP CPU poll failed for %s: %s", host, exc)
        return None
