import { useEffect, useRef } from 'react';
import { useAgentStore } from '../../hooks/useAgentStore';
import LogEntryComponent from './LogEntry';

export default function ReasoningLog() {
  const logEntries = useAgentStore((s) => s.logEntries);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logEntries]);

  if (logEntries.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <p className="text-sm">Run an analysis to see AI reasoning logs</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto flex flex-col gap-2">
      {logEntries.map((entry) => (
        <LogEntryComponent key={entry.id} entry={entry} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
