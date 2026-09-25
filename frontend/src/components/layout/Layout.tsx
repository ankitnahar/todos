import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useFontFamily } from '@/hooks/useFontFamily';

export function Layout() {
  useFontFamily();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(c => !c)} />
      <Header />
      <main className={`${isSidebarCollapsed ? 'md:pl-16' : 'md:pl-64'} pt-16 transition-all duration-300`}>
        <div className="p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
