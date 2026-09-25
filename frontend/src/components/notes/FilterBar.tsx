import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { NoteFilters } from '@/types';
import { useReferenceData } from '@/hooks/useReferenceData';
import { useQuery } from '@tanstack/react-query';
import { notesApi } from '@/api/notes';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '@/hooks/useDebounce';

interface FilterBarProps {
  filters: NoteFilters;
  onFiltersChange: (filters: NoteFilters) => void;
}

export function FilterBar({ filters, onFiltersChange }: FilterBarProps) {
  const { buckets, tags, teamMembers, getBucket } = useReferenceData();
  const navigate = useNavigate();

  const [textSearch, setTextSearch] = useState(filters.search || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debouncedSearch = useDebounce(textSearch, 300);
  const searchRef = useRef<HTMLDivElement>(null);

  const [bucketInput, setBucketInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [assigneeInput, setAssigneeInput] = useState('');

  const [bucketFocused, setBucketFocused] = useState(false);
  const [tagFocused, setTagFocused] = useState(false);
  const [assigneeFocused, setAssigneeFocused] = useState(false);

  const bucketRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const assigneeRef = useRef<HTMLDivElement>(null);

  const { data: searchResults = [] } = useQuery({
    queryKey: ['search-typeahead', debouncedSearch],
    queryFn: () => notesApi.getAll({ search: debouncedSearch }),
    enabled: debouncedSearch.length >= 2 && showSuggestions,
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSuggestions(false);
      if (bucketRef.current && !bucketRef.current.contains(e.target as Node)) setBucketFocused(false);
      if (tagRef.current && !tagRef.current.contains(e.target as Node)) setTagFocused(false);
      if (assigneeRef.current && !assigneeRef.current.contains(e.target as Node)) setAssigneeFocused(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleBucket = (bucketId: number) => {
    const current = filters.bucketIds || [];
    const updated = current.includes(bucketId)
      ? current.filter((id) => id !== bucketId)
      : [...current, bucketId];
    onFiltersChange({ ...filters, bucketIds: updated.length ? updated : undefined });
  };

  const handleToggleTag = (tagId: number) => {
    const current = filters.tagIds || [];
    const updated = current.includes(tagId)
      ? current.filter((id) => id !== tagId)
      : [...current, tagId];
    onFiltersChange({ ...filters, tagIds: updated.length ? updated : undefined });
  };

  const handleToggleTeamMember = (memberId: number) => {
    const current = filters.teamMemberIds || [];
    const updated = current.includes(memberId)
      ? current.filter((id) => id !== memberId)
      : [...current, memberId];
    onFiltersChange({ ...filters, teamMemberIds: updated.length ? updated : undefined });
  };

  const handleToggleTagMode = () => {
    onFiltersChange({
      ...filters,
      tagMatchMode: filters.tagMatchMode === 'OR' ? 'AND' : 'OR',
    });
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setShowSuggestions(false);
      onFiltersChange({ ...filters, search: textSearch || undefined });
    }
    if (e.key === 'Escape') setShowSuggestions(false);
  };

  const handleClearSearch = () => {
    setTextSearch('');
    setShowSuggestions(false);
    onFiltersChange({ ...filters, search: undefined });
  };

  const handleSuggestionClick = (noteId: number) => {
    setShowSuggestions(false);
    navigate(`/notes/${noteId}`);
  };

  const filteredBuckets = bucketInput
    ? buckets.filter((b) => b.name.toLowerCase().includes(bucketInput.toLowerCase()))
    : buckets;

  const filteredTags = tagInput
    ? tags.filter((t) => t.name.toLowerCase().includes(tagInput.toLowerCase()))
    : tags;

  const filteredMembers = assigneeInput
    ? teamMembers.filter((m) => m.name.toLowerCase().includes(assigneeInput.toLowerCase()))
    : teamMembers;

  const selectedBucketNames = useMemo(() =>
    (filters.bucketIds || []).map((id) => buckets.find((b) => b.id === id)?.name).filter(Boolean) as string[],
    [filters.bucketIds, buckets]
  );

  const selectedTagNames = useMemo(() =>
    (filters.tagIds || []).map((id) => tags.find((t) => t.id === id)?.name).filter(Boolean) as string[],
    [filters.tagIds, tags]
  );

  const selectedMemberNames = useMemo(() =>
    (filters.teamMemberIds || []).map((id) => teamMembers.find((m) => m.id === id)?.name).filter(Boolean) as string[],
    [filters.teamMemberIds, teamMembers]
  );

  const hasAnyFilter = (filters.bucketIds?.length || 0) + (filters.tagIds?.length || 0) + (filters.teamMemberIds?.length || 0) + (filters.search ? 1 : 0) > 0;

  return (
    <div className="space-y-2">
      {/* Row 1: Filters + Search inline */}
      <div className="flex items-start gap-2 flex-wrap">
        {/* Tags filter - leftmost */}
        <div className="relative min-w-[150px]" ref={tagRef}>
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onFocus={() => setTagFocused(true)}
            placeholder={selectedTagNames.length ? selectedTagNames.join(', ') : 'Tags...'}
            className={`w-full px-2.5 py-1.5 text-xs text-gray-900 dark:text-gray-100 border-2 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 placeholder-gray-600 dark:placeholder-gray-500 ${
              (filters.tagIds?.length || 0) > 0
                ? 'border-primary-500 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                : 'border-gray-500 dark:border-gray-400 bg-white dark:bg-gray-800'
            }`}
          />
          {(filters.tagIds?.length || 0) > 0 && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 px-1 py-0.5 text-[9px] font-bold bg-primary-600 text-white rounded-full leading-none">
              {filters.tagIds!.length}
            </span>
          )}

          {tagFocused && (
            <div className="absolute z-50 mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {(filters.tagIds?.length || 0) > 0 && (
                <div className="sticky top-0 p-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 space-y-2">
                  {/* AND/OR toggle group */}
                  <div className="flex items-center gap-1 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 p-0.5">
                    <button
                      onClick={() => !filters.tagMatchMode || filters.tagMatchMode === 'OR' ? handleToggleTagMode() : null}
                      className={`flex-1 px-1.5 py-0.5 text-[9px] font-bold rounded transition-colors ${
                        filters.tagMatchMode !== 'OR'
                          ? 'bg-primary-500 dark:bg-primary-600 text-white'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      AND
                    </button>
                    <button
                      onClick={() => filters.tagMatchMode === 'OR' ? null : handleToggleTagMode()}
                      className={`flex-1 px-1.5 py-0.5 text-[9px] font-bold rounded transition-colors ${
                        filters.tagMatchMode === 'OR'
                          ? 'bg-primary-500 dark:bg-primary-600 text-white'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      OR
                    </button>
                  </div>
                  {/* Selected tags */}
                  <div className="flex flex-wrap gap-1">
                    {selectedTagNames.map((name, i) => (
                      <span key={`t-${i}`} className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 whitespace-nowrap">
                        {name}
                        <button onClick={() => handleToggleTag(filters.tagIds![i])} className="hover:text-danger-500 p-0.5" title={`Remove ${name}`}><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {filteredTags.map((tag) => (
                <label key={tag.id} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.tagIds?.includes(tag.id) || false}
                    onChange={() => handleToggleTag(tag.id)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-3.5 h-3.5"
                  />
                  <span className="text-xs text-gray-800 dark:text-gray-200">{tag.name}</span>
                </label>
              ))}
              {filteredTags.length === 0 && (
                <div className="px-3 py-2 text-xs text-gray-400">No matching tags</div>
              )}
            </div>
          )}
        </div>

        {/* Text search with typeahead */}
        <div className="relative min-w-[180px] flex-1 max-w-[280px]" ref={searchRef}>
          <Search className="absolute left-2.5 top-[9px] w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={textSearch}
            onChange={(e) => {
              setTextSearch(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => textSearch.length >= 2 && setShowSuggestions(true)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search notes & subnotes..."
            className="w-full pl-7 pr-7 py-1.5 text-xs text-gray-900 dark:text-gray-100 border-2 border-gray-700 dark:border-gray-400 rounded bg-white dark:bg-gray-800 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          />
          {textSearch && (
            <button onClick={handleClearSearch} className="absolute right-2 top-[9px] text-gray-400 hover:text-gray-600 p-1" title="Clear search">
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {showSuggestions && debouncedSearch.length >= 2 && (
            <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-72 overflow-y-auto">
              {searchResults.length > 0 ? (
                <>
                  {searchResults.slice(0, 12).map((note) => {
                    const bucket = getBucket(note.bucketId);
                    const matchingSubNotes = note.subNotes?.filter(
                      (sn) =>
                        sn.header.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                        sn.description?.toLowerCase().includes(debouncedSearch.toLowerCase())
                    ) || [];
                    return (
                      <div key={note.id}>
                        <div
                          onClick={() => handleSuggestionClick(note.id)}
                          className="px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex items-center gap-2"
                        >
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate flex-1">{note.name}</span>
                          {bucket && (
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">{bucket.name}</span>
                          )}
                        </div>
                        {matchingSubNotes.slice(0, 2).map((sn) => (
                          <div key={sn.id} onClick={() => handleSuggestionClick(note.id)} className="px-3 py-1 pl-7 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                            <span className="text-xs text-gray-600 dark:text-gray-400">↳ {sn.header}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                  <div className="px-3 py-1.5 text-xs text-gray-400 border-t border-gray-100 dark:border-gray-700">
                    Press Enter to filter all results
                  </div>
                </>
              ) : (
                <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No matches</div>
              )}
            </div>
          )}
        </div>

        {/* Bucket filter - always visible input */}
        <div className="relative min-w-[150px]" ref={bucketRef}>
          <input
            type="text"
            value={bucketInput}
            onChange={(e) => setBucketInput(e.target.value)}
            onFocus={() => setBucketFocused(true)}
            placeholder={selectedBucketNames.length ? selectedBucketNames.join(', ') : 'Bucket...'}
            className={`w-full px-2.5 py-1.5 text-xs text-gray-900 dark:text-gray-100 border-2 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 placeholder-gray-600 dark:placeholder-gray-500 ${
              (filters.bucketIds?.length || 0) > 0
                ? 'border-primary-500 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                : 'border-gray-500 dark:border-gray-400 bg-white dark:bg-gray-800'
            }`}
          />
          {(filters.bucketIds?.length || 0) > 0 && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 px-1 py-0.5 text-[9px] font-bold bg-primary-600 text-white rounded-full leading-none">
              {filters.bucketIds!.length}
            </span>
          )}

          {bucketFocused && (
            <div className="absolute z-50 mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {(filters.bucketIds?.length || 0) > 0 && (
                <div className="sticky top-0 p-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex flex-wrap gap-1">
                    {selectedBucketNames.map((name, i) => (
                      <span key={`b-${i}`} className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 whitespace-nowrap">
                        {name}
                        <button onClick={() => handleToggleBucket(filters.bucketIds![i])} className="hover:text-danger-500 p-0.5" title={`Remove ${name}`}><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {filteredBuckets.map((bucket) => (
                <label key={bucket.id} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.bucketIds?.includes(bucket.id) || false}
                    onChange={() => handleToggleBucket(bucket.id)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-3.5 h-3.5"
                  />
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: bucket.color }} />
                  <span className="text-xs text-gray-800 dark:text-gray-200">{bucket.name}</span>
                </label>
              ))}
              {filteredBuckets.length === 0 && (
                <div className="px-3 py-2 text-xs text-gray-400">No matching buckets</div>
              )}
            </div>
          )}
        </div>

        {/* Assignee filter - always visible input */}
        <div className="relative min-w-[150px]" ref={assigneeRef}>
          <input
            type="text"
            value={assigneeInput}
            onChange={(e) => setAssigneeInput(e.target.value)}
            onFocus={() => setAssigneeFocused(true)}
            placeholder={selectedMemberNames.length ? selectedMemberNames.join(', ') : 'Assignee...'}
            className={`w-full px-2.5 py-1.5 text-xs text-gray-900 dark:text-gray-100 border-2 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 placeholder-gray-600 dark:placeholder-gray-500 ${
              (filters.teamMemberIds?.length || 0) > 0
                ? 'border-primary-500 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                : 'border-gray-500 dark:border-gray-400 bg-white dark:bg-gray-800'
            }`}
          />
          {(filters.teamMemberIds?.length || 0) > 0 && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 px-1 py-0.5 text-[9px] font-bold bg-primary-600 text-white rounded-full leading-none">
              {filters.teamMemberIds!.length}
            </span>
          )}

          {assigneeFocused && (
            <div className="absolute z-50 mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {(filters.teamMemberIds?.length || 0) > 0 && (
                <div className="sticky top-0 p-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex flex-wrap gap-1">
                    {selectedMemberNames.map((name, i) => (
                      <span key={`m-${i}`} className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 whitespace-nowrap">
                        {name}
                        <button onClick={() => handleToggleTeamMember(filters.teamMemberIds![i])} className="hover:text-danger-500 p-0.5" title={`Remove ${name}`}><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {filteredMembers.map((member) => (
                <label key={member.id} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.teamMemberIds?.includes(member.id) || false}
                    onChange={() => handleToggleTeamMember(member.id)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-3.5 h-3.5"
                  />
                  <span className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center text-white text-[9px] font-medium flex-shrink-0">
                    {member.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-800 dark:text-gray-200">{member.name}</span>
                </label>
              ))}
              {filteredMembers.length === 0 && (
                <div className="px-3 py-2 text-xs text-gray-400">No matching members</div>
              )}
            </div>
          )}
        </div>


        {/* Clear all */}
        {hasAnyFilter && (
          <button
            onClick={() => {
              setTextSearch('');
              onFiltersChange({});
            }}
            className="text-xs text-gray-500 hover:text-danger-600 underline py-1.5"
          >
            Clear
          </button>
        )}
      </div>

      {/* Selected chips row */}
      {hasAnyFilter && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {filters.search && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              "{filters.search}"
              <button onClick={handleClearSearch} className="hover:text-danger-500"><X className="w-3 h-3" /></button>
            </span>
          )}
          {selectedBucketNames.map((name, i) => (
            <span key={`b-${i}`} className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300">
              {name}
              <button onClick={() => handleToggleBucket(filters.bucketIds![i])} className="hover:text-danger-500"><X className="w-3 h-3" /></button>
            </span>
          ))}
          {selectedTagNames.map((name, i) => (
            <span key={`t-${i}`} className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300">
              {name}
              {i < selectedTagNames.length - 1 && (
                <span className="text-[9px] font-bold text-primary-500 ml-0.5">{filters.tagMatchMode === 'OR' ? 'OR' : 'AND'}</span>
              )}
              <button onClick={() => handleToggleTag(filters.tagIds![i])} className="hover:text-danger-500"><X className="w-3 h-3" /></button>
            </span>
          ))}
          {selectedMemberNames.map((name, i) => (
            <span key={`m-${i}`} className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300">
              {name}
              <button onClick={() => handleToggleTeamMember(filters.teamMemberIds![i])} className="hover:text-danger-500"><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
