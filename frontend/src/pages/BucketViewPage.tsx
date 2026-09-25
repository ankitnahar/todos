import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bucketsApi } from '@/api/buckets';
import { notesApi, subNotesApi } from '@/api/notes';
import { tagsApi } from '@/api/tags';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/shared/Badge';
import { QuickAddNoteModal } from '@/components/notes/QuickAddNoteModal';
import { RichTextEditor } from '@/components/shared/RichTextEditor';
import {
  Layers,
  Star,
  Flame,
  Edit,
  Eye,
  EyeOff,
  Copy,
  FolderOpen,
  List,
  X,
  Search,
  ChevronDown,
  ChevronRight,
  Tag,
  Users,
  Save,
  Plus,
  Trash2,
  Filter,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useReferenceData } from '@/hooks/useReferenceData';
import { useKeyboard } from '@/hooks/useKeyboard';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import type { Note } from '@/types';

// Convert HTML to plain text while preserving line breaks (safe regex-based)
function htmlToPlainText(html: string): string {
  if (!html) return '';

  let text = html;

  // Replace <br>, <br/>, <br /> with newlines (case-insensitive)
  text = text.replace(/<br[^>]*>/gi, '\n');

  // Replace block-level closing tags with newlines to preserve structure
  text = text.replace(/<\/p>/gi, '\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<\/blockquote>/gi, '\n');

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]*>/g, '');

  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Clean up excessive whitespace but preserve paragraph breaks (double newline)
  text = text.replace(/\n{3,}/g, '\n\n'); // 3+ newlines → double newline
  text = text.replace(/[ \t]+/g, ' '); // Multiple spaces/tabs → single space

  return text.trim();
}

type TypeFilter = 'all' | 'favorites' | 'hot';

export function BucketViewPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { tags, teamMembers, getTags, getTeamMembers } = useReferenceData();

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [selectedBucketIds, setSelectedBucketIds] = useState<number[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [tagMatchMode, setTagMatchMode] = useState<'AND' | 'OR'>('AND');
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [groupByNote, setGroupByNote] = useState(true);
  const [showMeta, setShowMeta] = useState(false);
  useKeyboard('m', () => setShowMeta((v) => !v), [], { modifier: 'alt' });
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());
  const [expandedSubNotes, setExpandedSubNotes] = useState<Set<number>>(new Set());
  const [collapsedBuckets, setCollapsedBuckets] = useState<Set<number>>(new Set());
  const [editingDescriptions, setEditingDescriptions] = useState<Record<string, string>>({});
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  // Filter dropdowns
  const [bucketDropOpen, setBucketDropOpen] = useState(false);
  const [tagDropOpen, setTagDropOpen] = useState(false);
  const [memberDropOpen, setMemberDropOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');

  const { data: buckets = [], isLoading: bucketsLoading } = useQuery({
    queryKey: ['buckets'],
    queryFn: bucketsApi.getAll,
  });

  const { data: allNotes = [], isLoading: notesLoading } = useQuery({
    queryKey: ['notes'],
    queryFn: () => notesApi.getAll(),
  });

  const toggleHotTopicMutation = useMutation({
    mutationFn: notesApi.toggleHotTopic,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  const toggleSubNoteHotTopicMutation = useMutation({
    mutationFn: subNotesApi.toggleHotTopic,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ id, tagNames, teamMemberIds, bucketId, details }: { id: number; tagNames?: string[]; teamMemberIds?: number[]; bucketId?: number | null; details?: string }) =>
      notesApi.update(id, { tagNames, teamMemberIds, bucketId: bucketId === null ? undefined : bucketId, details }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  });

  const updateSubNoteMutation = useMutation({
    mutationFn: ({ id, tagNames, teamMemberIds, bucketId, description }: { id: number; tagNames?: string[]; teamMemberIds?: number[]; bucketId?: number | null; description?: string }) =>
      subNotesApi.update(id, { tagNames, teamMemberIds, bucketId: bucketId === null ? undefined : bucketId, description }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  });

  const deleteSubNoteMutation = useMutation({
    mutationFn: (subNoteId: number) => subNotesApi.delete(subNoteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Deleted');
    },
    onError: () => toast.error('Failed to delete'),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: number) => notesApi.delete(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Note deleted');
    },
    onError: () => toast.error('Failed to delete'),
  });

  const handleDescChange = useCallback((key: string, value: string) => {
    setEditingDescriptions((prev) => ({ ...prev, [key]: value }));
  }, []);

  const saveDescription = useCallback((itemType: 'note' | 'subnote', itemId: number, key: string) => {
    const desc = editingDescriptions[key];
    if (desc === undefined) return;
    if (itemType === 'subnote') {
      updateSubNoteMutation.mutate({ id: itemId, description: desc });
    } else {
      updateNoteMutation.mutate({ id: itemId, details: desc });
    }
    setEditingDescriptions((prev) => { const next = { ...prev }; delete next[key]; return next; });
    toast.success('Description saved');
  }, [editingDescriptions, updateSubNoteMutation, updateNoteMutation]);

  // Inline title editing (double-click)
  const [editingTitle, setEditingTitle] = useState<{ type: 'note' | 'subnote'; id: number; value: string } | null>(null);
  const handleTitleDoubleClick = (e: React.MouseEvent, type: 'note' | 'subnote', id: number, currentTitle: string) => {
    e.stopPropagation();
    setEditingTitle({ type, id, value: currentTitle });
  };
  const handleTitleSave = async () => {
    if (!editingTitle) return;
    const { type, id, value } = editingTitle;
    if (value.trim()) {
      if (type === 'note') await notesApi.update(id, { name: value.trim() });
      else await subNotesApi.update(id, { header: value.trim() });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    }
    setEditingTitle(null);
  };
  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleTitleSave();
    if (e.key === 'Escape') setEditingTitle(null);
  };

  // Ctrl+Alt+N keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.key === 'n') {
        e.preventDefault();
        setQuickAddOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Inline popup for tag/assignee/bucket editing
  type PopupType = 'tags' | 'assignees' | 'bucket';
  const [inlinePopup, setInlinePopup] = useState<{ type: PopupType; itemType: 'note' | 'subnote'; itemId: number; tagIds: number[]; teamMemberIds: number[]; bucketId?: number } | null>(null);
  const [popupSearch, setPopupSearch] = useState('');
  const inlinePopupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (inlinePopupRef.current && !inlinePopupRef.current.contains(e.target as Node)) {
        setInlinePopup(null);
        setPopupSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Esc collapses expanded description; confirm if unsaved changes exist
  useEffect(() => {
    if (expandedSubNotes.size === 0) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // editingDescriptions keys are "<type>-<id>"; find one whose id is in expandedSubNotes
      const unsavedKey = Object.keys(editingDescriptions).find((k) => {
        const id = Number(k.split('-')[1]);
        return expandedSubNotes.has(id);
      });
      if (unsavedKey) {
        if (!confirm('You have unsaved changes. Discard them?')) return;
        setEditingDescriptions((prev) => { const next = { ...prev }; delete next[unsavedKey]; return next; });
        const itemId = Number(unsavedKey.split('-')[1]);
        setExpandedSubNotes((prev) => { const next = new Set(prev); next.delete(itemId); return next; });
      } else {
        setExpandedSubNotes(new Set());
      }
      e.stopPropagation();
    };
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [expandedSubNotes, editingDescriptions]);

  const openInlinePopup = (type: PopupType, itemType: 'note' | 'subnote', itemId: number, tagIds: number[], teamMemberIds: number[], bucketId?: number) => {
    setInlinePopup({ type, itemType, itemId, tagIds, teamMemberIds, bucketId });
    setPopupSearch('');
  };

  const handleInlineToggleTag = (tagId: number) => {
    if (!inlinePopup) return;
    const current = inlinePopup.tagIds;
    const newTagIds = current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId];
    setInlinePopup({ ...inlinePopup, tagIds: newTagIds });
    const tagNames = getTags(newTagIds).map((t) => t.name);
    if (inlinePopup.itemType === 'note') updateNoteMutation.mutate({ id: inlinePopup.itemId, tagNames });
    else updateSubNoteMutation.mutate({ id: inlinePopup.itemId, tagNames });
  };

  const handleInlineToggleMember = (memberId: number) => {
    if (!inlinePopup) return;
    const current = inlinePopup.teamMemberIds;
    const newIds = current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId];
    setInlinePopup({ ...inlinePopup, teamMemberIds: newIds });
    if (inlinePopup.itemType === 'note') updateNoteMutation.mutate({ id: inlinePopup.itemId, teamMemberIds: newIds });
    else updateSubNoteMutation.mutate({ id: inlinePopup.itemId, teamMemberIds: newIds });
  };

  const handleInlineSetBucket = (newBucketId: number | null) => {
    if (!inlinePopup) return;
    setInlinePopup({ ...inlinePopup, bucketId: newBucketId ?? undefined });
    if (inlinePopup.itemType === 'note') updateNoteMutation.mutate({ id: inlinePopup.itemId, bucketId: newBucketId });
    else updateSubNoteMutation.mutate({ id: inlinePopup.itemId, bucketId: newBucketId });
    setInlinePopup(null);
  };

  const handleInlineCreateTag = async () => {
    if (!inlinePopup || inlinePopup.type !== 'tags') return;
    const name = popupSearch.trim();
    if (!name) return;
    try {
      const newTag = await tagsApi.create({ name });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      const newTagIds = [...inlinePopup.tagIds, newTag.id];
      setInlinePopup({ ...inlinePopup, tagIds: newTagIds });
      const tagNames = getTags(inlinePopup.tagIds).map((t) => t.name).concat(newTag.name);
      if (inlinePopup.itemType === 'note') updateNoteMutation.mutate({ id: inlinePopup.itemId, tagNames });
      else updateSubNoteMutation.mutate({ id: inlinePopup.itemId, tagNames });
      setPopupSearch('');
      toast.success(`Tag "${name}" created`);
    } catch {
      toast.error('Failed to create tag');
    }
  };

  const isLoading = bucketsLoading || notesLoading;

  const sortedBuckets = useMemo(() => [...buckets].sort((a, b) => a.priority - b.priority), [buckets]);


  // Build the items to display: for notes without subnotes show the note itself, for nested notes show subnotes
  const allItems = useMemo(() => {
    const items: Array<{
      type: 'note' | 'subnote';
      id: number;
      name: string;
      bucketId?: number;
      tagIds: number[];
      teamMemberIds: number[];
      hotTopic: boolean;
      favorite: boolean;
      description?: string;
      parentNote?: Note;
      details?: string;
    }> = [];

    allNotes.forEach((note) => {
      if (note.nested && note.subNotes?.length) {
        note.subNotes.forEach((sn: any) => {
          items.push({
            type: 'subnote',
            id: sn.id,
            name: sn.header,
            bucketId: sn.bucketId,
            tagIds: sn.tagIds || [],
            teamMemberIds: sn.teamMemberIds || [],
            hotTopic: sn.hotTopic || false,
            favorite: note.favorite,
            description: sn.description,
            parentNote: note,
          });
        });
      } else {
        items.push({
          type: 'note',
          id: note.id,
          name: note.name,
          bucketId: note.bucketId,
          tagIds: note.tagIds || [],
          teamMemberIds: note.teamMemberIds || [],
          hotTopic: note.hotTopic,
          favorite: note.favorite,
          details: note.details,
        });
      }
    });
    return items;
  }, [allNotes]);

  // Apply filters
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      if (typeFilter === 'favorites' && !item.favorite) return false;
      if (typeFilter === 'hot' && !item.hotTopic) return false;
      if (selectedBucketIds.length > 0 && !selectedBucketIds.includes(item.bucketId || 0)) return false;
      if (selectedTagIds.length > 0) {
        const combinedTagIds = [...item.tagIds, ...(item.parentNote?.tagIds || [])];
        const matches = tagMatchMode === 'OR'
          ? selectedTagIds.some((tid) => combinedTagIds.includes(tid))
          : selectedTagIds.every((tid) => combinedTagIds.includes(tid));
        if (!matches) return false;
      }
      if (selectedMemberIds.length > 0 && !selectedMemberIds.some((mid) => item.teamMemberIds.includes(mid))) return false;
      return true;
    });
  }, [allItems, typeFilter, selectedBucketIds, selectedTagIds, selectedMemberIds]);

  // Group items by bucket
  const itemsByBucket = useMemo(() => {
    const map = new Map<number, typeof filteredItems>();
    sortedBuckets.forEach((b) => map.set(b.id, []));
    map.set(0, []); // unassigned
    filteredItems.forEach((item) => {
      const key = item.bucketId || 0;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    });
    return map;
  }, [filteredItems, sortedBuckets]);

  // Group items by bucket then by parent note (for groupByNote mode)
  const itemsByBucketByNote = useMemo(() => {
    if (!groupByNote) return null;
    const result = new Map<number, Map<number, typeof filteredItems>>();
    sortedBuckets.forEach((b) => result.set(b.id, new Map()));
    result.set(0, new Map());

    filteredItems.forEach((item) => {
      const bucketKey = item.bucketId || 0;
      if (!result.has(bucketKey)) result.set(bucketKey, new Map());
      const noteMap = result.get(bucketKey)!;
      const noteKey = item.type === 'subnote' ? item.parentNote!.id : item.id;
      if (!noteMap.has(noteKey)) noteMap.set(noteKey, []);
      noteMap.get(noteKey)!.push(item);
    });
    return result;
  }, [filteredItems, sortedBuckets, groupByNote]);

  const expandAllNotes = useCallback(() => {
    if (!itemsByBucketByNote) return;
    const allNoteIds = new Set<number>();
    itemsByBucketByNote.forEach((noteMap) => {
      noteMap.forEach((_, noteId) => allNoteIds.add(noteId));
    });
    setExpandedNotes(allNoteIds);
  }, [itemsByBucketByNote]);

  const collapseAllNotes = useCallback(() => {
    setExpandedNotes(new Set());
  }, []);

  useKeyboard('ArrowDown', expandAllNotes, [itemsByBucketByNote], { modifier: 'alt' });
  useKeyboard('ArrowUp', collapseAllNotes, [], { modifier: 'alt' });

  const toggleBucketFilter = (id: number) => {
    setSelectedBucketIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleTagFilter = (id: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleMemberFilter = (id: number) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleBucketCollapse = (id: number) => {
    setCollapsedBuckets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const buildCopyText = (includeContent: boolean) => {
    const lines: string[] = [];
    sortedBuckets.forEach((bucket) => {
      const bucketItems = itemsByBucket.get(bucket.id) || [];
      if (bucketItems.length === 0) return;
      lines.push(bucket.name);
      if (groupByNote) {
        const noteMap = (itemsByBucketByNote?.get(bucket.id)) || new Map();
        Array.from(noteMap.entries()).forEach(([noteId, noteItems]) => {
          const parentNote = (noteItems as any)[0]?.parentNote || allNotes.find((n: any) => n.id === noteId);
          const noteName = parentNote?.name || 'Note';
          lines.push(`\t${noteName}`);
          (noteItems as typeof filteredItems).forEach((item) => {
            lines.push(`\t\t${item.name}`);
            if (includeContent) {
              const desc = htmlToPlainText(item.description || item.details || '');
              if (desc) {
                desc.split('\n').forEach(line => {
                  lines.push(`\t\t\t${line}`);
                });
              }
            }
          });
        });
      } else {
        bucketItems.forEach((item) => {
          lines.push(`\t${item.name}`);
          if (includeContent) {
            const desc = (item.description || item.details || '').replace(/<[^>]*>/g, '').trim();
            if (desc) lines.push(`\t\t${desc}`);
          }
        });
      }
    });
    const unassigned = itemsByBucket.get(0) || [];
    if (unassigned.length > 0) {
      lines.push('Unassigned');
      unassigned.forEach((item) => {
        lines.push(`\t${item.name}`);
        if (includeContent) {
          const desc = (item.description || item.details || '').replace(/<[^>]*>/g, '').trim();
          if (desc) lines.push(`\t\t${desc}`);
        }
      });
    }
    return lines.join('\n');
  };

  const handleCopyTitles = () => {
    navigator.clipboard.writeText(buildCopyText(false));
    toast.success('Titles copied');
  };

  const handleCopyAll = () => {
    navigator.clipboard.writeText(buildCopyText(true));
    toast.success('All content copied');
  };

  const clearAllFilters = () => {
    setTypeFilter('all');
    setSelectedBucketIds([]);
    setSelectedTagIds([]);
    setSelectedMemberIds([]);
  };

  const activeFilterCount =
    (typeFilter !== 'all' ? 1 : 0) +
    selectedBucketIds.length +
    selectedTagIds.length +
    selectedMemberIds.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (buckets.length === 0) {
    return (
      <EmptyState
        icon={Layers}
        title="No buckets found"
        description="Create some buckets to organize your notes"
        action={
          <button
            onClick={() => navigate('/buckets')}
            className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            Go to Buckets
          </button>
        }
      />
    );
  }

  const renderItem = (item: typeof filteredItems[0], index: number) => {
    const itemTags = getTags(item.tagIds);
    const ownTagIdSet = new Set(item.tagIds);
    const inheritedTags = item.type === 'subnote' && item.parentNote
      ? getTags((item.parentNote.tagIds || []).filter((id) => !ownTagIdSet.has(id)))
      : [];
    const itemMembers = getTeamMembers(item.teamMemberIds);
    const isExpanded = expandedSubNotes.has(item.id);
    const hasDescription = !!(item.description || item.details);

    return (
      <div
        key={`${item.type}-${item.id}`}
        className={clsx(
          'border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-blue-50/50 dark:hover:bg-gray-800/50 transition-colors',
          index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-blue-100/70 dark:bg-gray-700/60'
        )}
      >
        <div
          className="flex items-start gap-3 px-4 py-2.5 cursor-pointer"
          onClick={() => setExpandedSubNotes((prev) => {
            const next = new Set(prev);
            if (next.has(item.id)) next.delete(item.id); else next.add(item.id);
            return next;
          })}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {item.favorite && <Star className="w-4 h-4 stroke-[2.5] fill-warning-400 text-warning-400 flex-shrink-0" />}
              {editingTitle?.type === item.type && editingTitle.id === item.id ? (
                <input
                  type="text"
                  value={editingTitle.value}
                  onChange={(e) => setEditingTitle({ ...editingTitle, value: e.target.value })}
                  onBlur={handleTitleSave}
                  onKeyDown={handleTitleKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 text-base font-medium bg-white dark:bg-gray-800 border border-primary-400 rounded px-2 py-0.5 focus:ring-1 focus:ring-primary-500 outline-none"
                  autoFocus
                />
              ) : (
                <span
                  className="text-[15px] font-medium text-gray-900 dark:text-gray-100 break-words min-w-0"
                  onDoubleClick={(e) => handleTitleDoubleClick(e, item.type, item.id, item.name)}
                  title="Double-click to edit"
                >
                  {item.name}
                </span>
              )}
              {item.type === 'subnote' && item.parentNote && (
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/notes/${item.parentNote!.id}`); }}
                  className="text-xs text-primary-700 hover:text-primary-900 dark:text-primary-300 dark:hover:text-primary-100 hover:underline flex-shrink-0 font-medium"
                  title={`Go to note: ${item.parentNote.name}`}
                >
                  ↗ {item.parentNote.name}
                </button>
              )}
            </div>
            {showMeta && (itemTags.length > 0 || inheritedTags.length > 0 || itemMembers.length > 0) && (
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {itemTags.map((t) => (
                  <span key={t.id} className="px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium border border-blue-200 dark:border-blue-800">
                    {t.name}
                  </span>
                ))}
                {inheritedTags.map((t) => (
                  <span key={`inh-${t.id}`} className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700/50 text-gray-400 dark:text-gray-500 font-normal border border-dashed border-gray-300 dark:border-gray-600 italic" title="Inherited from parent note">
                    {t.name}
                  </span>
                ))}
                {itemMembers.map((m) => (
                  <span key={m.id} className="px-2 py-0.5 text-xs rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium border border-purple-200 dark:border-purple-800">
                    {m.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); openInlinePopup('tags', item.type, item.id, item.tagIds, item.teamMemberIds, item.bucketId); }}
              className={clsx('p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700', item.tagIds.length > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400')}
              title="Edit tags"
            >
              <Tag className="w-4 h-4 stroke-[2]" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); openInlinePopup('assignees', item.type, item.id, item.tagIds, item.teamMemberIds, item.bucketId); }}
              className={clsx('p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700', item.teamMemberIds.length > 0 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400')}
              title="Edit assignees"
            >
              <Users className="w-4 h-4 stroke-[2]" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); openInlinePopup('bucket', item.type, item.id, item.tagIds, item.teamMemberIds, item.bucketId); }}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
              title="Change bucket"
            >
              <Layers className="w-4 h-4 stroke-[2]" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); item.type === 'note' ? toggleHotTopicMutation.mutate(item.id) : toggleSubNoteHotTopicMutation.mutate(item.id); }}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Toggle hot topic"
            >
              <Flame className={clsx('w-4 h-4 stroke-[2.5]', item.hotTopic ? 'fill-danger-400 text-danger-500' : 'text-gray-500 fill-none')} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setExpandedSubNotes((prev) => { const next = new Set(prev); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; }); }}
              className={clsx('p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700', hasDescription ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400')}
              title="Toggle description"
            >
              <Eye className="w-4 h-4 stroke-[2]" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); navigate(item.type === 'note' ? `/notes/${item.id}/edit` : `/notes/${item.parentNote!.id}/edit?subNoteId=${item.id}`); }}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Edit"
            >
              <Edit className="w-4 h-4 text-gray-500 dark:text-gray-400 stroke-[2]" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete this ${item.type === 'note' ? 'note' : 'subnote'}?`)) {
                  if (item.type === 'note') deleteNoteMutation.mutate(item.id);
                  else deleteSubNoteMutation.mutate(item.id);
                }
              }}
              className="p-1.5 rounded hover:bg-danger-100 dark:hover:bg-danger-900/30 text-gray-400 hover:text-danger-600"
              title="Delete"
            >
              <Trash2 className="w-4 h-4 stroke-[2]" />
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="px-3 pb-2 pl-6" onClick={(e) => e.stopPropagation()}>
            <RichTextEditor
              content={editingDescriptions[`${item.type}-${item.id}`] ?? (item.description || item.details || '')}
              onChange={(val) => handleDescChange(`${item.type}-${item.id}`, val)}
              compact
            />
            {editingDescriptions[`${item.type}-${item.id}`] !== undefined && (
              <div className="flex justify-end mt-1">
                <button
                  onClick={() => saveDescription(item.type, item.id, `${item.type}-${item.id}`)}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-primary-600 rounded hover:bg-primary-700"
                >
                  <Save className="w-3 h-3" /> Save
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderBucketSection = (bucketId: number, bucketName: string, bucketColor: string, items: typeof filteredItems) => {
    if (items.length === 0) return null;
    const isCollapsed = collapsedBuckets.has(bucketId);

    return (
      <fieldset
        key={bucketId}
        className="rounded-lg mb-3 p-0"
        style={{ border: `2px solid ${bucketColor}` }}
      >
        {/* Fieldset legend — text sits on border line */}
        <legend className="ml-3 px-2">
          <button
            type="button"
            onClick={() => toggleBucketCollapse(bucketId)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold cursor-pointer select-none"
            style={{ color: bucketColor }}
          >
            {bucketName} ({items.length})
            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </legend>

        {/* Content */}
        {!isCollapsed && (
          <div className="pb-1">
            {groupByNote && itemsByBucketByNote ? (
              // Grouped by parent note
              (() => {
                const noteMap = itemsByBucketByNote.get(bucketId) || new Map<number, typeof filteredItems>();
                return Array.from(noteMap.entries()).map(([noteId, noteItems]: [number, typeof filteredItems]) => {
                  const parentNote = noteItems[0]?.parentNote || allNotes.find((n) => n.id === noteId);
                  const noteName = parentNote?.name || 'Note';
                  const isNoteExpanded = expandedNotes.has(noteId);
                  return (
                    <div key={noteId} className="border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                      <div
                        className="flex items-center gap-2.5 px-4 py-2 bg-gray-50 dark:bg-gray-800/50 cursor-pointer"
                        onClick={() => setExpandedNotes((prev) => { const next = new Set(prev); if (next.has(noteId)) next.delete(noteId); else next.add(noteId); return next; })}
                      >
                        {isNoteExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                        <FolderOpen className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{noteName}</span>
                        <Badge variant="default">{noteItems.length}</Badge>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/notes/${noteId}`); }}
                          className="ml-auto text-xs px-2.5 py-1 rounded border border-primary-300 text-primary-600 hover:bg-primary-50 dark:border-primary-700 dark:text-primary-400 font-medium"
                        >
                          View
                        </button>
                      </div>
                      {isNoteExpanded && (
                        <div className="pl-11">
                          {noteItems.map((item, idx) => renderItem(item, idx))}
                        </div>
                      )}
                    </div>
                  );
                });
              })()
            ) : (
              // Flat list with alternate colors
              items.map((item, idx) => renderItem(item, idx))
            )}
          </div>
        )}
      </fieldset>
    );
  };

  const filteredTagsForDrop = tagSearch
    ? tags.filter((t) => t.name.toLowerCase().includes(tagSearch.toLowerCase()))
    : tags;
  const filteredMembersForDrop = memberSearch
    ? teamMembers.filter((m) => m.name.toLowerCase().includes(memberSearch.toLowerCase()))
    : teamMembers;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Bucket View</h1>
        <div className="flex items-center gap-2">
          {/* Show/hide tags & assignees */}
          <button
            onClick={() => setShowMeta((v) => !v)}
            className={clsx(
              'inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border',
              showMeta
                ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 border-primary-300 dark:border-primary-700 font-medium'
                : 'text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
            )}
            title={showMeta ? 'Hide tags & assignees' : 'Show tags & assignees'}
          >
            {showMeta ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            Meta
          </button>
          {/* Flat / Grouped toggle */}
          <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden divide-x divide-gray-300 dark:divide-gray-600">
            <button
              onClick={() => setGroupByNote(false)}
              className={clsx(
                'inline-flex items-center gap-1 px-2.5 py-1.5 text-xs',
                !groupByNote
                  ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 font-medium'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              )}
            >
              <List className="w-3.5 h-3.5" /> Flat
            </button>
            <button
              onClick={() => setGroupByNote(true)}
              className={clsx(
                'inline-flex items-center gap-1 px-2.5 py-1.5 text-xs',
                groupByNote
                  ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 font-medium'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              )}
            >
              <FolderOpen className="w-3.5 h-3.5" /> Grouped
            </button>
          </div>
          {/* Copy Titles / Copy All */}
          <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden divide-x divide-gray-300 dark:divide-gray-600">
            <button
              onClick={handleCopyTitles}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              title="Copy titles"
            >
              <Copy className="w-3.5 h-3.5" /> Titles
            </button>
            <button
              onClick={handleCopyAll}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              title="Copy all content"
            >
              <Copy className="w-3.5 h-3.5" /> All
            </button>
          </div>
        </div>
      </div>

      {/* Bucket Legend — always visible */}
      <div className="flex flex-wrap gap-2">
        {sortedBuckets.map((bucket) => {
          const count = (itemsByBucket.get(bucket.id) || []).length;
          return (
            <div
              key={bucket.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white dark:bg-gray-800 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              style={{ borderLeft: `3px solid ${bucket.color}` }}
              onClick={() => toggleBucketFilter(bucket.id)}
              title={`Click to ${selectedBucketIds.includes(bucket.id) ? 'remove' : 'add'} filter`}
            >
              <span className="text-xs font-semibold" style={{ color: bucket.color }}>{bucket.name}</span>
              <span className="text-sm font-bold" style={{ color: bucket.color }}>{count}</span>
              {selectedBucketIds.includes(bucket.id) && (
                <span className="w-2 h-2 rounded-full bg-primary-500" />
              )}
            </div>
          );
        })}
        {(itemsByBucket.get(0) || []).length > 0 && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white dark:bg-gray-800 shadow-sm"
            style={{ borderLeft: '3px solid #9ca3af' }}
          >
            <span className="text-xs font-semibold text-gray-500">Unassigned</span>
            <span className="text-sm font-bold text-gray-500">{(itemsByBucket.get(0) || []).length}</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {/* Filter label */}
          <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 font-semibold">
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="ml-0.5 w-5 h-5 flex items-center justify-center rounded-full bg-primary-500 text-white text-[11px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </div>

          <div className="w-px h-6 bg-gray-200 dark:bg-gray-600" />

          {/* Type filter */}
          <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-0.5">
            {(['all', 'favorites', 'hot'] as TypeFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setTypeFilter(f)}
                className={clsx(
                  'px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 font-medium transition-colors',
                  typeFilter === f
                    ? 'bg-white dark:bg-gray-600 text-primary-700 dark:text-primary-300 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                )}
              >
                {f === 'favorites' && <Star className="w-3.5 h-3.5" />}
                {f === 'hot' && <Flame className="w-3.5 h-3.5" />}
                {f === 'all' ? 'All' : f === 'favorites' ? 'Favorites' : 'Hot'}
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-gray-200 dark:bg-gray-600" />

          {/* Bucket multi-select dropdown */}
          <div className="relative">
            <button
              onClick={() => { setBucketDropOpen(!bucketDropOpen); setTagDropOpen(false); setMemberDropOpen(false); }}
              className={clsx(
                'px-3 py-1.5 rounded-lg border inline-flex items-center gap-1.5 font-medium transition-colors',
                selectedBucketIds.length > 0
                  ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-300 dark:border-primary-600 text-primary-700 dark:text-primary-300'
                  : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300'
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              Buckets{selectedBucketIds.length > 0 && ` (${selectedBucketIds.length})`}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {bucketDropOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={selectedBucketIds.length === 0}
                      onChange={() => setSelectedBucketIds([])}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    All Buckets
                  </label>
                </div>
                {sortedBuckets.map((b) => (
                  <div
                    key={b.id}
                    className={clsx('px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2', selectedBucketIds.includes(b.id) && 'bg-primary-50 dark:bg-primary-900/20')}
                    onClick={() => { toggleBucketFilter(b.id); setBucketDropOpen(false); }}
                  >
                    <input type="checkbox" checked={selectedBucketIds.includes(b.id)} onChange={() => {}} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: b.color }} />
                    <span className="text-sm text-gray-900 dark:text-gray-100">{b.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tags multi-select dropdown */}
          <div className="relative">
            <button
              onClick={() => { setTagDropOpen(!tagDropOpen); setBucketDropOpen(false); setMemberDropOpen(false); }}
              className={clsx(
                'px-3 py-1.5 rounded-lg border inline-flex items-center gap-1.5 font-medium transition-colors',
                selectedTagIds.length > 0
                  ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-300 dark:border-primary-600 text-primary-700 dark:text-primary-300'
                  : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300'
              )}
            >
              <Tag className="w-3.5 h-3.5" />
              Tags{selectedTagIds.length > 0 && ` (${selectedTagIds.length})`}
              {selectedTagIds.length > 1 && <span className="text-[9px] font-bold text-primary-500 ml-0.5">{tagMatchMode}</span>}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {tagDropOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                <div className="p-2 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 space-y-2">
                  {selectedTagIds.length > 0 && (
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 p-0.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); setTagMatchMode('AND'); }}
                        className={clsx('flex-1 px-1.5 py-0.5 text-[9px] font-bold rounded transition-colors', tagMatchMode === 'AND' ? 'bg-primary-500 dark:bg-primary-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600')}
                      >AND</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setTagMatchMode('OR'); }}
                        className={clsx('flex-1 px-1.5 py-0.5 text-[9px] font-bold rounded transition-colors', tagMatchMode === 'OR' ? 'bg-primary-500 dark:bg-primary-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600')}
                      >OR</button>
                    </div>
                  )}
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      value={tagSearch}
                      onChange={(e) => setTagSearch(e.target.value)}
                      placeholder="Search tags..."
                      className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-gray-100"
                    />
                  </div>
                </div>
                {filteredTagsForDrop.map((t) => (
                  <div
                    key={t.id}
                    className={clsx('px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2', selectedTagIds.includes(t.id) && 'bg-primary-50 dark:bg-primary-900/20')}
                    onClick={() => { toggleTagFilter(t.id); setTagDropOpen(false); }}
                  >
                    <input type="checkbox" checked={selectedTagIds.includes(t.id)} onChange={() => {}} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    <span className="text-sm text-gray-900 dark:text-gray-100">{t.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Members multi-select dropdown */}
          <div className="relative">
            <button
              onClick={() => { setMemberDropOpen(!memberDropOpen); setBucketDropOpen(false); setTagDropOpen(false); }}
              className={clsx(
                'px-3 py-1.5 rounded-lg border inline-flex items-center gap-1.5 font-medium transition-colors',
                selectedMemberIds.length > 0
                  ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-300 dark:border-primary-600 text-primary-700 dark:text-primary-300'
                  : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300'
              )}
            >
              <Users className="w-3.5 h-3.5" />
              Assignee{selectedMemberIds.length > 0 && ` (${selectedMemberIds.length})`}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {memberDropOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                <div className="p-2 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Search members..."
                      className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-gray-100"
                    />
                  </div>
                </div>
                {filteredMembersForDrop.map((m) => (
                  <div
                    key={m.id}
                    className={clsx('px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2', selectedMemberIds.includes(m.id) && 'bg-primary-50 dark:bg-primary-900/20')}
                    onClick={() => { toggleMemberFilter(m.id); setMemberDropOpen(false); }}
                  >
                    <input type="checkbox" checked={selectedMemberIds.includes(m.id)} onChange={() => {}} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    <span className="text-sm text-gray-900 dark:text-gray-100">{m.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {activeFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="px-2.5 py-1.5 text-xs font-medium text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded-lg transition-colors"
            >
              Clear all
            </button>
          )}

          <span className="ml-auto text-xs text-gray-500 dark:text-gray-400 font-medium">{filteredItems.length} items</span>
        </div>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-gray-100 dark:border-gray-700">
            {selectedBucketIds.map((id) => {
              const b = buckets.find((x) => x.id === id);
              return b ? (
                <span key={`b-${id}`} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />
                  {b.name}
                  <button onClick={() => toggleBucketFilter(id)} className="ml-0.5 hover:text-danger-600"><X className="w-3 h-3" /></button>
                </span>
              ) : null;
            })}
            {selectedTagIds.map((id) => {
              const t = tags.find((x) => x.id === id);
              return t ? (
                <span key={`t-${id}`} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                  {t.name}
                  <button onClick={() => toggleTagFilter(id)} className="ml-0.5 hover:text-danger-600"><X className="w-3 h-3" /></button>
                </span>
              ) : null;
            })}
            {selectedMemberIds.map((id) => {
              const m = teamMembers.find((x) => x.id === id);
              return m ? (
                <span key={`m-${id}`} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                  {m.name}
                  <button onClick={() => toggleMemberFilter(id)} className="ml-0.5 hover:text-danger-600"><X className="w-3 h-3" /></button>
                </span>
              ) : null;
            })}
          </div>
        )}
      </div>

      {/* Bucket sections */}
      <div>
        {sortedBuckets.map((bucket) => {
          const items = itemsByBucket.get(bucket.id) || [];
          return renderBucketSection(bucket.id, bucket.name, bucket.color, items);
        })}
        {renderBucketSection(0, 'Unassigned', '#9ca3af', itemsByBucket.get(0) || [])}
      </div>

      {/* Inline edit modal (centered) — matches NoteDetailPage style */}
      {inlinePopup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={() => { setInlinePopup(null); setPopupSearch(''); }}>
          <div
            ref={inlinePopupRef}
            className="w-full max-w-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                {inlinePopup.type === 'tags' ? 'Edit Tags' : inlinePopup.type === 'assignees' ? 'Edit Assignees' : 'Change Bucket'}
              </h3>
              <button onClick={() => setInlinePopup(null)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="p-4">
              {/* Selected chips */}
              {inlinePopup.type === 'tags' && inlinePopup.tagIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {getTags(inlinePopup.tagIds).map((t) => (
                    <span key={t.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      {t.name}
                      <button onClick={() => handleInlineToggleTag(t.id)} className="hover:bg-black/10 rounded-full p-0.5"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              )}
              {inlinePopup.type === 'assignees' && inlinePopup.teamMemberIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {getTeamMembers(inlinePopup.teamMemberIds).map((m) => (
                    <span key={m.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                      {m.name}
                      <button onClick={() => handleInlineToggleMember(m.id)} className="hover:bg-black/10 rounded-full p-0.5"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              )}
              {/* Search input */}
              {inlinePopup.type !== 'bucket' && (
                <input
                  type="text"
                  value={popupSearch}
                  onChange={(e) => setPopupSearch(e.target.value)}
                  placeholder={inlinePopup.type === 'tags' ? 'Search or create tags...' : 'Search members...'}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none mb-3"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && inlinePopup.type === 'tags' && popupSearch.trim() && !tags.some((t) => t.name.toLowerCase() === popupSearch.trim().toLowerCase())) {
                      e.preventDefault();
                      handleInlineCreateTag();
                    }
                  }}
                />
              )}
              {/* List */}
              <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                {inlinePopup.type === 'tags' && (() => {
                  const filteredTags = popupSearch ? tags.filter((t) => t.name.toLowerCase().includes(popupSearch.toLowerCase())) : tags;
                  const canCreate = popupSearch.trim() && !tags.some((t) => t.name.toLowerCase() === popupSearch.trim().toLowerCase());
                  return (
                    <>
                      {canCreate && (
                        <div
                          className="px-4 py-2.5 cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/20 flex items-center gap-2 text-primary-600 dark:text-primary-400 text-sm border-b border-gray-100 dark:border-gray-700"
                          onClick={handleInlineCreateTag}
                        >
                          <Plus className="w-4 h-4" />
                          <span className="font-medium">Create "{popupSearch.trim()}"</span>
                        </div>
                      )}
                      {filteredTags.map((t) => (
                        <div
                          key={t.id}
                          className={clsx('px-4 py-2.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0', inlinePopup.tagIds.includes(t.id) && 'bg-primary-50 dark:bg-primary-900/20')}
                          onClick={() => handleInlineToggleTag(t.id)}
                        >
                          <input type="checkbox" checked={inlinePopup.tagIds.includes(t.id)} onChange={() => {}} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                          <span className="text-sm text-gray-900 dark:text-gray-100">{t.name}</span>
                        </div>
                      ))}
                    </>
                  );
                })()}
                {inlinePopup.type === 'assignees' && (
                  (popupSearch ? teamMembers.filter((m) => m.name.toLowerCase().includes(popupSearch.toLowerCase())) : teamMembers).map((m) => (
                    <div
                      key={m.id}
                      className={clsx('px-4 py-2.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0', inlinePopup.teamMemberIds.includes(m.id) && 'bg-primary-50 dark:bg-primary-900/20')}
                      onClick={() => handleInlineToggleMember(m.id)}
                    >
                      <input type="checkbox" checked={inlinePopup.teamMemberIds.includes(m.id)} onChange={() => {}} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                      <span className="text-sm text-gray-900 dark:text-gray-100">{m.name}</span>
                    </div>
                  ))
                )}
                {inlinePopup.type === 'bucket' && (
                  <>
                    <div
                      className={clsx('px-4 py-2.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 border-b border-gray-50 dark:border-gray-700/50', !inlinePopup.bucketId && 'bg-primary-50 dark:bg-primary-900/20')}
                      onClick={() => handleInlineSetBucket(null)}
                    >
                      <span className="w-3 h-3 rounded bg-gray-300" />
                      <span className="text-sm text-gray-900 dark:text-gray-100">None</span>
                    </div>
                    {sortedBuckets.map((b) => (
                      <div
                        key={b.id}
                        className={clsx('px-4 py-2.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0', inlinePopup.bucketId === b.id && 'bg-primary-50 dark:bg-primary-900/20')}
                        onClick={() => handleInlineSetBucket(b.id)}
                      >
                        <span className="w-3 h-3 rounded flex-shrink-0" style={{ backgroundColor: b.color }} />
                        <span className="text-sm text-gray-900 dark:text-gray-100">{b.name}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <QuickAddNoteModal
        isOpen={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['notes'] });
        }}
      />
    </div>
  );
}
