import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { notesApi } from '@/api/notes';
import { useReferenceData } from '@/hooks/useReferenceData';
import { useDebounce } from '@/hooks/useDebounce';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { getBucket } = useReferenceData();

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => notesApi.getAll({ search: debouncedQuery }),
    enabled: debouncedQuery.length >= 2,
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNoteClick = (noteId: number) => {
    navigate(`/notes/${noteId}`);
    setQuery('');
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div className="relative w-full max-w-md" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search notes... (Ctrl+K)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => query && setIsOpen(true)}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && debouncedQuery.length >= 2 && (
        <div className="absolute z-50 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
              Searching...
            </div>
          ) : results.length > 0 ? (
            <div>
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {results.length} result{results.length !== 1 ? 's' : ''}
              </div>
              {results.slice(0, 15).map((note) => {
                const bucket = getBucket(note.bucketId);
                return (
                  <div
                    key={note.id}
                    onClick={() => handleNoteClick(note.id)}
                    className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-t border-gray-100 dark:border-gray-700"
                  >
                    <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                      {note.name}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {bucket && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {bucket.name}
                        </span>
                      )}
                      {note.subNotes && note.subNotes.length > 0 && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {note.subNotes.length} subnotes
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {results.length > 15 && (
                <div className="px-3 py-2 text-xs text-center text-gray-400 border-t border-gray-100 dark:border-gray-700">
                  +{results.length - 15} more results
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
