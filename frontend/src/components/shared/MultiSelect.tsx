import { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Plus } from 'lucide-react';
import clsx from 'clsx';

interface Option {
  id: number;
  name: string;
}

interface MultiSelectProps {
  label: string;
  options: Option[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
  allowCreate?: boolean;
  onCreateNew?: (name: string) => Promise<Option | undefined>;
}

export function MultiSelect({
  label,
  options,
  selectedIds,
  onChange,
  placeholder = 'Select...',
  allowCreate = false,
  onCreateNew,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOptions = options.filter((opt) => selectedIds.includes(opt.id));
  const filteredOptions = search
    ? options.filter((opt) => opt.name.toLowerCase().includes(search.toLowerCase()))
    : options;

  const showCreateOption =
    allowCreate &&
    onCreateNew &&
    search.trim() &&
    !options.some((opt) => opt.name.toLowerCase() === search.trim().toLowerCase());

  const handleToggle = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((selectedId) => selectedId !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const handleRemove = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedIds.filter((selectedId) => selectedId !== id));
  };

  const handleCreate = async () => {
    if (!onCreateNew || !search.trim()) return;
    setCreating(true);
    try {
      const newItem = await onCreateNew(search.trim());
      if (newItem) {
        onChange([...selectedIds, newItem.id]);
        setSearch('');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && showCreateOption) {
      e.preventDefault();
      handleCreate();
    }
  };

  return (
    <div className="w-full relative" ref={containerRef}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <div
        className={clsx(
          'w-full min-h-[42px] px-3 py-2 border rounded-lg cursor-pointer',
          'focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent',
          'dark:bg-gray-800',
          'border-gray-300 dark:border-gray-600'
        )}
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
      >
        <div className="flex flex-wrap gap-1.5 items-center">
          {selectedOptions.map((option) => (
            <span
              key={option.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300"
            >
              {option.name}
              <button
                onClick={(e) => handleRemove(option.id, e)}
                className="hover:bg-black/10 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {isOpen && (
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 min-w-[80px] outline-none bg-transparent text-sm dark:text-gray-100"
              placeholder={selectedOptions.length === 0 ? placeholder : 'Type to search...'}
            />
          )}
          {!isOpen && selectedOptions.length === 0 && (
            <span className="text-gray-400 dark:text-gray-500 text-sm">{placeholder}</span>
          )}
        </div>
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <ChevronDown
            className={clsx(
              'w-4 h-4 text-gray-400 transition-transform',
              isOpen && 'transform rotate-180'
            )}
          />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {showCreateOption && (
            <div
              className="px-3 py-2 cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/20 flex items-center gap-2 text-primary-600 dark:text-primary-400 border-b border-gray-100 dark:border-gray-700"
              onClick={(e) => {
                e.stopPropagation();
                handleCreate();
              }}
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">
                {creating ? 'Creating...' : `Create "${search.trim()}"`}
              </span>
            </div>
          )}
          {filteredOptions.length === 0 && !showCreateOption ? (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              {search ? 'No matches' : 'No options available'}
            </div>
          ) : (
            filteredOptions.map((option) => (
              <div
                key={option.id}
                className={clsx(
                  'px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700',
                  'flex items-center gap-2',
                  selectedIds.includes(option.id) && 'bg-primary-50 dark:bg-primary-900/20'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggle(option.id);
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(option.id)}
                  onChange={() => {}}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  {option.name}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
