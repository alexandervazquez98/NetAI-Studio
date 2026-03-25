import httpx


async def get_network_topology() -> str:
    """
    Fetch the network topology from the backend API.
    Provides sites, nodes, and links.
    """
    # Assuming the backend API is running on localhost:8000
    try:
        async with httpx.AsyncClient() as client:
            sites_resp = await client.get("http://localhost:8000/api/v1/topology/sites")
            nodes_resp = await client.get("http://localhost:8000/api/v1/topology/nodes")
            links_resp = await client.get("http://localhost:8000/api/v1/topology/links")

            sites_resp.raise_for_status()
            nodes_resp.raise_for_status()
            links_resp.raise_for_status()

            topology_data = {
                "sites": sites_resp.json(),
                "nodes": nodes_resp.json(),
                "links": links_resp.json(),
            }
            return f"Network Topology Data: {topology_data}"
    except Exception as e:
        return f"Error fetching topology: {str(e)}"
