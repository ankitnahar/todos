import type { ComponentType } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Layers,
  Flame,
  Tag,
  Folder,
  Users,
  Trash2,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';

interface NavItem {
  name: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Notes', path: '/notes', icon: FileText },
  { name: 'Bucket View', path: '/bucket-view', icon: Layers },
  { name: 'Priority Items', path: '/hot-topics', icon: Flame },
  { name: 'Tags', path: '/tags', icon: Tag },
  { name: 'Buckets', path: '/buckets', icon: Folder },
  { name: 'Assignees', path: '/team-members', icon: Users },
  { name: 'Deleted', path: '/deleted', icon: Trash2 },
  { name: 'Settings', path: '/settings', icon: Settings },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800',
        'transition-all duration-300 ease-in-out z-40',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex flex-col h-full">
        <div
          className={clsx(
            'flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800',
            isCollapsed && 'justify-center'
          )}
        >
          {!isCollapsed && (
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Notes App
            </h1>
          )}
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        </div>

        <nav className="flex-1 p-2 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200',
                      'hover:bg-gray-100 dark:hover:bg-gray-800',
                      isActive
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                        : 'text-gray-700 dark:text-gray-300',
                      isCollapsed && 'justify-center'
                    )
                  }
                  title={isCollapsed ? item.name : undefined}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && (
                    <span className="font-medium text-sm">{item.name}</span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <div
            className={clsx(
              'text-xs text-gray-500 dark:text-gray-400',
              isCollapsed ? 'text-center' : ''
            )}
          >
            {isCollapsed ? '©' : '© 2026 Notes App'}
          </div>
        </div>
      </div>
    </aside>
  );
}
