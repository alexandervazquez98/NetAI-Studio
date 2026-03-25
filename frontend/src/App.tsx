import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TopBar } from './components/layout/TopBar';
import { GraphBuilder } from './components/GraphBuilder';
import AIReasoning from './components/AIReasoning';
import Insights from './components/Insights';
import 'reactflow/dist/style.css';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col h-screen bg-gray-950 text-gray-100">
        <TopBar />
        <main className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<GraphBuilder />} />
            <Route path="/reasoning" element={<AIReasoning />} />
            <Route path="/insights" element={<Insights />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
