import { NavLink } from 'react-router-dom';
import { RunButton } from './RunButton';

export const TopBar = () => (
  <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center px-6 gap-6 shrink-0">
    <span className="font-bold text-blue-400 text-lg">NetAI Studio</span>
    <nav className="flex gap-4 flex-1">
      <NavLink
        to="/"
        end
        className={({ isActive }) => isActive ? 'text-blue-400' : 'text-gray-400 hover:text-white'}
      >
        Graph Builder
      </NavLink>
      <NavLink
        to="/reasoning"
        className={({ isActive }) => isActive ? 'text-blue-400' : 'text-gray-400 hover:text-white'}
      >
        AI Reasoning
      </NavLink>
      <NavLink
        to="/insights"
        className={({ isActive }) => isActive ? 'text-blue-400' : 'text-gray-400 hover:text-white'}
      >
        Insights &amp; Chat
      </NavLink>
    </nav>
    <RunButton />
  </header>
);
