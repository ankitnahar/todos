import { useState, useRef, useEffect } from 'react';
import { Filter, X, Search } from 'lucide-react';
import { NoteFilters } from '@/types';
import { Button } from '@/components/shared/Button';
import { useReferenceData } from '@/hooks/useReferenceData';

interface FilterPanelProps {
  filters: NoteFilters;
  onFiltersChange: (filters: NoteFilters) => void;
}

export function FilterPanel({ filters, onFiltersChange }: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [bucketSearch, setBucketSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const { buckets, tags, teamMembers } = useReferenceData();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

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

  const handleToggleTagMatchMode = () => {
    const current = filters.tagMatchMode || 'OR';
    onFiltersChange({ ...filters, tagMatchMode: current === 'OR' ? 'AND' : 'OR' });
  };

  const handleClearFilters = () => {
    onFiltersChange({});
  };

  const handleRemoveFilter = (type: 'bucket' | 'tag' | 'teamMember', id?: number) => {
    if (type === 'bucket' && id) {
      handleToggleBucket(id);
    } else if (type === 'tag' && id) {
      handleToggleTag(id);
    } else if (type === 'teamMember' && id) {
      handleToggleTeamMember(id);
    }
  };

  const activeFilterCount =
    (filters.bucketIds?.length || 0) +
    (filters.tagIds?.length || 0) +
    (filters.teamMemberIds?.length || 0);

  const filteredTags = tagSearch
    ? tags.filter((t) => t.name.toLowerCase().includes(tagSearch.toLowerCase()))
    : tags;

  const filteredBuckets = bucketSearch
    ? buckets.filter((b) => b.name.toLowerCase().includes(bucketSearch.toLowerCase()))
    : buckets;

  const filteredMembers = memberSearch
    ? teamMembers.filter((m) => m.name.toLowerCase().includes(memberSearch.toLowerCase()))
    : teamMembers;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Active filter chips - always visible */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {filters.bucketIds?.map((id) => {
            const bucket = buckets.find((b) => b.id === id);
            return bucket ? (
              <span
                key={`b-${id}`}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: bucket.color }} />
                {bucket.name}
                <button onClick={() => handleRemoveFilter('bucket', id)} className="ml-0.5 hover:text-danger-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ) : null;
          })}
          {filters.tagIds && filters.tagIds.length > 1 && (
            <button
              onClick={handleToggleTagMatchMode}
              className="px-2 py-1 text-xs font-bold rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-900/60 transition-colors"
              title={`Tags match mode: ${filters.tagMatchMode || 'OR'}`}
            >
              {filters.tagMatchMode === 'AND' ? 'AND' : 'OR'}
            </button>
          )}
          {filters.tagIds?.map((id) => {
            const tag = tags.find((t) => t.id === id);
            return tag ? (
              <span
                key={`t-${id}`}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
              >
                {tag.name}
                <button onClick={() => handleRemoveFilter('tag', id)} className="ml-0.5 hover:text-danger-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ) : null;
          })}
          {filters.teamMemberIds?.map((id) => {
            const member = teamMembers.find((m) => m.id === id);
            return member ? (
              <span
                key={`m-${id}`}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300"
              >
                {member.name}
                <button onClick={() => handleRemoveFilter('teamMember', id)} className="ml-0.5 hover:text-danger-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ) : null;
          })}
          <button
            onClick={handleClearFilters}
            className="text-xs text-gray-500 hover:text-danger-600 underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Filter button + dropdown */}
      <div className="relative" ref={panelRef}>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Filter className="w-4 h-4 mr-1" />
          Filter
          {activeFilterCount > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-primary-600 text-white rounded-full leading-none">
              {activeFilterCount}
            </span>
          )}
        </Button>

        {isOpen && (
          <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 max-h-[500px] overflow-y-auto">
            {/* Buckets */}
            <div className="p-3 border-b border-gray-100 dark:border-gray-700">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                Buckets
              </h4>
              {buckets.length > 5 && (
                <div className="relative mb-2">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={bucketSearch}
                    onChange={(e) => setBucketSearch(e.target.value)}
                    placeholder="Search buckets..."
                    className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
              )}
              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                {filteredBuckets.map((bucket) => (
                  <button
                    key={bucket.id}
                    onClick={() => handleToggleBucket(bucket.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg transition-colors ${
                      filters.bucketIds?.includes(bucket.id)
                        ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 font-medium'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: bucket.color }} />
                    {bucket.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags with AND/OR toggle */}
            <div className="p-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Tags
                </h4>
                {(filters.tagIds?.length || 0) > 1 && (
                  <button
                    onClick={handleToggleTagMatchMode}
                    className="px-2 py-0.5 text-[10px] font-bold rounded bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 hover:bg-primary-200"
                  >
                    {filters.tagMatchMode === 'AND' ? 'Match ALL' : 'Match ANY'}
                  </button>
                )}
              </div>
              <div className="relative mb-2">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  placeholder="Search tags..."
                  className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
              <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto">
                {filteredTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => handleToggleTag(tag.id)}
                    className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                      filters.tagIds?.includes(tag.id)
                        ? 'bg-primary-600 text-white font-medium'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Assignees */}
            <div className="p-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                Assignees
              </h4>
              {teamMembers.length > 5 && (
                <div className="relative mb-2">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search members..."
                    className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
              )}
              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                {filteredMembers.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => handleToggleTeamMember(member.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg transition-colors ${
                      filters.teamMemberIds?.includes(member.id)
                        ? 'bg-green-600 text-white font-medium'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-primary-500 flex items-center justify-center text-white text-[9px] font-medium">
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                    {member.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
