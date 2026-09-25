import { SearchBar } from '@/components/shared/SearchBar';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { Bell, Plus, Minus, Plus as PlusIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/shared/Button';
import { useFontSize } from '@/hooks/useFontSize';

export function Header() {
  const navigate = useNavigate();
  const { fontSize, increase, decrease } = useFontSize();

  return (
    <header className="fixed top-0 right-0 left-0 md:left-64 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-30">
      <div className="flex items-center justify-between h-full px-4 md:px-6">
        <div className="flex-1 max-w-2xl">
          <SearchBar />
        </div>

        <div className="flex items-center gap-2 ml-4">
          {/* Font size controls */}
          <div className="flex items-center gap-0.5 border border-gray-200 dark:border-gray-700 rounded-lg px-1 py-0.5">
            <button
              onClick={decrease}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
              title="Decrease font size"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 min-w-[20px] text-center">{fontSize}</span>
            <button
              onClick={increase}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
              title="Increase font size"
            >
              <PlusIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/notes/new')}
            className="hidden md:flex"
          >
            <Plus className="w-4 h-4 mr-1" />
            New Note
          </Button>

          <button
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-danger-500 rounded-full" />
          </button>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
