import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { sanitizeHtml } from '@/utils/sanitize';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notesApi, subNotesApi } from '@/api/notes';
import { tagsApi } from '@/api/tags';
import { filesApi } from '@/api/files';
import { UpdateSubNoteRequest, CreateSubNoteRequest } from '@/types';
import { useReferenceData } from '@/hooks/useReferenceData';
import { Card } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { SubNoteCard } from '@/components/notes/SubNoteCard';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Edit, Star, Flame, ArrowLeft, Plus, ChevronsDown, ChevronsUp, Copy, Upload, Paperclip, FolderTree, Tag, Users, X, ChevronDown, ChevronRight, Eye, EyeOff, Trash2, Link2 } from 'lucide-react';
import { format } from 'date-fns';
import { useState, useMemo, useRef } from 'react';
import { useKeyboard } from '@/hooks/useKeyboard';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export function NoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const highlightSubNoteId = searchParams.get('subNoteId') ? Number(searchParams.get('subNoteId')) : null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteSubNoteId, setDeleteSubNoteId] = useState<number | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => {
    // Auto-expand the highlighted subnote
    if (highlightSubNoteId) {
      return new Set([highlightSubNoteId]);
    }
    return new Set();
  });
  const { buckets, tags, teamMembers, getTags, getTeamMembers } = useReferenceData();

  const { data: note, isLoading } = useQuery({
    queryKey: ['note', id],
    queryFn: () => notesApi.getById(Number(id)),
    enabled: !!id,
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: () => notesApi.toggleFavorite(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note', id] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  const toggleHotTopicMutation = useMutation({
    mutationFn: () => notesApi.toggleHotTopic(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note', id] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  const updateSubNoteMutation = useMutation({
    mutationFn: ({ subNoteId, data }: { subNoteId: number; data: UpdateSubNoteRequest }) =>
      subNotesApi.update(subNoteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note', id] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Updated');
    },
    onError: () => {
      toast.error('Failed to update');
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: () => notesApi.delete(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Note deleted');
      navigate('/notes');
    },
    onError: () => toast.error('Failed to delete note'),
  });

  const handleDeleteNote = () => {
    if (confirm('Delete this note and all its subnotes? This cannot be undone.')) {
      deleteNoteMutation.mutate();
    }
  };

  const deleteSubNoteMutation = useMutation({
    mutationFn: (subNoteId: number) => subNotesApi.delete(subNoteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note', id] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Deleted');
    },
    onError: () => {
      toast.error('Failed to delete');
    },
  });

  const toggleSubNoteHotTopicMutation = useMutation({
    mutationFn: (subNoteId: number) => subNotesApi.toggleHotTopic(subNoteId),
    onMutate: async (subNoteId: number) => {
      await queryClient.cancelQueries({ queryKey: ['note', id] });
      const previous = queryClient.getQueryData(['note', id]);
      queryClient.setQueryData(['note', id], (old: any) => {
        if (!old?.subNotes) return old;
        return {
          ...old,
          subNotes: old.subNotes.map((sn: any) =>
            sn.id === subNoteId ? { ...sn, hotTopic: !sn.hotTopic } : sn
          ),
        };
      });
      return { previous };
    },
    onError: (_err, _subNoteId, context) => {
      if (context?.previous) queryClient.setQueryData(['note', id], context.previous);
      toast.error('Failed to update priority');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['note', id] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  const handleContentClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    console.log('[handleContentClick] Clicked on:', target.tagName, target);
    if (target.tagName === 'A') {
      const href = target.getAttribute('href');
      console.log('[handleContentClick] Link clicked with href:', href);
      if (href) {
        if (href.startsWith('http://') || href.startsWith('https://')) {
          console.log('[handleContentClick] Opening external link:', href);
          window.open(href, '_blank');
        } else if (href.startsWith('/')) {
          console.log('[handleContentClick] Navigating to:', href);
          navigate(href);
        }
        e.preventDefault();
      }
    }
  };


  const moveBucketMutation = useMutation({
    mutationFn: (bucketId: number) => notesApi.moveToBucket(Number(id), bucketId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note', id] });
      toast.success('Bucket updated');
    },
  });

  const addSubNoteMutation = useMutation({
    mutationFn: (data: CreateSubNoteRequest) => subNotesApi.create(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note', id] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('SubNote added');
    },
  });

  const moveSubNoteToNoteMutation = useMutation({
    mutationFn: ({ subNoteId, targetNoteId }: { subNoteId: number; targetNoteId: number }) =>
      subNotesApi.moveToNote(subNoteId, targetNoteId),
    onSuccess: (_, { targetNoteId }) => {
      queryClient.invalidateQueries({ queryKey: ['note', id] });
      queryClient.invalidateQueries({ queryKey: ['note', String(targetNoteId)] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('SubNote moved');
    },
  });

  const convertToNoteMutation = useMutation({
    mutationFn: (subNoteId: number) => subNotesApi.convertToNote(subNoteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note', id] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Converted to note');
    },
  });

  const linkToNoteMutation = useMutation({
    mutationFn: ({ subNoteId, targetNoteId }: { subNoteId: number; targetNoteId: number }) =>
      subNotesApi.linkToNote(subNoteId, targetNoteId),
    onSuccess: (_, { targetNoteId }) => {
      queryClient.invalidateQueries({ queryKey: ['note', id] });
      queryClient.invalidateQueries({ queryKey: ['note', String(targetNoteId)] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('SubNote linked');
    },
  });

  const unlinkFromNoteMutation = useMutation({
    mutationFn: (subNoteId: number) => subNotesApi.unlinkFromNote(subNoteId, Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note', id] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('SubNote unlinked');
    },
  });

  // Move/Link modal state
  const [moveModalSubNoteId, setMoveModalSubNoteId] = useState<number | null>(null);
  const [linkModalSubNoteId, setLinkModalSubNoteId] = useState<number | null>(null);
  const [modalNotes, setModalNotes] = useState<{ id: number; name: string }[]>([]);
  const [modalSearch, setModalSearch] = useState('');

  // Tag/Assignee/Bucket modal state
  const [tagModalSubNoteId, setTagModalSubNoteId] = useState<number | null>(null);
  const [tagModalSearch, setTagModalSearch] = useState('');
  const [tmModalSubNoteId, setTmModalSubNoteId] = useState<number | null>(null);
  const [tmModalSearch, setTmModalSearch] = useState('');
  const [bucketModalSubNoteId, setBucketModalSubNoteId] = useState<number | null>(null);
  const [collapsedBuckets, setCollapsedBuckets] = useState<Set<string>>(new Set());
  const [showMeta, setShowMeta] = useState(false);
  useKeyboard('m', () => setShowMeta((v) => !v), [], { modifier: 'alt' });
  const toggleBucketCollapse = (key: string) => {
    setCollapsedBuckets((prev) => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  };

  const openMoveModal = async (subNoteId: number) => {
    setMoveModalSubNoteId(subNoteId);
    setModalSearch('');
    const notes = await notesApi.getAll();
    setModalNotes(notes.filter((n) => n.id !== Number(id)).map((n) => ({ id: n.id, name: n.name })));
  };

  const openLinkModal = async (subNoteId: number) => {
    setLinkModalSubNoteId(subNoteId);
    setModalSearch('');
    const notes = await notesApi.getAll();
    setModalNotes(notes.filter((n) => n.id !== Number(id)).map((n) => ({ id: n.id, name: n.name })));
  };

  const getLinkModalParentIds = (): number[] => {
    if (!linkModalSubNoteId) return [];
    const sn = subNotes.find((s) => s.id === linkModalSubNoteId);
    return sn?.parentNoteIds || [];
  };


  // File attachment queries and mutations
  const { data: noteFiles = [] } = useQuery({
    queryKey: ['files', 'note', id],
    queryFn: () => filesApi.getByNoteId(Number(id)),
    enabled: !!id,
  });

  const uploadFileMutation = useMutation({
    mutationFn: (file: File) => filesApi.upload(file, Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', 'note', id] });
      toast.success('File uploaded');
    },
    onError: () => toast.error('Failed to upload file'),
  });

  const deleteFileMutation = useMutation({
    mutationFn: filesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', 'note', id] });
      toast.success('File deleted');
    },
  });

  const convertToNestedMutation = useMutation({
    mutationFn: async () => {
      const noteData = await notesApi.getById(Number(id));
      await notesApi.update(Number(id), { nested: true, details: '' });
      if (noteData.details && noteData.details.trim() && noteData.details !== '<p><br></p>') {
        await subNotesApi.create(Number(id), {
          header: 'General',
          description: noteData.details,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note', id] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Converted to nested note');
    },
    onError: () => toast.error('Failed to convert'),
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFileMutation.mutate(file);
    e.target.value = '';
  };

  const handleUpdateSubNote = async (subNoteId: number, data: UpdateSubNoteRequest) => {
    await updateSubNoteMutation.mutateAsync({ subNoteId, data });
  };

  const handleAddSubNote = (bucketId?: number) => {
    addSubNoteMutation.mutate({ header: 'New SubNote', description: '', bucketId });
  };

  const handleCopyTitles = () => {
    const titles = subNotes.map((sn) => sn.header).join('\n');
    navigator.clipboard.writeText(titles);
    toast.success('Titles copied');
  };

  const stripHtmlAndPreserveLineBreaks = (html: string) => {
    if (!html) return '';
    return html
      .replace(/<br[^>]*>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  const handleCopyAll = () => {
    const all = subNotes
      .map((sn) => {
        const cleanDescription = stripHtmlAndPreserveLineBreaks(sn.description || '');
        return `${sn.header}\n${cleanDescription}`;
      })
      .join('\n\n');
    navigator.clipboard.writeText(all);
    toast.success('All content copied');
  };

  const confirmDeleteSubNote = () => {
    if (deleteSubNoteId) {
      deleteSubNoteMutation.mutate(deleteSubNoteId);
      setDeleteSubNoteId(null);
    }
  };

  const subNotes = useMemo(() => note?.subNotes || [], [note]);

  const toggleExpand = (subNoteId: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(subNoteId)) next.delete(subNoteId);
      else next.add(subNoteId);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedIds(new Set(subNotes.map((sn) => sn.id)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  useKeyboard('ArrowDown', expandAll, [subNotes], { modifier: 'alt' });
  useKeyboard('ArrowUp', collapseAll, [], { modifier: 'alt' });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!note) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">Note not found</p>
      </div>
    );
  }

  const noteTags = getTags(note.tagIds || []);
  const noteTeamMembers = getTeamMembers(note.teamMemberIds || []);

  return (
    <div className="space-y-4">
      {/* Compact header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/notes')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
              {note.name}
            </h1>
            {note.favorite && <Star className="w-5 h-5 stroke-[2.5] fill-warning-400 text-warning-400 flex-shrink-0" />}
            {note.hotTopic && <Flame className="w-5 h-5 stroke-[2.5] fill-danger-400 text-danger-500 flex-shrink-0" />}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {/* Bucket dropdown */}
            <select
              value={note.bucketId || ''}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val) moveBucketMutation.mutate(val);
              }}
              className="text-xs px-2 py-0.5 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="">No bucket</option>
              {buckets.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            {noteTags.map((tag) => (
              <Badge key={tag.id} variant="primary">{tag.name}</Badge>
            ))}
            {noteTeamMembers.length > 0 && (
              <div className="flex -space-x-1.5 ml-1">
                {noteTeamMembers.map((m) => (
                  <div
                    key={m.id}
                    className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-medium border-2 border-white dark:border-gray-900"
                    title={m.name}
                  >
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                ))}
              </div>
            )}
            <span className="text-xs text-gray-400 ml-auto flex-shrink-0">
              Updated {format(new Date(note.updatedAt), 'MMM d, yyyy')}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => navigate(`/notes/${note.id}/edit`)}
            className={clsx('p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700', (note.tagIds?.length || 0) > 0 ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500')}
            title="Edit tags"
          >
            <Tag className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate(`/notes/${note.id}/edit`)}
            className={clsx('p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700', (note.teamMemberIds?.length || 0) > 0 ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500')}
            title="Edit assignees"
          >
            <Users className="w-4 h-4" />
          </button>
          <button
            onClick={() => toggleFavoriteMutation.mutate()}
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Toggle favorite"
          >
            <Star className={`w-4 h-4 stroke-[2.5] ${note.favorite ? 'fill-warning-400 text-warning-400' : 'text-gray-500 fill-none'}`} />
          </button>
          <button
            onClick={() => toggleHotTopicMutation.mutate()}
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Toggle hot topic"
          >
            <Flame className={`w-4 h-4 stroke-[2.5] ${note.hotTopic ? 'fill-danger-400 text-danger-500' : 'text-gray-500 fill-none'}`} />
          </button>
          <Button variant="secondary" size="sm" onClick={() => navigate(`/notes/${note.id}/edit`)}>
            <Edit className="w-4 h-4" />
          </Button>
          <button
            onClick={handleDeleteNote}
            className="p-2 rounded hover:bg-danger-50 dark:hover:bg-danger-900/30 text-gray-400 hover:text-danger-600 dark:hover:text-danger-400 transition-colors"
            title="Delete note"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Note content - only show for non-nested notes */}
      {!note.nested && note.details && (
        <Card className="p-4">
          <div
            className="prose prose-sm dark:prose-invert max-w-none select-text [&_ul]:!text-gray-900 dark:[&_ul]:!text-white [&_ol]:!text-gray-900 dark:[&_ol]:!text-white [&_li]:!text-gray-900 dark:[&_li]:!text-white [&_li_*]:!text-gray-900 dark:[&_li_*]:!text-white [&_li::marker]:!text-gray-900 dark:[&_li::marker]:!text-white"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(note.details) }}
            onClick={handleContentClick}
          />
        </Card>
      )}

      {/* Convert to nested button - only for non-nested notes */}
      {!note.nested && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => convertToNestedMutation.mutate()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            title="Convert to nested note with subnotes. Description will become the first subnote."
          >
            <FolderTree className="w-3.5 h-3.5" /> Convert to Nested
          </button>
        </div>
      )}

      {/* File attachments section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <Paperclip className="w-3.5 h-3.5" />
            Files {noteFiles.length > 0 && <span className="text-gray-400">({noteFiles.length})</span>}
          </h3>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <Upload className="w-3 h-3" /> Upload
          </button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
        </div>
        {noteFiles.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {noteFiles.map((file) => (
              <span key={file.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800">
                <a href={filesApi.getDownloadUrl(file.id)} target="_blank" rel="noreferrer" className="hover:underline" title="Click to download">
                  {file.originalFileName}
                </a>
                <button onClick={() => { if (confirm('Delete this file?')) deleteFileMutation.mutate(file.id); }} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 ml-0.5" title="Delete file">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* SubNotes section */}
      {note.nested && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              SubNotes <span className="text-gray-400 font-normal">({subNotes.length})</span>
            </h2>
            <div className="flex items-center gap-1">
              {subNotes.length > 0 && (
                <>
                  <button
                    onClick={handleCopyTitles}
                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                    title="Copy titles"
                  >
                    <Copy className="w-4 h-4 stroke-[2]" />
                  </button>
                  <button
                    onClick={handleCopyAll}
                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                    title="Copy all"
                  >
                    <Copy className="w-4 h-4 stroke-[2]" />
                  </button>
                  <button
                    onClick={expandAll}
                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                    title="Expand all"
                  >
                    <ChevronsDown className="w-4 h-4 stroke-[2]" />
                  </button>
                  <button
                    onClick={collapseAll}
                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                    title="Collapse all"
                  >
                    <ChevronsUp className="w-4 h-4 stroke-[2]" />
                  </button>
                  <button
                    onClick={() => setShowMeta((v) => !v)}
                    className={clsx('p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700', showMeta ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400')}
                    title={showMeta ? 'Hide tags & assignees' : 'Show tags & assignees'}
                  >
                    {showMeta ? <Eye className="w-4 h-4 stroke-[2]" /> : <EyeOff className="w-4 h-4 stroke-[2]" />}
                  </button>
                </>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleAddSubNote()}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
          </div>

          {subNotes.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">No subnotes yet</p>
            </Card>
          ) : (() => {
            // Always group subnotes by their bucket
            const sortedBkts = [...buckets].sort((a, b) => a.priority - b.priority);
            const subNotesByBucket = new Map<number | undefined, typeof subNotes>();
            const sortedSubNotes = [...subNotes].sort((a, b) => {
              const ta = new Date(a.updatedAt ?? a.createdAt).getTime();
              const tb = new Date(b.updatedAt ?? b.createdAt).getTime();
              return tb - ta;
            });
            sortedSubNotes.forEach((sn) => {
              const key = sn.bucketId ?? undefined;
              if (!subNotesByBucket.has(key)) subNotesByBucket.set(key, []);
              subNotesByBucket.get(key)!.push(sn);
            });
            return (
              <div className="space-y-4">
                {/* Bucket sections — fieldset-legend style */}
                {sortedBkts.map((b) => {
                  const items = subNotesByBucket.get(b.id) || [];
                  const isCollapsed = collapsedBuckets.has(`b-${b.id}`);
                  return (
                    <fieldset key={b.id} className="rounded-lg p-0" style={{ border: `2px solid ${b.color}` }}>
                      <legend className="ml-3 px-2">
                        <span className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => toggleBucketCollapse(`b-${b.id}`)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold"
                            style={{ color: b.color }}
                          >
                            {b.name} ({items.length})
                            {items.length > 0 && (isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddSubNote(b.id)}
                            className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                            style={{ color: b.color }}
                            title={`Add subnote to ${b.name}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      </legend>
                      {!isCollapsed && items.length > 0 && (
                        <div className="space-y-2 pb-2">
                          {items.map((subNote) => (
                            <SubNoteCard
                              key={subNote.id}
                              subNote={subNote}
                              currentNoteId={Number(id)}
                              isExpanded={expandedIds.has(subNote.id)}
                              showMeta={showMeta}
                              inheritedTagIds={note.tagIds ?? []}
                              onToggleExpand={() => toggleExpand(subNote.id)}
                              onUpdate={handleUpdateSubNote}
                              onDelete={(snId) => setDeleteSubNoteId(snId)}
                              onUnlink={(snId) => unlinkFromNoteMutation.mutate(snId)}
                              onToggleHotTopic={(snId) => toggleSubNoteHotTopicMutation.mutate(snId)}
                              onMove={(snId) => openMoveModal(snId)}
                              onConvert={(snId) => convertToNoteMutation.mutate(snId)}
                              onLink={(snId) => openLinkModal(snId)}
                              onEditTags={(snId) => { setTagModalSubNoteId(snId); setTagModalSearch(''); }}
                              onEditAssignees={(snId) => { setTmModalSubNoteId(snId); setTmModalSearch(''); }}
                              onEditBucket={(snId) => setBucketModalSubNoteId(snId)}
                            />
                          ))}
                        </div>
                      )}
                    </fieldset>
                  );
                })}
                {/* Unassigned subnotes */}
                {subNotesByBucket.get(undefined)?.length ? (
                  <fieldset className="rounded-lg p-0 border-2 border-gray-300 dark:border-gray-600">
                    <legend className="ml-3 px-2">
                      <span className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => toggleBucketCollapse('b-unassigned')}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500"
                        >
                          Unassigned ({subNotesByBucket.get(undefined)!.length})
                          {collapsedBuckets.has('b-unassigned') ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddSubNote()}
                          className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                          title="Add subnote"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    </legend>
                    {!collapsedBuckets.has('b-unassigned') && (
                      <div className="space-y-2 pb-2">
                        {subNotesByBucket.get(undefined)!.map((subNote) => (
                          <SubNoteCard
                            key={subNote.id}
                            subNote={subNote}
                            currentNoteId={Number(id)}
                            isExpanded={expandedIds.has(subNote.id)}
                            showMeta={showMeta}
                            inheritedTagIds={note.tagIds ?? []}
                            onToggleExpand={() => toggleExpand(subNote.id)}
                            onUpdate={handleUpdateSubNote}
                            onDelete={(snId) => setDeleteSubNoteId(snId)}
                            onUnlink={(snId) => unlinkFromNoteMutation.mutate(snId)}
                            onToggleHotTopic={(snId) => toggleSubNoteHotTopicMutation.mutate(snId)}
                            onMove={(snId) => openMoveModal(snId)}
                            onConvert={(snId) => convertToNoteMutation.mutate(snId)}
                            onLink={(snId) => openLinkModal(snId)}
                            onEditTags={(snId) => { setTagModalSubNoteId(snId); setTagModalSearch(''); }}
                            onEditAssignees={(snId) => { setTmModalSubNoteId(snId); setTmModalSearch(''); }}
                            onEditBucket={(snId) => setBucketModalSubNoteId(snId)}
                          />
                        ))}
                      </div>
                    )}
                  </fieldset>
                ) : null}
              </div>
            );
          })()}
        </div>
      )}

      {/* Move SubNote Modal */}
      {moveModalSubNoteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setMoveModalSubNoteId(null)}>
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Move SubNote to Another Note</h3>
              <button onClick={() => setMoveModalSubNoteId(null)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-4">
              <input
                type="text"
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                placeholder="Search notes..."
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none mb-3"
                autoFocus
              />
              <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                {(modalSearch ? modalNotes.filter((n) => n.name.toLowerCase().includes(modalSearch.toLowerCase())) : modalNotes).map((n) => (
                  <div
                    key={n.id}
                    className="px-4 py-2.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 border-b border-gray-50 dark:border-gray-700/50 last:border-0"
                    onClick={() => {
                      moveSubNoteToNoteMutation.mutate({ subNoteId: moveModalSubNoteId, targetNoteId: n.id });
                      setMoveModalSubNoteId(null);
                    }}
                  >
                    {n.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Link SubNote Modal */}
      {linkModalSubNoteId !== null && (() => {
        const alreadyLinkedIds = getLinkModalParentIds();
        const filteredNotes = modalSearch ? modalNotes.filter((n) => n.name.toLowerCase().includes(modalSearch.toLowerCase())) : modalNotes;
        const linkedNotes = filteredNotes.filter((n) => alreadyLinkedIds.includes(n.id));
        const availableNotes = filteredNotes.filter((n) => !alreadyLinkedIds.includes(n.id));
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setLinkModalSubNoteId(null)}>
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Link SubNote to Another Note</h3>
              <button onClick={() => setLinkModalSubNoteId(null)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Share this subnote with another parent note. It will appear in both. You can link to multiple notes.</p>
              <input
                type="text"
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                placeholder="Search notes..."
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none mb-3"
                autoFocus
              />
              <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                {linkedNotes.length > 0 && (
                  <>
                    <div className="px-4 py-1.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 uppercase tracking-wide">Already Linked</div>
                    {linkedNotes.map((n) => (
                      <div
                        key={n.id}
                        className="flex items-center justify-between px-4 py-2.5 text-sm border-b border-gray-50 dark:border-gray-700/50 bg-primary-50/50 dark:bg-primary-900/10"
                      >
                        <span className="text-gray-900 dark:text-gray-100 flex items-center gap-2">
                          <Link2 className="w-3.5 h-3.5 text-primary-500" />
                          {n.name}
                        </span>
                        <button
                          onClick={() => {
                            subNotesApi.unlinkFromNote(linkModalSubNoteId, n.id).then(() => {
                              queryClient.invalidateQueries({ queryKey: ['note', id] });
                              queryClient.invalidateQueries({ queryKey: ['note', String(n.id)] });
                              queryClient.invalidateQueries({ queryKey: ['notes'] });
                              toast.success('Unlinked');
                              setLinkModalSubNoteId(null);
                            });
                          }}
                          className="text-xs px-2 py-1 rounded bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400 hover:bg-warning-200 dark:hover:bg-warning-900/50"
                        >
                          Unlink
                        </button>
                      </div>
                    ))}
                  </>
                )}
                {availableNotes.length > 0 && linkedNotes.length > 0 && (
                  <div className="px-4 py-1.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 uppercase tracking-wide">Available</div>
                )}
                {availableNotes.map((n) => (
                  <div
                    key={n.id}
                    className="px-4 py-2.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 border-b border-gray-50 dark:border-gray-700/50 last:border-0"
                    onClick={() => {
                      linkToNoteMutation.mutate({ subNoteId: linkModalSubNoteId, targetNoteId: n.id });
                      setLinkModalSubNoteId(null);
                    }}
                  >
                    {n.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Tag Modal for SubNote */}
      {tagModalSubNoteId !== null && (() => {
        const sn = subNotes.find((s) => s.id === tagModalSubNoteId);
        if (!sn) return null;
        const snTags = sn.tagIds || [];
        const toggleTag = (tagId: number) => {
          const newTagIds = snTags.includes(tagId) ? snTags.filter((id) => id !== tagId) : [...snTags, tagId];
          const selectedTags = getTags(newTagIds);
          handleUpdateSubNote(tagModalSubNoteId, { header: sn.header, tagNames: selectedTags.map((t) => t.name), teamMemberIds: sn.teamMemberIds });
        };
        const createAndAddTag = async () => {
          const name = tagModalSearch.trim();
          if (!name) return;
          try {
            const newTag = await tagsApi.create({ name });
            queryClient.invalidateQueries({ queryKey: ['tags'] });
            const currentTags = getTags(snTags);
            const tagNames = [...currentTags.map((t) => t.name), newTag.name];
            handleUpdateSubNote(tagModalSubNoteId, { header: sn.header, tagNames, teamMemberIds: sn.teamMemberIds });
            setTagModalSearch('');
            toast.success(`Tag "${name}" created`);
          } catch {
            toast.error('Failed to create tag');
          }
        };
        const filteredTags = tagModalSearch ? tags.filter((t) => t.name.toLowerCase().includes(tagModalSearch.toLowerCase())) : tags;
        const canCreate = tagModalSearch.trim() && !tags.some((t) => t.name.toLowerCase() === tagModalSearch.trim().toLowerCase());
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setTagModalSubNoteId(null)}>
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Edit Tags — {sn.header}</h3>
                <button onClick={() => setTagModalSubNoteId(null)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <div className="p-4">
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {getTags(snTags).map((t) => (
                    <span key={t.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300">
                      {t.name}
                      <button onClick={() => toggleTag(t.id)} className="hover:bg-black/10 rounded-full p-0.5"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  value={tagModalSearch}
                  onChange={(e) => setTagModalSearch(e.target.value)}
                  placeholder="Search or create tags..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none mb-3"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && canCreate) {
                      e.preventDefault();
                      createAndAddTag();
                    }
                  }}
                />
                <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                  {canCreate && (
                    <div
                      className="px-4 py-2.5 cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/20 flex items-center gap-2 text-primary-600 dark:text-primary-400 text-sm border-b border-gray-100 dark:border-gray-700"
                      onClick={createAndAddTag}
                    >
                      <Plus className="w-4 h-4" />
                      <span className="font-medium">Create "{tagModalSearch.trim()}"</span>
                    </div>
                  )}
                  {filteredTags.map((t) => (
                    <div
                      key={t.id}
                      className={clsx('px-4 py-2.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0', snTags.includes(t.id) && 'bg-primary-50 dark:bg-primary-900/20')}
                      onClick={() => toggleTag(t.id)}
                    >
                      <input type="checkbox" checked={snTags.includes(t.id)} onChange={() => {}} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                      <span className="text-sm text-gray-900 dark:text-gray-100">{t.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Assignees Modal for SubNote */}
      {tmModalSubNoteId !== null && (() => {
        const sn = subNotes.find((s) => s.id === tmModalSubNoteId);
        if (!sn) return null;
        const snTm = sn.teamMemberIds || [];
        const toggleTm = (tmId: number) => {
          const newIds = snTm.includes(tmId) ? snTm.filter((id) => id !== tmId) : [...snTm, tmId];
          const selectedTags = getTags(sn.tagIds);
          handleUpdateSubNote(tmModalSubNoteId, { header: sn.header, tagNames: selectedTags.map((t) => t.name), teamMemberIds: newIds });
        };
        const filteredTm = tmModalSearch ? teamMembers.filter((m) => m.name.toLowerCase().includes(tmModalSearch.toLowerCase())) : teamMembers;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setTmModalSubNoteId(null)}>
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Edit Assignees — {sn.header}</h3>
                <button onClick={() => setTmModalSubNoteId(null)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <div className="p-4">
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {getTeamMembers(snTm).map((m) => (
                    <span key={m.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                      {m.name}
                      <button onClick={() => toggleTm(m.id)} className="hover:bg-black/10 rounded-full p-0.5"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  value={tmModalSearch}
                  onChange={(e) => setTmModalSearch(e.target.value)}
                  placeholder="Search team members..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none mb-3"
                  autoFocus
                />
                <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                  {filteredTm.map((m) => (
                    <div
                      key={m.id}
                      className={clsx('px-4 py-2.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0', snTm.includes(m.id) && 'bg-primary-50 dark:bg-primary-900/20')}
                      onClick={() => toggleTm(m.id)}
                    >
                      <input type="checkbox" checked={snTm.includes(m.id)} onChange={() => {}} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                      <span className="text-sm text-gray-900 dark:text-gray-100">{m.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Bucket Modal for SubNote */}
      {bucketModalSubNoteId !== null && (() => {
        const sn = subNotes.find((s) => s.id === bucketModalSubNoteId);
        if (!sn) return null;
        const currentBucketId = sn.bucketId;
        const setBucket = (newBucketId: number | null) => {
          const selectedTags = getTags(sn.tagIds);
          handleUpdateSubNote(bucketModalSubNoteId, { header: sn.header, tagNames: selectedTags.map((t) => t.name), teamMemberIds: sn.teamMemberIds, bucketId: newBucketId ?? undefined });
          setBucketModalSubNoteId(null);
        };
        const sortedBuckets = [...buckets].sort((a, b) => a.priority - b.priority);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setBucketModalSubNoteId(null)}>
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Change Bucket — {sn.header}</h3>
                <button onClick={() => setBucketModalSubNoteId(null)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <div className="p-4">
                {currentBucketId && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {buckets.filter((b) => b.id === currentBucketId).map((b) => (
                      <span key={b.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: `${b.color}20`, color: b.color }}>
                        <span className="w-2 h-2 rounded" style={{ backgroundColor: b.color }} />
                        {b.name}
                      </span>
                    ))}
                  </div>
                )}
                <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div
                    className={clsx('px-4 py-2.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 border-b border-gray-50 dark:border-gray-700/50', !currentBucketId && 'bg-primary-50 dark:bg-primary-900/20')}
                    onClick={() => setBucket(null)}
                  >
                    <span className="w-3 h-3 rounded bg-gray-300" />
                    <span className="text-sm text-gray-900 dark:text-gray-100">None</span>
                  </div>
                  {sortedBuckets.map((b) => (
                    <div
                      key={b.id}
                      className={clsx('px-4 py-2.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0', currentBucketId === b.id && 'bg-primary-50 dark:bg-primary-900/20')}
                      onClick={() => setBucket(b.id)}
                    >
                      <span className="w-3 h-3 rounded flex-shrink-0" style={{ backgroundColor: b.color }} />
                      <span className="text-sm text-gray-900 dark:text-gray-100">{b.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <ConfirmDialog
        isOpen={deleteSubNoteId !== null}
        onClose={() => setDeleteSubNoteId(null)}
        onConfirm={confirmDeleteSubNote}
        title="Delete SubNote"
        message="Are you sure you want to delete this subnote?"
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
