import axios from 'axios';

/**
 * Backend base URL — resolved dynamically from the browser's current host.
 * Allows the frontend to work regardless of where it is deployed
 * (localhost dev, LAN test server, cloud) without changing env vars.
 *
 * Override with VITE_BACKEND_URL at build time if the backend runs
 * on a different host or port.
 */
const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  `${window.location.protocol}//${window.location.hostname}:8000`;

const apiClient = axios.create({
  baseURL: BACKEND_URL,
  headers: { 'Content-Type': 'application/json' },
});

export default apiClient;
