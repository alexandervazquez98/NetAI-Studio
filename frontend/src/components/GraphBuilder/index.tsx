import React from 'react';
import { ReactFlowProvider } from 'reactflow';
import { GraphCanvas } from './GraphCanvas';
import { NodePalette } from './NodePalette';
import { PropertiesPanel } from './PropertiesPanel';
import 'reactflow/dist/style.css';

export const GraphBuilder: React.FC = () => {
  return (
    <ReactFlowProvider>
      <div className="flex h-full w-full overflow-hidden bg-gray-50">
        {/* Left sidebar — Node palette */}
        <aside className="w-64 flex-shrink-0 border-r border-gray-200 bg-white p-4 flex flex-col overflow-hidden">
          <NodePalette />
        </aside>

        {/* Center — Canvas */}
        <main className="flex-1 relative overflow-hidden">
          <GraphCanvas />
        </main>

        {/* Right sidebar — Properties panel */}
        <aside className="w-72 flex-shrink-0 border-l border-gray-200 bg-white p-4 flex flex-col overflow-hidden">
          <PropertiesPanel />
        </aside>
      </div>
    </ReactFlowProvider>
  );
};
