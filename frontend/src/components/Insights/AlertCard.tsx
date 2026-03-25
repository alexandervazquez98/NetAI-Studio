import type { Alert } from '../../types/agent';

interface AlertCardProps {
  alert: Alert;
}

const severityStyles = (severity: Alert['severity']) => {
  switch (severity) {
    case 'critical': return 'bg-red-900 border-red-700 text-red-100';
    case 'warning': return 'bg-amber-900 border-amber-700 text-amber-100';
    case 'info': return 'bg-blue-900 border-blue-700 text-blue-100';
  }
};

const severityBadge = (severity: Alert['severity']) => {
  switch (severity) {
    case 'critical': return 'bg-red-600 text-white';
    case 'warning': return 'bg-amber-600 text-white';
    case 'info': return 'bg-blue-600 text-white';
  }
};

export function AlertCard({ alert }: AlertCardProps) {
  return (
    <div className={`rounded-lg border p-3 text-sm ${severityStyles(alert.severity)}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`px-1.5 py-0.5 rounded text-xs font-bold uppercase ${severityBadge(alert.severity)}`}>
          {alert.severity === 'critical' ? 'CRÍTICO' : alert.severity === 'warning' ? 'ATENCIÓN' : 'INFO'}
        </span>
        <span className="font-medium truncate">{alert.node}</span>
        <span className="ml-auto text-xs opacity-70 shrink-0">{alert.site}</span>
      </div>
      <p className="opacity-90 mb-1">{alert.description}</p>
      <p className="text-xs opacity-70 mb-1"><span className="font-semibold">Impact:</span> {alert.impact}</p>
      <p className="text-xs opacity-70">
        <span className="font-semibold">Metric:</span> {alert.metric} · <span className="font-semibold">Threshold:</span> {alert.threshold}
      </p>
    </div>
  );
}
