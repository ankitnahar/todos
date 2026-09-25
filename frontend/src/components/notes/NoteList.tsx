import { useState, useMemo, useRef, useEffect } from 'react';
import { sanitizeHtml } from '@/utils/sanitize';
import { Note } from '@/types';
import { Star, Flame, Trash2, Tag, Users, Edit, Copy, ClipboardList, ChevronDown, ChevronRight, ChevronsDown, ChevronsUp, MoreVertical, Layers, GitBranch } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useReferenceData } from '@/hooks/useReferenceData';
import { useKeyboard } from '@/hooks/useKeyboard';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notesApi, subNotesApi } from '@/api/notes';
import { tagsApi } from '@/api/tags';
import { teamMembersApi } from '@/api/teamMembers';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { RichTextEditor } from '@/components/shared/RichTextEditor';

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
  text = text.replace(/<\/ul>/gi, '\n');
  text = text.replace(/<\/ol>/gi, '\n');

  // Replace <li> opening tags with bullet point
  text = text.replace(/<li[^>]*>/gi, '• ');
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

// Normalize description HTML to ensure line breaks display properly
function normalizeDescriptionHTML(html: string): string {
  if (!html) return '';
  const normalized = html.replace(/\n/g, '<br>');

  // Debug logging for "General" subnotes
  if (html.includes('how are you') || html.includes('I am fine')) {
    console.log('[NoteList] Normalizing description:');
    console.log('  Original:', html);
    console.log('  Normalized:', normalized);
    console.log('  Had newlines:', /\n/.test(html));
    console.log('  Had br tags:', /<br/.test(html));
  }

  return normalized;
}

interface NoteListProps {
  notes: Note[];
  searchTerm?: string;
  filterTagIds?: number[];
  filterTagMatchMode?: 'AND' | 'OR';
  onToggleFavorite?: (id: number) => void;
  onToggleHotTopic?: (id: number) => void;
  onDelete?: (id: number) => void;
}

type InlinePopup = {
  type: 'tags' | 'assignees' | 'bucket';
  itemType: 'note' | 'subnote';
  itemId: number;
  noteId: number;
  currentTagIds: number[];
  currentTeamMemberIds: number[];
  currentBucketId?: number;
} | null;

type SearchResultItem = {
  resultType: 'note' | 'subnote';
  id: number;
  title: string;
  description?: string;
  bucketId?: number;
  tagIds: number[];
  parentTagIds?: number[];
  teamMemberIds: number[];
  favorite: boolean;
  hotTopic: boolean;
  noteId: number;
  noteName?: string;
};

export function NoteList({ notes, searchTerm, filterTagIds, filterTagMatchMode, onToggleFavorite, onToggleHotTopic, onDelete }: NoteListProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { buckets, tags, teamMembers, getTags, getTeamMembers } = useReferenceData();
  const [popup, setPopup] = useState<InlinePopup>(null);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [popupSearch, setPopupSearch] = useState('');
  const popupRef = useRef<HTMLDivElement>(null);
  const [editingTitle, setEditingTitle] = useState<{ type: 'note' | 'subnote'; id: number; value: string } | null>(null);
  const [expandedDescs, setExpandedDescs] = useState<Set<string>>(new Set());
  const [showMetadata, setShowMetadata] = useState(false);
  useKeyboard('m', () => setShowMetadata((v) => !v), [], { modifier: 'alt' });
  const [subnoteEdits, setSubnoteEdits] = useState<Map<number, string>>(new Map());

  const handleDescriptionClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'A') {
      const href = target.getAttribute('href');
      if (href) {
        e.stopPropagation();
        if (href.startsWith('http://') || href.startsWith('https://')) {
          window.open(href, '_blank');
        } else if (href.startsWith('/')) {
          navigate(href);
        }
        e.preventDefault();
      }
    }
  };

  // ESC collapses any open subnote editor, with confirm if content changed
  useEffect(() => {
    if (subnoteEdits.size === 0) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      const hasChanges = Array.from(subnoteEdits.entries()).some(([id, content]) => {
        for (const note of notes) {
          const sn = note.subNotes?.find((s) => s.id === id);
          if (sn) return content !== (sn.description || '');
        }
        return false;
      });
      if (hasChanges && !confirm('Discard unsaved changes?')) return;
      subnoteEdits.forEach((_, id) => {
        setExpandedDescs((prev) => { const next = new Set(prev); next.delete(`subnote-${id}`); return next; });
      });
      setSubnoteEdits(new Map());
    };
    document.addEventListener('keydown', handleEscape, true);
    return () => document.removeEventListener('keydown', handleEscape, true);
  }, [subnoteEdits, notes]);

  const updateNoteMutation = useMutation({
    mutationFn: ({ id, tagNames, teamMemberIds, bucketId }: { id: number; tagNames?: string[]; teamMemberIds?: number[]; bucketId?: number | null }) =>
      notesApi.update(id, { tagNames, teamMemberIds, bucketId: bucketId === null ? undefined : bucketId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Updated', { duration: 1500 });
    },
    onError: () => toast.error('Failed to update'),
  });

  const updateSubNoteMutation = useMutation({
    mutationFn: ({ id, tagNames, teamMemberIds, bucketId }: { id: number; tagNames?: string[]; teamMemberIds?: number[]; bucketId?: number | null }) =>
      subNotesApi.update(id, { tagNames, teamMemberIds, bucketId: bucketId === null ? undefined : bucketId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Updated', { duration: 1500 });
    },
    onError: () => toast.error('Failed to update'),
  });

  const toggleSubNoteHotTopicMutation = useMutation({
    mutationFn: subNotesApi.toggleHotTopic,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  const updateSubNoteDescMutation = useMutation({
    mutationFn: ({ id, description }: { id: number; description: string }) =>
      subNotesApi.update(id, { description }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Description saved');
      setSubnoteEdits((prev) => { const next = new Map(prev); next.delete(id); return next; });
      setExpandedDescs((prev) => { const next = new Set(prev); next.delete(`subnote-${id}`); return next; });
    },
    onError: () => toast.error('Failed to save description'),
  });

  const duplicateNoteMutation = useMutation({
    mutationFn: notesApi.duplicate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Note duplicated');
    },
    onError: () => toast.error('Failed to duplicate note'),
  });


  const [actionMenu, setActionMenu] = useState<{ type: 'note' | 'subnote'; id: number; noteId: number; title: string; description?: string } | null>(null);
  const [actionMenuPos, setActionMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const actionMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setPopup(null);
        setPopupSearch('');
      }
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setActionMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openPopup = (e: React.MouseEvent, type: 'tags' | 'assignees' | 'bucket', itemType: 'note' | 'subnote', itemId: number, noteId: number, currentTagIds: number[], currentTeamMemberIds: number[], currentBucketId?: number) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPopupPos({ top: rect.bottom + 4, left: Math.min(rect.left, window.innerWidth - 240) });
    setPopup({ type, itemType, itemId, noteId, currentTagIds, currentTeamMemberIds, currentBucketId });
    setPopupSearch('');
  };

  const handleTogglePopupTag = (tagId: number) => {
    if (!popup) return;
    const current = popup.currentTagIds;
    const updated = current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId];
    const tagNames = getTags(updated).map((t) => t.name);
    if (popup.itemType === 'note') updateNoteMutation.mutate({ id: popup.itemId, tagNames });
    else updateSubNoteMutation.mutate({ id: popup.itemId, tagNames });
    setPopup({ ...popup, currentTagIds: updated });
  };

  const handleTogglePopupMember = (memberId: number) => {
    if (!popup) return;
    const current = popup.currentTeamMemberIds;
    const updated = current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId];
    if (popup.itemType === 'note') updateNoteMutation.mutate({ id: popup.itemId, teamMemberIds: updated });
    else updateSubNoteMutation.mutate({ id: popup.itemId, teamMemberIds: updated });
    setPopup({ ...popup, currentTeamMemberIds: updated });
  };

  const handleSetBucket = (bucketId: number | null) => {
    if (!popup) return;
    if (popup.itemType === 'note') updateNoteMutation.mutate({ id: popup.itemId, bucketId });
    else updateSubNoteMutation.mutate({ id: popup.itemId, bucketId });
    setPopup({ ...popup, currentBucketId: bucketId ?? undefined });
  };

  const handleCreateTag = async (name: string) => {
    try {
      const newTag = await tagsApi.create({ name });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      if (popup) handleTogglePopupTag(newTag.id);
      setPopupSearch('');
    } catch { toast.error('Failed to create tag'); }
  };

  const handleCreateMember = async (name: string) => {
    try {
      const newMember = await teamMembersApi.create({ name });
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      if (popup) handleTogglePopupMember(newMember.id);
      setPopupSearch('');
    } catch { toast.error('Failed to add team member'); }
  };

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

  const toggleDesc = (key: string) => {
    setExpandedDescs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const sortedNotes = useMemo(() => {
    return [...notes].sort((a, b) => {
      if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [notes]);

  // Helper: check if a set of tagIds matches filter criteria
  const matchesTagFilter = (itemTagIds: number[], parentTagIds?: number[]): boolean => {
    if (!filterTagIds || filterTagIds.length === 0) return false;
    const combined = parentTagIds ? [...new Set([...itemTagIds, ...parentTagIds])] : itemTagIds;
    if (filterTagMatchMode === 'OR') {
      return filterTagIds.some((ftId) => combined.includes(ftId));
    }
    // Default is AND
    return filterTagIds.every((ftId) => combined.includes(ftId));
  };

  // Build flat search results when search or tag filter is active
  const searchResults = useMemo((): SearchResultItem[] => {
    const hasTextSearch = searchTerm && searchTerm.trim().length > 0;
    const hasTagFilter = filterTagIds && filterTagIds.length > 0;
    if (!hasTextSearch && !hasTagFilter) return [];

    const results: SearchResultItem[] = [];
    const seenSubNoteIds = new Set<number>();
    const term = searchTerm ? searchTerm.toLowerCase() : '';

    for (const note of sortedNotes) {
      const noteTagIds = note.tagIds || [];
      let noteMatchesText = false;
      let noteMatchesTags = false;

      if (hasTextSearch) {
        noteMatchesText = note.name.toLowerCase().includes(term) ||
          (!!note.details && note.details.toLowerCase().includes(term));
      }
      if (hasTagFilter) {
        noteMatchesTags = matchesTagFilter(noteTagIds);
      }

      // Determine if parent note itself should appear
      const noteShown = hasTextSearch
        ? noteMatchesText
        : noteMatchesTags;

      if (noteShown) {
        results.push({
          resultType: 'note',
          id: note.id,
          title: note.name,
          description: note.details,
          bucketId: note.bucketId,
          tagIds: noteTagIds,
          teamMemberIds: note.teamMemberIds || [],
          favorite: note.favorite,
          hotTopic: note.hotTopic,
          noteId: note.id,
        });
      }

      // Check each subnote individually
      const subNotes = note.subNotes || [];
      for (const sn of subNotes) {
        let snMatches = false;

        if (hasTextSearch) {
          snMatches = sn.header.toLowerCase().includes(term) ||
            (!!sn.description && sn.description.toLowerCase().includes(term));
        } else if (hasTagFilter) {
          // Subnote matches if it directly has the tag OR inherits it from the parent note
          snMatches = matchesTagFilter(sn.tagIds || [], noteTagIds);
        }

        if (snMatches && !seenSubNoteIds.has(sn.id)) {
          seenSubNoteIds.add(sn.id);
          results.push({
            resultType: 'subnote',
            id: sn.id,
            title: sn.header,
            description: sn.description,
            bucketId: sn.bucketId,
            tagIds: sn.tagIds || [],
            parentTagIds: noteTagIds,
            teamMemberIds: sn.teamMemberIds || [],
            favorite: false,
            hotTopic: sn.hotTopic,
            noteId: note.id,
            noteName: note.name,
          });
        }
      }
    }

    return results;
  }, [searchTerm, filterTagIds, filterTagMatchMode, sortedNotes]);

  const isSearchActive = (!!searchTerm && searchTerm.trim().length > 0) || (!!filterTagIds && filterTagIds.length > 0);

  // Expand/collapse all for search results
  const expandAll = () => {
    if (isSearchActive) {
      const keys = new Set(searchResults.filter((r) => r.description).map((r) => `${r.resultType}-${r.id}`));
      setExpandedDescs(keys);
    } else {
      const keys = new Set(sortedNotes.filter((n) => n.details).map((n) => `note-${n.id}`));
      setExpandedDescs(keys);
    }
  };

  const collapseAll = () => {
    setExpandedDescs(new Set());
  };


  const openActionMenu = (e: React.MouseEvent, type: 'note' | 'subnote', id: number, noteId: number, title: string, description?: string) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setActionMenuPos({ top: rect.bottom + 4, left: Math.min(rect.left - 100, window.innerWidth - 160) });
    setActionMenu({ type, id, noteId, title, description });
  };

  const handleActionCopy = () => {
    if (!actionMenu) return;
    const desc = actionMenu.description ? htmlToPlainText(actionMenu.description) : '';
    const text = desc ? `${actionMenu.title}\n${desc}` : actionMenu.title;
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
    setActionMenu(null);
  };

  // Copy functions with proper indentation: Note → tab SubNote
  const buildNoteCopyText = (includeContent: boolean) => {
    const lines: string[] = [];
    if (isSearchActive) {
      for (const item of searchResults) {
        const prefix = item.resultType === 'subnote' ? '\t' : '';
        lines.push(prefix + item.title);
        if (includeContent && item.description) {
          const text = htmlToPlainText(item.description);
          if (text) {
            // Split by newlines and indent each line
            text.split('\n').forEach(line => {
              lines.push(prefix + '\t' + line);
            });
          }
        }
      }
    } else {
      for (const note of sortedNotes) {
        lines.push(note.name);
        if (includeContent && note.details) {
          const text = htmlToPlainText(note.details);
          if (text) {
            text.split('\n').forEach(line => {
              lines.push('\t' + line);
            });
          }
        }
        if (note.subNotes?.length) {
          for (const sn of note.subNotes) {
            lines.push('\t' + sn.header);
            if (includeContent && sn.description) {
              const text = htmlToPlainText(sn.description);
              if (text) {
                text.split('\n').forEach(line => {
                  lines.push('\t\t' + line);
                });
              }
            }
          }
        }
      }
    }
    return lines.join('\n');
  };

  const copyTitles = () => {
    navigator.clipboard.writeText(buildNoteCopyText(false));
    toast.success('Titles copied');
  };

  const copyAll = () => {
    navigator.clipboard.writeText(buildNoteCopyText(true));
    toast.success('All content copied');
  };

  const filteredPopupItems = useMemo(() => {
    if (!popup) return [];
    const search = popupSearch.toLowerCase();
    if (popup.type === 'tags') return tags.filter((t) => t.name.toLowerCase().includes(search));
    if (popup.type === 'assignees') return teamMembers.filter((m) => m.name.toLowerCase().includes(search));
    if (popup.type === 'bucket') return buckets.filter((b) => b.name.toLowerCase().includes(search));
    return [];
  }, [popup, popupSearch, tags, teamMembers, buckets]);

  // Render a single row (used for both search results and normal notes)
  const renderRow = (item: {
    resultType: 'note' | 'subnote';
    id: number;
    title: string;
    description?: string;
    bucketId?: number;
    tagIds: number[];
    parentTagIds?: number[];
    teamMemberIds: number[];
    favorite: boolean;
    hotTopic: boolean;
    noteId: number;
    noteName?: string;
  }, index: number) => {
    const itemTags = getTags(item.tagIds);
    const ownTagIdSet = new Set(item.tagIds);
    const inheritedTags = getTags((item.parentTagIds || []).filter((id) => !ownTagIdSet.has(id)));
    const itemMembers = getTeamMembers(item.teamMemberIds);
    const descKey = `${item.resultType}-${item.id}`;
    const hasDesc = !!(item.description && item.description.trim() && item.description !== '<p><br></p>');
    const isDescExpanded = expandedDescs.has(descKey);
    const isSubnote = item.resultType === 'subnote';
    return (
      <div key={`${item.resultType}-${item.id}`} className={clsx(
        index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-blue-100/70 dark:bg-gray-700/60',
        'border-2 rounded',
        isSubnote ? 'border-amber-400 dark:border-amber-500' : 'border-primary-500 dark:border-primary-600'
      )}>
        {/* Main row */}
        <div
          className={clsx(
            'flex flex-wrap items-center gap-1.5 px-3 py-1.5 hover:bg-blue-100/50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors group',
            isSubnote && 'pl-6'
          )}
          onDoubleClick={(e) => {
            const target = e.target as HTMLElement;

            // Don't navigate if editing title (input is focused)
            if (target.tagName === 'INPUT') {
              e.stopPropagation();
              return;
            }

            // Don't navigate if double-click is on the title span
            if (target.closest('span[title="Double-click to edit title"]')) {
              return;
            }

            e.preventDefault();
            navigate(isSubnote ? `/notes/${item.noteId}?subNoteId=${item.id}` : `/notes/${item.id}`);
          }}
          onClick={() => {
            if (isSubnote) {
              if (isDescExpanded) {
                const original = item.description || '';
                const current = subnoteEdits.get(item.id);
                if (current !== undefined && current !== original && !confirm('Discard changes?')) return;
                setSubnoteEdits((prev) => { const next = new Map(prev); next.delete(item.id); return next; });
              } else {
                setSubnoteEdits((prev) => new Map(prev).set(item.id, item.description || ''));
              }
              toggleDesc(descKey);
            } else {
              hasDesc && toggleDesc(descKey);
            }
          }}
        >
          {/* Subnote indicator */}
          {isSubnote && (
            <span title="Sub-Note" className="flex items-center justify-center w-4 h-4 rounded bg-blue-100 dark:bg-blue-900/30 flex-shrink-0">
              <GitBranch className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            </span>
          )}

          {/* Favorite (notes only) */}
          {!isSubnote && onToggleFavorite && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(item.id); }}
              className="flex-shrink-0 p-0.5"
              title="Toggle favorite"
            >
              <Star className={`w-4 h-4 stroke-[2.5] ${item.favorite ? 'fill-warning-400 text-warning-400' : 'text-gray-500 fill-none'}`} />
            </button>
          )}

          {/* Hot topic (both notes and subnotes) */}
          {!isSubnote && onToggleHotTopic && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleHotTopic(item.id); }}
              className="flex-shrink-0 p-0.5"
              title="Toggle hot topic"
            >
              <Flame className={`w-4 h-4 stroke-[2.5] ${item.hotTopic ? 'fill-danger-400 text-danger-500' : 'text-gray-500 fill-none'}`} />
            </button>
          )}
          {isSubnote && (
            <button
              onClick={(e) => { e.stopPropagation(); toggleSubNoteHotTopicMutation.mutate(item.id); }}
              className="flex items-center justify-center w-4 h-4 rounded flex-shrink-0 hover:bg-danger-100 dark:hover:bg-danger-900/30 transition-colors"
              title="Toggle hot topic"
            >
              <Flame className={`w-3 h-3 stroke-[2.5] ${item.hotTopic ? 'fill-danger-400 text-danger-500' : 'text-gray-400 fill-none'}`} />
            </button>
          )}

          {/* Title - double click handled by parent row */}
          {editingTitle?.type === item.resultType && editingTitle.id === item.id ? (
            <input
              type="text"
              value={editingTitle.value}
              onChange={(e) => setEditingTitle({ ...editingTitle, value: e.target.value })}
              onBlur={handleTitleSave}
              onKeyDown={handleTitleKeyDown}
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
              className="flex-1 min-w-0 text-sm font-medium px-1.5 py-0.5 border border-primary-400 rounded bg-white dark:bg-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-primary-500 outline-none"
              autoFocus
            />
          ) : (
            <span className="flex-1 min-w-0 truncate select-text">
              <span
                className="cursor-pointer select-text text-sm font-medium text-gray-900 dark:text-gray-100"
                onDoubleClick={(e) => { e.stopPropagation(); handleTitleDoubleClick(e, item.resultType, item.id, item.title); }}
                title="Double-click to edit title"
              >
                {item.title}
              </span>
            </span>
          )}

          {/* Parent note link in title line */}
          {isSubnote && item.noteName && (
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/notes/${item.noteId}`); }}
              className="px-2 py-0.5 text-[10px] font-medium text-primary-600 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors min-w-0 max-w-[200px]"
              title={`Go to: ${item.noteName}`}
            >
              <span className="truncate">↗ {item.noteName}</span>
            </button>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <button onClick={(e) => openPopup(e, 'tags', item.resultType, item.id, item.noteId, item.tagIds, item.teamMemberIds, item.bucketId)} className={clsx('p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600', (item.tagIds?.length || 0) > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400')} title="Edit tags">
              <Tag className="w-3.5 h-3.5 stroke-[2]" />
            </button>
            <button onClick={(e) => openPopup(e, 'assignees', item.resultType, item.id, item.noteId, item.tagIds, item.teamMemberIds, item.bucketId)} className={clsx('p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600', (item.teamMemberIds?.length || 0) > 0 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-600 dark:text-gray-400')} title="Edit assignees">
              <Users className="w-3.5 h-3.5 stroke-[2]" />
            </button>
            <button onClick={(e) => openPopup(e, 'bucket', item.resultType, item.id, item.noteId, item.tagIds, item.teamMemberIds, item.bucketId)} className={clsx('p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600', item.bucketId ? 'text-primary-600 dark:text-primary-400' : 'text-gray-600 dark:text-gray-400')} title="Change bucket">
              <Layers className="w-3.5 h-3.5 stroke-[2]" />
            </button>
            <button onClick={() => navigate(isSubnote ? `/notes/${item.noteId}/edit?subNoteId=${item.id}` : `/notes/${item.id}/edit`)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600" title="Edit">
              <Edit className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400 stroke-[2]" />
            </button>
            <button onClick={(e) => openActionMenu(e, item.resultType, item.id, item.noteId, item.title, item.description)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600" title="More actions">
              <MoreVertical className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400 stroke-[2]" />
            </button>
          </div>

          {/* Description toggle */}
          {(hasDesc || isSubnote) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isSubnote) {
                  if (isDescExpanded) {
                    const original = item.description || '';
                    const current = subnoteEdits.get(item.id);
                    if (current !== undefined && current !== original && !confirm('Discard changes?')) return;
                    setSubnoteEdits((prev) => { const next = new Map(prev); next.delete(item.id); return next; });
                  } else {
                    setSubnoteEdits((prev) => new Map(prev).set(item.id, item.description || ''));
                  }
                  toggleDesc(descKey);
                } else {
                  toggleDesc(descKey);
                }
              }}
              className="p-0.5 text-gray-400 flex-shrink-0"
              title="Toggle description"
            >
              {isDescExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Metadata row - only show when toggle is ON */}
        {showMetadata && (itemTags.length > 0 || inheritedTags.length > 0 || itemMembers.length > 0) && (
          <div className={clsx('flex items-center justify-between gap-2 px-3 py-1.5 bg-gray-50/50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-700', isSubnote && 'pl-6')}>
            {/* Tags on left */}
            {(itemTags.length > 0 || inheritedTags.length > 0) && (
              <div className="flex items-center gap-0.5 flex-wrap">
                {itemTags.map((tag) => (
                  <span key={tag.id} className="px-1.5 py-0.5 text-[10px] rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium border border-blue-200 dark:border-blue-800">
                    {tag.name}
                  </span>
                ))}
                {inheritedTags.map((tag) => (
                  <span key={`inh-${tag.id}`} className="px-1.5 py-0.5 text-[10px] rounded-full bg-gray-100 dark:bg-gray-700/50 text-gray-400 dark:text-gray-500 font-normal border border-dashed border-gray-300 dark:border-gray-600 italic" title="Inherited from parent note">
                    {tag.name}
                  </span>
                ))}
              </div>
            )}

            {/* Assignees on right */}
            {itemMembers.length > 0 && (
              <div className="flex items-center gap-0.5 flex-wrap justify-end">
                {itemMembers.map((m) => (
                  <span key={m.id} className="px-1.5 py-0.5 text-[10px] rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium border border-purple-200 dark:border-purple-800">
                    {m.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Description (expanded) */}
        {isDescExpanded && isSubnote && (
          <div className={clsx('mx-3 mb-1 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50', 'ml-8')} onClick={(e) => e.stopPropagation()}>
            <RichTextEditor
              content={subnoteEdits.get(item.id) ?? (item.description || '')}
              onChange={(content) => setSubnoteEdits((prev) => new Map(prev).set(item.id, content))}
              compact
            />
            <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const original = item.description || '';
                  const current = subnoteEdits.get(item.id) || '';
                  if (current !== original && !confirm('Discard changes?')) return;
                  setSubnoteEdits((prev) => { const next = new Map(prev); next.delete(item.id); return next; });
                  setExpandedDescs((prev) => { const next = new Set(prev); next.delete(descKey); return next; });
                }}
                className="px-3 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >Cancel</button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateSubNoteDescMutation.mutate({ id: item.id, description: subnoteEdits.get(item.id) || '' });
                }}
                disabled={updateSubNoteDescMutation.isPending}
                className="px-3 py-1 text-xs rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {updateSubNoteDescMutation.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}
        {isDescExpanded && !isSubnote && hasDesc && (
          <div className="mx-3 mb-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded border-2 border-gray-900 dark:border-gray-300">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="prose prose-sm dark:prose-invert max-w-none text-gray-900 dark:text-gray-100 leading-tight select-text [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0 [&_ul]:!text-gray-900 dark:[&_ul]:!text-white [&_ol]:!text-gray-900 dark:[&_ol]:!text-white [&_li]:!text-gray-900 dark:[&_li]:!text-white [&_li_*]:!text-gray-900 dark:[&_li_*]:!text-white [&_br]:block [&_br]:h-0 [&_br]:my-0 [&_a]:text-primary-600 [&_a]:hover:underline [&_a]:cursor-pointer dark:[&_a]:text-primary-400 [&_code]:bg-gray-900 [&_code]:text-gray-100 [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code::before]:content-none [&_code::after]:content-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(normalizeDescriptionHTML(item.description!)) }} onClick={handleDescriptionClick} />
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const text = htmlToPlainText(item.description || '');
                  navigator.clipboard.writeText(text);
                  toast.success('Copied to clipboard');
                }}
                className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
                title="Copy description"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Control Bar - Tags toggle and Expand/Collapse */}
      <div className="flex items-center gap-2 mb-2 flex-wrap border border-gray-200 dark:border-gray-700 rounded-lg p-0.5">
        {/* Metadata toggle */}
        <label className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
          <input
            type="checkbox"
            checked={showMetadata}
            onChange={(e) => setShowMetadata(e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-3.5 h-3.5"
          />
          <span>Tags & Assignees</span>
        </label>

        <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>

        {/* Expand / Collapse group */}
        <div className="flex items-center overflow-hidden divide-x divide-gray-200 dark:divide-gray-700">
          <button
            onClick={expandAll}
            className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            title="Expand all descriptions"
          >
            <ChevronsDown className="w-3.5 h-3.5" /> Expand
          </button>
          <button
            onClick={collapseAll}
            className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            title="Collapse all descriptions"
          >
            <ChevronsUp className="w-3.5 h-3.5" /> Collapse
          </button>
        </div>

        {/* Copy Titles / Copy All group */}
        <div className="ml-auto flex items-center overflow-hidden divide-x divide-gray-200 dark:divide-gray-700">
          <button
            onClick={copyTitles}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            title="Copy titles"
          >
            <Copy className="w-3.5 h-3.5" /> Titles
          </button>
          <button
            onClick={copyAll}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            title="Copy all content"
          >
            <Copy className="w-3.5 h-3.5" /> All
          </button>
        </div>
      </div>

      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {isSearchActive ? (
          /* SEARCH MODE: Flat list of matching results */
          <div>
            {searchResults.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-500">No matching results</div>
            ) : (
              searchResults.map((result, idx) => renderRow(result, idx))
            )}
          </div>
        ) : (
          /* NORMAL MODE: Only top-level notes (no subnotes in list) */
          <div>
            {sortedNotes.map((note, idx) => renderRow({
              resultType: 'note',
              id: note.id,
              title: note.name,
              description: note.details,
              bucketId: note.bucketId,
              tagIds: note.tagIds || [],
              teamMemberIds: note.teamMemberIds || [],
              favorite: note.favorite,
              hotTopic: note.hotTopic,
              noteId: note.id,
                }, idx))}
          </div>
        )}
      </div>

      {/* Action menu (kebab) */}
      {actionMenu && (
        <div
          ref={actionMenuRef}
          className="fixed z-[9999] w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1"
          style={{ top: actionMenuPos.top, left: actionMenuPos.left }}
        >
          <button
            onClick={handleActionCopy}
            className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <Copy className="w-3.5 h-3.5" /> Copy
          </button>
          {actionMenu.type === 'note' && (
            <button
              onClick={() => { navigate(`/notes/${actionMenu.id}`); setActionMenu(null); }}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <Edit className="w-3.5 h-3.5" /> View
            </button>
          )}
          {actionMenu.type === 'note' && (
            <button
              onClick={() => { duplicateNoteMutation.mutate(actionMenu.id); setActionMenu(null); }}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <ClipboardList className="w-3.5 h-3.5" /> Duplicate
            </button>
          )}
          {actionMenu.type === 'note' && onDelete && (
            <button
              onClick={() => { onDelete(actionMenu.id); setActionMenu(null); }}
              className="w-full text-left px-3 py-1.5 text-xs text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/30 flex items-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          )}
        </div>
      )}

      {/* Inline popup for tags/assignees/bucket */}
      {popup && (
        <div
          ref={popupRef}
          className="fixed z-[9999] w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl"
          style={{ top: popupPos.top, left: popupPos.left }}
        >
          <div className="p-2 border-b border-gray-100 dark:border-gray-700">
            <input
              type="text"
              value={popupSearch}
              onChange={(e) => setPopupSearch(e.target.value)}
              placeholder={`Search ${popup.type}...`}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-primary-500 outline-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && popupSearch.trim()) {
                  if (popup.type === 'tags' && !tags.some((t) => t.name.toLowerCase() === popupSearch.trim().toLowerCase())) {
                    handleCreateTag(popupSearch.trim());
                  }
                  if (popup.type === 'assignees' && !teamMembers.some((m) => m.name.toLowerCase() === popupSearch.trim().toLowerCase())) {
                    handleCreateMember(popupSearch.trim());
                  }
                }
              }}
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {/* Create new option at top if search doesn't match */}
            {popup.type === 'tags' && popupSearch.trim() && !tags.some((t) => t.name.toLowerCase() === popupSearch.trim().toLowerCase()) && (
              <div
                className="px-3 py-2 cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/20 flex items-center gap-2 text-primary-600 dark:text-primary-400 text-sm border-b border-gray-100 dark:border-gray-700"
                onClick={() => handleCreateTag(popupSearch.trim())}
              >
                <Tag className="w-3.5 h-3.5" /> Create "{popupSearch.trim()}"
              </div>
            )}
            {popup.type === 'assignees' && popupSearch.trim() && !teamMembers.some((m) => m.name.toLowerCase() === popupSearch.trim().toLowerCase()) && (
              <div
                className="px-3 py-2 cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/20 flex items-center gap-2 text-primary-600 dark:text-primary-400 text-sm border-b border-gray-100 dark:border-gray-700"
                onClick={() => handleCreateMember(popupSearch.trim())}
              >
                <Users className="w-3.5 h-3.5" /> Add "{popupSearch.trim()}"
              </div>
            )}
            {popup.type === 'tags' && (filteredPopupItems as typeof tags).map((tag) => (
              <div
                key={tag.id}
                className={clsx(
                  'px-3 py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm',
                  popup.currentTagIds.includes(tag.id) && 'bg-primary-50 dark:bg-primary-900/20'
                )}
                onClick={() => handleTogglePopupTag(tag.id)}
              >
                <input type="checkbox" checked={popup.currentTagIds.includes(tag.id)} onChange={() => {}} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-3.5 h-3.5" />
                <span className="text-gray-900 dark:text-gray-100">{tag.name}</span>
              </div>
            ))}
            {popup.type === 'assignees' && (filteredPopupItems as typeof teamMembers).map((member) => (
              <div
                key={member.id}
                className={clsx(
                  'px-3 py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm',
                  popup.currentTeamMemberIds.includes(member.id) && 'bg-primary-50 dark:bg-primary-900/20'
                )}
                onClick={() => handleTogglePopupMember(member.id)}
              >
                <input type="checkbox" checked={popup.currentTeamMemberIds.includes(member.id)} onChange={() => {}} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-3.5 h-3.5" />
                <span className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center text-white text-[9px] font-medium flex-shrink-0">{member.name.charAt(0).toUpperCase()}</span>
                <span className="text-gray-900 dark:text-gray-100">{member.name}</span>
              </div>
            ))}
            {popup.type === 'bucket' && (
              <>
                <div
                  className={clsx('px-3 py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm', !popup.currentBucketId && 'bg-primary-50 dark:bg-primary-900/20')}
                  onClick={() => handleSetBucket(null)}
                >
                  <input type="radio" checked={!popup.currentBucketId} onChange={() => {}} className="border-gray-300 text-primary-600 focus:ring-primary-500 w-3.5 h-3.5" />
                  <span className="text-gray-500 italic">None</span>
                </div>
                {(filteredPopupItems as typeof buckets).map((bucket) => (
                  <div
                    key={bucket.id}
                    className={clsx('px-3 py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm', popup.currentBucketId === bucket.id && 'bg-primary-50 dark:bg-primary-900/20')}
                    onClick={() => handleSetBucket(bucket.id)}
                  >
                    <input type="radio" checked={popup.currentBucketId === bucket.id} onChange={() => {}} className="border-gray-300 text-primary-600 focus:ring-primary-500 w-3.5 h-3.5" />
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: bucket.color }} />
                    <span className="text-gray-900 dark:text-gray-100">{bucket.name}</span>
                  </div>
                ))}
              </>
            )}
            {filteredPopupItems.length === 0 && popupSearch && popup.type === 'bucket' && (
              <div className="px-3 py-2 text-sm text-gray-500">No matching buckets</div>
            )}
          </div>
          {/* Selected items footer */}
          {popup.type === 'tags' && popup.currentTagIds.length > 0 && (
            <div className="p-2 border-t border-gray-100 dark:border-gray-700">
              <div className="flex flex-wrap gap-1">
                {getTags(popup.currentTagIds).map((t) => (
                  <span key={t.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300">
                    {t.name}
                    <button onClick={() => handleTogglePopupTag(t.id)} className="hover:bg-black/10 rounded-full">
                      <span className="text-xs leading-none">&times;</span>
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
          {popup.type === 'assignees' && popup.currentTeamMemberIds.length > 0 && (
            <div className="p-2 border-t border-gray-100 dark:border-gray-700">
              <div className="flex flex-wrap gap-1">
                {getTeamMembers(popup.currentTeamMemberIds).map((m) => (
                  <span key={m.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300">
                    {m.name}
                    <button onClick={() => handleTogglePopupMember(m.id)} className="hover:bg-black/10 rounded-full">
                      <span className="text-xs leading-none">&times;</span>
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

    </>
  );
}
