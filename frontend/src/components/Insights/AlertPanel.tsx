import { useAgentStore } from '../../hooks/useAgentStore';
import { AlertCard } from './AlertCard';

export default function AlertPanel() {
  const alerts = useAgentStore((s) => s.alerts);

  return (
    <div className="flex flex-col overflow-hidden flex-1 min-h-0">
      <div className="px-4 py-3 border-b border-gray-800">
        <h2 className="font-semibold text-gray-300 text-sm">
          Alertas Activas ({alerts.length})
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {alerts.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            No active alerts
          </div>
        ) : (
          alerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)
        )}
      </div>
    </div>
  );
}
