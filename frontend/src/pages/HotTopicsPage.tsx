import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notesApi, subNotesApi } from '@/api/notes';
import { tagsApi } from '@/api/tags';
import { useReferenceData } from '@/hooks/useReferenceData';
import { useKeyboard } from '@/hooks/useKeyboard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { QuickAddNoteModal } from '@/components/notes/QuickAddNoteModal';
import { RichTextEditor } from '@/components/shared/RichTextEditor';
import {
  Flame,
  ChevronDown,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  Save,
  Copy,
  Tag,
  Users,
  Layers,
  Eye,
  EyeOff,
  Edit,
  FolderOpen,
  List,
  X,
  FileText,
  GitBranch,
  Plus,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import type { HotTopicItem } from '@/types';
import { useDailyDismiss } from '@/hooks/useDailyDismiss';

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

export function HotTopicsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { buckets, getTags, getTeamMembers, tags, teamMembers } = useReferenceData();

  const { dismiss, undismiss, isDismissed, dismissedCount } = useDailyDismiss();
  const [showDismissed, setShowDismissed] = useState(false);

  const [groupByNote, setGroupByNote] = useState(true);
  const [showMeta, setShowMeta] = useState(false);
  useKeyboard('m', () => setShowMeta((v) => !v), [], { modifier: 'alt' });
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [collapsedBuckets, setCollapsedBuckets] = useState<Set<string>>(new Set());
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());
  const [expandedDescs, setExpandedDescs] = useState<Set<string>>(new Set());
  const [editingDescriptions, setEditingDescriptions] = useState<Record<string, string>>({});

  // Inline popup for tag/assignee editing
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

  // Esc collapses expanded description; confirm if unsaved changes exist
  useEffect(() => {
    if (expandedDescs.size === 0) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Find any expanded desc that has unsaved changes
      const unsavedKey = Array.from(expandedDescs).find((k) => editingDescriptions[k] !== undefined);
      if (unsavedKey) {
        if (!confirm('You have unsaved changes. Discard them?')) return;
        setEditingDescriptions((prev) => { const next = { ...prev }; delete next[unsavedKey]; return next; });
        setExpandedDescs((prev) => { const next = new Set(prev); next.delete(unsavedKey); return next; });
      } else {
        // Collapse all expanded (or just the last one — collapse all is fine since Esc is global)
        setExpandedDescs(new Set());
      }
      e.stopPropagation();
    };
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [expandedDescs, editingDescriptions]);

  const { data: hotTopics = [], isLoading } = useQuery({
    queryKey: ['hot-topics'],
    queryFn: notesApi.getHotTopics,
  });

  const toggleNoteHotTopic = useMutation({
    mutationFn: notesApi.toggleHotTopic,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hot-topics'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  const toggleSubNoteHotTopic = useMutation({
    mutationFn: subNotesApi.toggleHotTopic,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hot-topics'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ id, tagNames, teamMemberIds, bucketId, details }: { id: number; tagNames?: string[]; teamMemberIds?: number[]; bucketId?: number | null; details?: string }) =>
      notesApi.update(id, { tagNames, teamMemberIds, bucketId: bucketId === null ? undefined : bucketId, details }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hot-topics'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  const updateSubNoteMutation = useMutation({
    mutationFn: ({ id, tagNames, teamMemberIds, bucketId, description }: { id: number; tagNames?: string[]; teamMemberIds?: number[]; bucketId?: number | null; description?: string }) =>
      subNotesApi.update(id, { tagNames, teamMemberIds, bucketId: bucketId === null ? undefined : bucketId, description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hot-topics'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  const addSubNoteMutation = useMutation({
    mutationFn: ({ noteId, header, bucketId }: { noteId: number; header: string; bucketId?: number }) =>
      subNotesApi.create(noteId, { header, hotTopic: true, bucketId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hot-topics'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('SubNote added');
    },
    onError: () => toast.error('Failed to add subnote'),
  });

  const deleteSubNoteMutation = useMutation({
    mutationFn: (subNoteId: number) => subNotesApi.delete(subNoteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hot-topics'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Deleted');
    },
    onError: () => toast.error('Failed to delete'),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: number) => notesApi.delete(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hot-topics'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Note deleted');
    },
    onError: () => toast.error('Failed to delete'),
  });

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
      queryClient.invalidateQueries({ queryKey: ['hot-topics'] });
    }
    setEditingTitle(null);
  };
  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleTitleSave();
    if (e.key === 'Escape') setEditingTitle(null);
  };

  const sortedBuckets = useMemo(() => [...buckets].sort((a, b) => a.priority - b.priority), [buckets]);

  const visibleHotTopics = useMemo(
    () => showDismissed ? hotTopics : hotTopics.filter((item) => !isDismissed(`${item.type}_${item.id}`)),
    [hotTopics, isDismissed, showDismissed]
  );

  // Group hot topics by bucket
  const itemsByBucket = useMemo(() => {
    const map = new Map<number, HotTopicItem[]>();
    sortedBuckets.forEach((b) => map.set(b.id, []));
    map.set(0, []);
    visibleHotTopics.forEach((item) => {
      const key = item.bucketId || 0;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    });
    return map;
  }, [visibleHotTopics, sortedBuckets]);

  // Group by bucket then by note (for grouped mode)
  const itemsByBucketByNote = useMemo(() => {
    if (!groupByNote) return null;
    const result = new Map<number, Map<string, { noteName: string; noteId: number; items: HotTopicItem[] }>>();
    sortedBuckets.forEach((b) => result.set(b.id, new Map()));
    result.set(0, new Map());

    visibleHotTopics.forEach((item) => {
      const bucketKey = item.bucketId || 0;
      if (!result.has(bucketKey)) result.set(bucketKey, new Map());
      const noteMap = result.get(bucketKey)!;
      const noteKey = item.type === 'note' ? `note_${item.id}` : `note_${item.noteId}`;
      const noteName = item.type === 'note' ? item.title : (item.noteName || 'Unknown');
      const noteId = item.type === 'note' ? item.id : (item.noteId || 0);
      if (!noteMap.has(noteKey)) noteMap.set(noteKey, { noteName, noteId, items: [] });
      noteMap.get(noteKey)!.items.push(item);
    });
    return result;
  }, [visibleHotTopics, sortedBuckets, groupByNote]);

  // Auto-expand all notes when grouped mode is toggled on
  const prevGroupByNote = useRef(groupByNote);
  useEffect(() => {
    if (groupByNote && !prevGroupByNote.current && itemsByBucketByNote) {
      const allNoteIds = new Set<number>();
      itemsByBucketByNote.forEach((noteMap) => {
        noteMap.forEach(({ noteId }) => allNoteIds.add(noteId));
      });
      setExpandedNotes(allNoteIds);
    }
    prevGroupByNote.current = groupByNote;
  }, [groupByNote, itemsByBucketByNote]);

  const expandAllNotes = () => {
    if (!itemsByBucketByNote) return;
    const allNoteIds = new Set<number>();
    itemsByBucketByNote.forEach((noteMap) => {
      noteMap.forEach(({ noteId }) => allNoteIds.add(noteId));
    });
    setExpandedNotes(allNoteIds);
  };

  const collapseAllNotes = () => {
    setExpandedNotes(new Set());
  };

  useKeyboard('ArrowDown', expandAllNotes, [itemsByBucketByNote], { modifier: 'alt' });
  useKeyboard('ArrowUp', collapseAllNotes, [], { modifier: 'alt' });

  const toggleBucketCollapse = (key: string) => {
    setCollapsedBuckets((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const buildCopyText = (includeContent: boolean) => {
    const lines: string[] = [];

    if (groupByNote && itemsByBucketByNote) {
      sortedBuckets.forEach((bucket) => {
        const noteMap = itemsByBucketByNote.get(bucket.id);
        if (!noteMap || noteMap.size === 0) return;
        lines.push(bucket.name);
        noteMap.forEach(({ noteName, items }) => {
          lines.push(`\t${noteName}`);
          items.forEach((item) => {
            lines.push(`\t\t${item.title}`);
            if (includeContent && item.details) {
              const text = htmlToPlainText(item.details);
              if (text) {
                text.split('\n').forEach(line => {
                  lines.push(`\t\t\t${line}`);
                });
              }
            }
          });
        });
      });
      const unassignedMap = itemsByBucketByNote.get(0);
      if (unassignedMap && unassignedMap.size > 0) {
        lines.push('Unassigned');
        unassignedMap.forEach(({ noteName, items }) => {
          lines.push(`\t${noteName}`);
          items.forEach((item) => {
            lines.push(`\t\t${item.title}`);
            if (includeContent && item.details) {
              const text = htmlToPlainText(item.details);
              if (text) lines.push(`\t\t\t${text}`);
            }
          });
        });
      }
    } else {
      sortedBuckets.forEach((bucket) => {
        const bucketItems = itemsByBucket.get(bucket.id) || [];
        if (bucketItems.length === 0) return;
        lines.push(bucket.name);
        bucketItems.forEach((item) => {
          lines.push(`\t${item.title}`);
          if (includeContent && item.details) {
            const text = htmlToPlainText(item.details);
            if (text) {
              text.split('\n').forEach(line => {
                lines.push(`\t\t${line}`);
              });
            }
          }
        });
      });
      const unassigned = itemsByBucket.get(0) || [];
      if (unassigned.length > 0) {
        lines.push('Unassigned');
        unassigned.forEach((item) => {
          lines.push(`\t${item.title}`);
          if (includeContent && item.details) {
            const text = htmlToPlainText(item.details);
            if (text) lines.push(`\t\t${text}`);
          }
        });
      }
    }

    return lines.join('\n');
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-96"><LoadingSpinner size="lg" /></div>;
  }

  const renderItem = (item: HotTopicItem, index: number) => {
    const itemTags = getTags(item.tagIds || []);
    const ownTagIdSet = new Set(item.tagIds || []);
    const inheritedTags = item.type === 'subnote'
      ? getTags((item.parentTagIds || []).filter((id) => !ownTagIdSet.has(id)))
      : [];
    const itemMembers = getTeamMembers(item.teamMemberIds || []);
    const descKey = `${item.type}-${item.id}`;
    const isDescExpanded = expandedDescs.has(descKey);
    const hasDescription = !!item.details;

    return (
      <div
        key={`${item.type}-${item.id}`}
        className={clsx(
          'border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-blue-50/50 dark:hover:bg-gray-800/50 transition-colors',
          index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-blue-100/70 dark:bg-gray-700/60'
        )}
      >
        <div
          className="flex items-center gap-2 px-3 py-2 cursor-pointer"
          onClick={() => setExpandedDescs((prev) => { const next = new Set(prev); if (next.has(descKey)) next.delete(descKey); else next.add(descKey); return next; })}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {item.type === 'subnote'
                ? <GitBranch className="w-3 h-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                : <FileText className="w-3 h-3 text-gray-500 dark:text-gray-400 flex-shrink-0" />
              }
              {editingTitle?.type === item.type && editingTitle.id === item.id ? (
                <input
                  type="text"
                  value={editingTitle.value}
                  onChange={(e) => setEditingTitle({ ...editingTitle, value: e.target.value })}
                  onBlur={handleTitleSave}
                  onKeyDown={handleTitleKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 text-sm font-medium bg-white dark:bg-gray-800 border border-primary-400 rounded px-2 py-0.5 focus:ring-1 focus:ring-primary-500 outline-none"
                  autoFocus
                />
              ) : (
                <span
                  className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words min-w-0"
                  onDoubleClick={(e) => handleTitleDoubleClick(e, item.type, item.id, item.title)}
                  title="Double-click to edit"
                >
                  {item.title}
                </span>
              )}
              {item.type === 'subnote' && item.noteName && (
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/notes/${item.noteId}`); }}
                  className="text-xs text-primary-700 hover:text-primary-900 dark:text-primary-300 dark:hover:text-primary-100 hover:underline flex-shrink-0 font-medium"
                  title={`Go to note: ${item.noteName}`}
                >
                  ↗ {item.noteName}
                </button>
              )}
            </div>
            {showMeta && (itemTags.length > 0 || inheritedTags.length > 0 || itemMembers.length > 0) && (
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {itemTags.map((t) => (
                  <span key={t.id} className="px-1.5 py-0.5 text-[10px] rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium border border-blue-200 dark:border-blue-800">
                    {t.name}
                  </span>
                ))}
                {inheritedTags.map((t) => (
                  <span key={`inh-${t.id}`} className="px-1.5 py-0.5 text-[10px] rounded-full bg-gray-100 dark:bg-gray-700/50 text-gray-400 dark:text-gray-500 font-normal border border-dashed border-gray-300 dark:border-gray-600 italic" title="Inherited from parent note">
                    {t.name}
                  </span>
                ))}
                {itemMembers.map((m) => (
                  <span key={m.id} className="px-1.5 py-0.5 text-[10px] rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium border border-purple-200 dark:border-purple-800">
                    {m.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => openInlinePopup('tags', item.type, item.id, item.tagIds || [], item.teamMemberIds || [], item.bucketId)}
              className={clsx('p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700', (item.tagIds?.length || 0) > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400')}
              title="Edit tags"
            >
              <Tag className="w-3.5 h-3.5 stroke-[2]" />
            </button>
            <button
              onClick={() => openInlinePopup('assignees', item.type, item.id, item.tagIds || [], item.teamMemberIds || [], item.bucketId)}
              className={clsx('p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700', (item.teamMemberIds?.length || 0) > 0 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-600 dark:text-gray-400')}
              title="Edit assignees"
            >
              <Users className="w-3.5 h-3.5 stroke-[2]" />
            </button>
            <button
              onClick={() => openInlinePopup('bucket', item.type, item.id, item.tagIds || [], item.teamMemberIds || [], item.bucketId)}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              title="Change bucket"
            >
              <Layers className="w-3.5 h-3.5 stroke-[2]" />
            </button>
            <button
              onClick={() => { if (item.type === 'note') toggleNoteHotTopic.mutate(item.id); else toggleSubNoteHotTopic.mutate(item.id); }}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Remove hot topic"
            >
              <Flame className="w-3.5 h-3.5 stroke-[2.5] fill-danger-400 text-danger-500" />
            </button>
            {(() => {
              const dimKey = `${item.type}_${item.id}`;
              const dismissed = isDismissed(dimKey);
              return (
                <button
                  onClick={() => dismissed ? undismiss(dimKey) : dismiss(dimKey)}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  title={dismissed ? 'Unmark — show again today' : 'Done for today'}
                >
                  <CheckCircle2 className={`w-3.5 h-3.5 stroke-[2] ${dismissed ? 'fill-success-500 text-white' : 'text-gray-600 dark:text-gray-400 hover:text-success-500'}`} />
                </button>
              );
            })()}
            <button
              onClick={() => setExpandedDescs((prev) => { const next = new Set(prev); if (next.has(descKey)) next.delete(descKey); else next.add(descKey); return next; })}
              className={clsx('p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700', hasDescription ? 'text-primary-600 dark:text-primary-400' : 'text-gray-600 dark:text-gray-400')}
              title="Toggle description"
            >
              <Eye className="w-3.5 h-3.5 stroke-[2]" />
            </button>
            <button
              onClick={() => navigate(item.type === 'note' ? `/notes/${item.id}/edit` : `/notes/${item.noteId}/edit?subNoteId=${item.id}`)}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Edit"
            >
              <Edit className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400 stroke-[2]" />
            </button>
            <button
              onClick={() => {
                if (confirm(`Delete this ${item.type === 'note' ? 'note' : 'subnote'}?`)) {
                  if (item.type === 'note') deleteNoteMutation.mutate(item.id);
                  else deleteSubNoteMutation.mutate(item.id);
                }
              }}
              className="p-1 rounded hover:bg-danger-100 dark:hover:bg-danger-900/30 text-gray-400 hover:text-danger-600"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
            </button>
          </div>
        </div>

        {isDescExpanded && (
          <div className="px-3 pb-2 pl-6" onClick={(e) => e.stopPropagation()}>
            <RichTextEditor
              content={editingDescriptions[descKey] ?? (item.details || '')}
              onChange={(val) => handleDescChange(descKey, val)}
              compact
            />
            {editingDescriptions[descKey] !== undefined && (
              <div className="flex justify-end mt-1">
                <button
                  onClick={() => saveDescription(item.type, item.id, descKey)}
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

  const renderBucketSection = (bucketId: number, bucketName: string, bucketColor: string, items: HotTopicItem[]) => {
    if (items.length === 0) return null;
    const key = `bucket-${bucketId}`;
    const isCollapsed = collapsedBuckets.has(key);

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
            onClick={() => toggleBucketCollapse(key)}
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
              (() => {
                const noteMap = itemsByBucketByNote.get(bucketId) || new Map<string, { noteName: string; noteId: number; items: HotTopicItem[] }>();
                return Array.from(noteMap.entries()).map(([noteKey, { noteName, noteId, items: noteItems }]) => {
                  const isNoteExpanded = expandedNotes.has(noteId);
                  return (
                    <div key={noteKey} className="border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                      <div
                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800/50 cursor-pointer"
                        onClick={() => setExpandedNotes((prev) => { const next = new Set(prev); if (next.has(noteId)) next.delete(noteId); else next.add(noteId); return next; })}
                      >
                        {isNoteExpanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                        <FolderOpen className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{noteName}</span>
                        <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">({noteItems.length})</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const todoBucket = buckets.find((b) => b.name.toLowerCase() === 'todo') || buckets.reduce((a, b) => a.priority > b.priority ? a : b, buckets[0]);
                            addSubNoteMutation.mutate({ noteId, header: 'New SubNote', bucketId: todoBucket?.id });
                          }}
                          className="ml-auto p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                          title="Add priority subnote"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/notes/${noteId}`); }}
                          className="text-xs px-3 py-1 rounded-md font-medium bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600"
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
              items.map((item, idx) => renderItem(item, idx))
            )}
          </div>
        )}
      </fieldset>
    );
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-danger-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Priority Items <span className="text-gray-400 font-normal text-base">({visibleHotTopics.length}{dismissedCount > 0 && !showDismissed ? ` + ${dismissedCount} done` : ''})</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
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
          {/* Done / Meta / Expand / Collapse */}
          <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden divide-x divide-gray-300 dark:divide-gray-600">
            <button
              onClick={() => setShowDismissed((v) => !v)}
              className={clsx('inline-flex items-center gap-1 px-2.5 py-1.5 text-xs', showDismissed ? 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800')}
              title={showDismissed ? 'Hide items done today' : dismissedCount > 0 ? `Show ${dismissedCount} done today` : 'No items done today'}
            >
              <CheckCircle2 className={clsx('w-3.5 h-3.5 stroke-[2]', showDismissed ? 'fill-success-500 text-white' : 'fill-none')} />
              {dismissedCount > 0 && <span className="text-[10px] font-bold">{dismissedCount}</span>}
            </button>
            <button
              onClick={() => setShowMeta((v) => !v)}
              className={clsx('inline-flex items-center gap-1 px-2.5 py-1.5 text-xs', showMeta ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800')}
              title={showMeta ? 'Hide tags & assignees' : 'Show tags & assignees'}
            >
              {showMeta ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            {groupByNote && (
              <>
                <button onClick={expandAllNotes} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800" title="Expand all notes">
                  <ChevronsDown className="w-3.5 h-3.5" />
                </button>
                <button onClick={collapseAllNotes} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800" title="Collapse all notes">
                  <ChevronsUp className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
          {/* Copy Titles / Copy All */}
          <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden divide-x divide-gray-300 dark:divide-gray-600">
            <button
              onClick={() => { navigator.clipboard.writeText(buildCopyText(false)); toast.success('Titles copied'); }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              title="Copy titles"
            >
              <Copy className="w-3.5 h-3.5" /> Titles
            </button>
            <button
              onClick={() => { navigator.clipboard.writeText(buildCopyText(true)); toast.success('All copied'); }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              title="Copy all"
            >
              <Copy className="w-3.5 h-3.5" /> All
            </button>
          </div>
        </div>
      </div>

      {/* Bucket Legend */}
      <div className="flex flex-wrap gap-2">
        {sortedBuckets.map((bucket) => {
          const count = (itemsByBucket.get(bucket.id) || []).length;
          if (count === 0) return null;
          return (
            <div
              key={bucket.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white dark:bg-gray-800 shadow-sm"
              style={{ borderLeft: `3px solid ${bucket.color}` }}
            >
              <span className="text-xs font-semibold" style={{ color: bucket.color }}>{bucket.name}</span>
              <span className="text-sm font-bold" style={{ color: bucket.color }}>{count}</span>
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

      {/* Content */}
      {hotTopics.length === 0 ? (
        <EmptyState
          icon={Flame}
          title="No hot topics"
          description="Mark notes or subnotes as hot topics to track important items"
        />
      ) : (
        <div>
          {sortedBuckets.map((bucket) => {
            const items = itemsByBucket.get(bucket.id) || [];
            return renderBucketSection(bucket.id, bucket.name, bucket.color, items);
          })}
          {renderBucketSection(0, 'Unassigned', '#9ca3af', itemsByBucket.get(0) || [])}
        </div>
      )}

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
