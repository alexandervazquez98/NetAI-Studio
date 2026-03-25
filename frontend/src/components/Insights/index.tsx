import AlertPanel from './AlertPanel';
import HistoryList from './HistoryList';
import ChatBox from './ChatBox';

export default function Insights() {
  return (
    <div className="flex h-full">
      <aside className="w-80 border-r border-gray-800 flex flex-col overflow-hidden">
        <AlertPanel />
        <div className="border-t border-gray-800">
          <HistoryList />
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <ChatBox />
      </main>
    </div>
  );
}
