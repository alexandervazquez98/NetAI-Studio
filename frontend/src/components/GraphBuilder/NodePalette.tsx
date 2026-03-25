import React from 'react';

interface PaletteItem {
  type: string;
  label: string;
  description: string;
  badgeText: string;
  badgeClass: string;
  icon: React.ReactNode;
}

const ServerIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <rect x="2" y="2" width="20" height="8" rx="2" />
    <rect x="2" y="14" width="20" height="8" rx="2" />
    <line x1="6" y1="6" x2="6.01" y2="6" />
    <line x1="6" y1="18" x2="6.01" y2="18" />
  </svg>
);

const GlobeIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const WifiIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <line x1="12" y1="20" x2="12.01" y2="20" />
  </svg>
);

const SwitchIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <rect x="2" y="7" width="20" height="10" rx="2" />
    <line x1="6" y1="12" x2="6.01" y2="12" />
    <line x1="10" y1="12" x2="10.01" y2="12" />
    <line x1="14" y1="12" x2="18" y2="12" />
  </svg>
);

const LayersIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const PALETTE_ITEMS: PaletteItem[] = [
  {
    type: 'coreInternal',
    label: 'Core Interno',
    description: 'Router/switch interno',
    badgeText: 'INT',
    badgeClass: 'bg-blue-100 text-blue-700',
    icon: <ServerIcon />,
  },
  {
    type: 'coreExternal',
    label: 'Core Externo',
    description: 'Router WAN / PE',
    badgeText: 'EXT',
    badgeClass: 'bg-orange-100 text-orange-700',
    icon: <GlobeIcon />,
  },
  {
    type: 'aviatCTR',
    label: 'Aviat CTR',
    description: 'Controlador microwave',
    badgeText: 'CTR',
    badgeClass: 'bg-purple-100 text-purple-700',
    icon: <WifiIcon />,
  },
  {
    type: 'sdwanCPE',
    label: 'SD-WAN CPE',
    description: 'Caja negra SD-WAN',
    badgeText: 'SD-WAN',
    badgeClass: 'bg-amber-100 text-amber-700',
    icon: <ShieldIcon />,
  },
  {
    type: 'accessSwitch',
    label: 'Access Switch',
    description: 'Switch de acceso LAN',
    badgeText: 'ACCESS',
    badgeClass: 'bg-gray-100 text-gray-600',
    icon: <SwitchIcon />,
  },
  {
    type: 'siteGroup',
    label: 'Sede (Grupo)',
    description: 'Agrupa nodos por sitio',
    badgeText: 'SEDE',
    badgeClass: 'bg-indigo-100 text-indigo-700',
    icon: <LayersIcon />,
  },
];

export const NodePalette: React.FC = () => {
  const onDragStart = (event: React.DragEvent<HTMLDivElement>, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Section header */}
      <div className="mb-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">
          Nodos de Red
        </h2>
        <p className="text-xs text-gray-400">Arrastra un nodo al canvas</p>
      </div>

      {/* Node list */}
      <div className="space-y-2 overflow-y-auto flex-1">
        {PALETTE_ITEMS.map((item) => (
          <div
            key={item.type}
            className="
              flex items-center gap-3 px-3 py-2.5 bg-white border border-gray-200
              rounded-lg cursor-grab hover:border-gray-400 hover:shadow-sm
              active:cursor-grabbing active:shadow-md transition-all duration-100
              select-none
            "
            draggable
            onDragStart={(e) => onDragStart(e, item.type)}
          >
            {/* Icon */}
            <span className="text-gray-500 flex-shrink-0">{item.icon}</span>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-800 truncate">{item.label}</div>
              <div className="text-xs text-gray-400 truncate">{item.description}</div>
            </div>

            {/* Type badge */}
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${item.badgeClass}`}>
              {item.badgeText}
            </span>
          </div>
        ))}
      </div>

      {/* Footer hint */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-400 leading-snug">
          Conecta nodos arrastrando desde los puntos de conexión (handles).
        </p>
      </div>
    </div>
  );
};
