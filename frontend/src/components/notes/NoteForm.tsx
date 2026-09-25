import { useState, useRef, useEffect, useMemo } from 'react';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { Note, CreateNoteRequest, UpdateNoteRequest, CreateSubNoteRequest } from '@/types';
import { useReferenceData } from '@/hooks/useReferenceData';
import { useKeyboard } from '@/hooks/useKeyboard';
import { subNotesApi } from '@/api/notes';
import { tagsApi } from '@/api/tags';
import { teamMembersApi } from '@/api/teamMembers';
import { filesApi } from '@/api/files';
import { Input } from '@/components/shared/Input';
import { Button } from '@/components/shared/Button';
import { RichTextEditor } from '@/components/shared/RichTextEditor';
import {
  Plus, Trash2, Star, Flame, ChevronDown, ChevronRight, Tag, Users,
  Save, Copy, ClipboardList, MoveRight, ChevronsDown, ChevronsUp, X, Paperclip, Link2, FileUp, Layers, Eye, EyeOff, MoreHorizontal,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface NoteFormProps {
  note?: Note;
  onSubmit: (data: CreateNoteRequest | UpdateNoteRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  focusSubNoteId?: number;
}

interface SubNoteFormData {
  id?: number;
  header: string;
  description: string;
  bucketId?: number;
  tagIds: number[];
  teamMemberIds: number[];
  hotTopic: boolean;
  descExpanded: boolean;
  dirty: boolean;
  saving: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export function NoteForm({ note, onSubmit, onCancel, isLoading, focusSubNoteId }: NoteFormProps) {
  const queryClient = useQueryClient();
  const { buckets, tags, teamMembers, getTags, getTeamMembers, getBucket } = useReferenceData();

  const [name, setName] = useState(note?.name || '');
  const [details, setDetails] = useState(note?.details || '');
  const sortedBuckets = useMemo(() => [...buckets].sort((a, b) => a.priority - b.priority), [buckets]);
  const [bucketId, setBucketId] = useState<number | undefined>(note?.bucketId || sortedBuckets[0]?.id);
  const [tagIds, setTagIds] = useState<number[]>(note?.tagIds || []);
  const [teamMemberIds, setTeamMemberIds] = useState<number[]>(note?.teamMemberIds || []);
  const [nested, setNested] = useState(note?.nested || false);
  const [hotTopic, setHotTopic] = useState(note?.hotTopic || false);
  const [favorite, setFavorite] = useState(note?.favorite || false);

  const [subNotes, setSubNotes] = useState<SubNoteFormData[]>(() => {
    if (note?.subNotes?.length) {
      return note.subNotes.map((sn) => ({
        id: sn.id,
        header: sn.header,
        description: sn.description || '',
        bucketId: sn.bucketId,
        tagIds: sn.tagIds || [],
        teamMemberIds: sn.teamMemberIds || [],
        hotTopic: sn.hotTopic,
        descExpanded: false,
        dirty: false,
        saving: false,
        createdAt: sn.createdAt,
        updatedAt: sn.updatedAt,
      }));
    }
    return [];
  });

  // Tag popup state
  const [tagPopupIndex, setTagPopupIndex] = useState<number | null>(null);
  const [tagSearch, setTagSearch] = useState('');
  const [creatingTag, setCreatingTag] = useState(false);

  // Team member popup state
  const [tmPopupIndex, setTmPopupIndex] = useState<number | null>(null);
  const [tmSearch, setTmSearch] = useState('');

  // Bucket popup state
  const [bucketPopupIndex, setBucketPopupIndex] = useState<number | null>(null);

  const moveSubNoteBucketMutation = useMutation({
    mutationFn: ({ id, bucketId }: { id: number; bucketId: number | undefined }) =>
      subNotesApi.update(id, { bucketId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note', String(note?.id)] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
    onError: () => toast.error('Failed to update bucket'),
  });

  // Show/hide tags & assignees on subnote rows
  const [showMeta, setShowMeta] = useState(false);
  useKeyboard('m', () => setShowMeta((v) => !v), [], { modifier: 'alt' });

  // Toolbar menu state
  const [toolbarMenuOpen, setToolbarMenuOpen] = useState(false);

  // Move subnote popup state
  const [movePopupIndex, setMovePopupIndex] = useState<number | null>(null);
  const [moveNoteSearch, setMoveNoteSearch] = useState('');
  const [allNotes, setAllNotes] = useState<{ id: number; name: string }[]>([]);

  // Link subnote to another note popup state
  const [linkPopupIndex, setLinkPopupIndex] = useState<number | null>(null);
  const [linkNoteSearch, setLinkNoteSearch] = useState('');
  const [linkAllNotes, setLinkAllNotes] = useState<{ id: number; name: string }[]>([]);

  const tagPopupRef = useRef<HTMLDivElement>(null);
  const tmPopupRef = useRef<HTMLDivElement>(null);
  const movePopupRef = useRef<HTMLDivElement>(null);

  // Close popups on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (tagPopupRef.current && !tagPopupRef.current.contains(e.target as Node)) {
        setTagPopupIndex(null);
        setTagSearch('');
      }
      if (tmPopupRef.current && !tmPopupRef.current.contains(e.target as Node)) {
        setTmPopupIndex(null);
        setTmSearch('');
      }
      if (movePopupRef.current && !movePopupRef.current.contains(e.target as Node)) {
        setMovePopupIndex(null);
        setMoveNoteSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleCreateTag = async (tagName: string) => {
    setCreatingTag(true);
    try {
      const newTag = await tagsApi.create({ name: tagName });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast.success(`Tag "${tagName}" created`);
      return newTag;
    } catch {
      toast.error('Failed to create tag');
      return undefined;
    } finally {
      setCreatingTag(false);
    }
  };

  const handleCreateTeamMember = async (memberName: string) => {
    try {
      const newMember = await teamMembersApi.create({ name: memberName });
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      toast.success(`"${memberName}" added`);
      return newMember;
    } catch {
      toast.error('Failed to add member');
      return undefined;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedTags = getTags(tagIds);
    const tagNames = selectedTags.map((t) => t.name);

    const data: CreateNoteRequest | UpdateNoteRequest = {
      name,
      details,
      bucketId: bucketId || undefined,
      tagNames,
      teamMemberIds,
      nested,
      hotTopic,
      favorite,
    };

    if (!note && nested && subNotes.length > 0) {
      const subNotePayloads: CreateSubNoteRequest[] = subNotes.map((sn) => {
        const snTags = getTags(sn.tagIds);
        return {
          header: sn.header,
          description: sn.description || undefined,
          bucketId: sn.bucketId,
          hotTopic: sn.hotTopic,
          tagNames: snTags.map((t) => t.name),
          teamMemberIds: sn.teamMemberIds,
        };
      });
      (data as CreateNoteRequest).subNotes = subNotePayloads;
    }

    await onSubmit(data);
  };

  // --- SubNote CRUD ---
  const addSubNote = (snBucketId?: number) => {
    // Default to parent note's bucket, or first bucket if parent has none
    const defaultBucketId = snBucketId !== undefined ? snBucketId : (bucketId || sortedBuckets[0]?.id);
    const newSn = {
      header: '',
      description: '',
      bucketId: defaultBucketId,
      tagIds: [],
      teamMemberIds: [],
      hotTopic: false,
      descExpanded: true,
      dirty: true,
      saving: false,
    };
    setSubNotes((prev) => {
      // Insert at top of the matching bucket group
      const firstIdx = prev.findIndex((s) => s.bucketId == defaultBucketId);
      if (firstIdx === -1) return [newSn, ...prev];
      const next = [...prev];
      next.splice(firstIdx, 0, newSn);
      return next;
    });
    if (!nested) setNested(true);
  };

  const removeSubNote = async (index: number) => {
    const sn = subNotes[index];
    if (sn.id) {
      if (!confirm('Delete this subnote?')) return;
      try {
        await subNotesApi.delete(sn.id);
        queryClient.invalidateQueries({ queryKey: ['note', String(note?.id)] });
        queryClient.invalidateQueries({ queryKey: ['notes'] });
        toast.success('Subnote deleted');
      } catch {
        toast.error('Failed to delete');
        return;
      }
    }
    setSubNotes((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSubNote = (index: number, updates: Partial<SubNoteFormData>) => {
    setSubNotes((prev) =>
      prev.map((sn, i) => (i === index ? { ...sn, ...updates, dirty: true } : sn))
    );
  };

  const saveSubNote = async (index: number) => {
    const sn = subNotes[index];
    if (!sn.header.trim()) {
      toast.error('Title is required');
      return;
    }
    setSubNotes((prev) => prev.map((s, i) => (i === index ? { ...s, saving: true } : s)));
    const snTags = getTags(sn.tagIds);
    try {
      if (sn.id) {
        await subNotesApi.update(sn.id, {
          header: sn.header,
          description: sn.description || undefined,
          bucketId: sn.bucketId,
          hotTopic: sn.hotTopic,
          tagNames: snTags.map((t) => t.name),
          teamMemberIds: sn.teamMemberIds,
        });
      } else if (note?.id) {
        const created = await subNotesApi.create(note.id, {
          header: sn.header,
          description: sn.description || undefined,
          bucketId: sn.bucketId,
          hotTopic: sn.hotTopic,
          tagNames: snTags.map((t) => t.name),
          teamMemberIds: sn.teamMemberIds,
        });
        setSubNotes((prev) =>
          prev.map((s, i) => (i === index ? { ...s, id: created.id, dirty: false, saving: false } : s))
        );
        queryClient.invalidateQueries({ queryKey: ['note', String(note.id)] });
        queryClient.invalidateQueries({ queryKey: ['notes'] });
        toast.success('Subnote created');
        return;
      } else {
        setSubNotes((prev) => prev.map((s, i) => (i === index ? { ...s, saving: false } : s)));
        return;
      }
      setSubNotes((prev) => prev.map((s, i) => (i === index ? { ...s, dirty: false, saving: false } : s)));
      queryClient.invalidateQueries({ queryKey: ['note', String(note?.id)] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Saved');
    } catch {
      toast.error('Failed to save');
      setSubNotes((prev) => prev.map((s, i) => (i === index ? { ...s, saving: false } : s)));
    }
  };


  const moveSubNoteToNote = async (index: number, targetNoteId: number) => {
    const sn = subNotes[index];
    if (!sn.id) {
      toast.error('Save the subnote first before moving');
      return;
    }
    try {
      await subNotesApi.moveToNote(sn.id, targetNoteId);
      setSubNotes((prev) => prev.filter((_, i) => i !== index));
      queryClient.invalidateQueries({ queryKey: ['note', String(note?.id)] });
      queryClient.invalidateQueries({ queryKey: ['note', String(targetNoteId)] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Subnote moved');
      setMovePopupIndex(null);
    } catch {
      toast.error('Failed to move');
    }
  };

  // --- Convert subnote to a standalone note ---
  const convertSubNoteToNote = async (index: number) => {
    const sn = subNotes[index];
    if (!sn.id) {
      toast.error('Save the subnote first');
      return;
    }
    if (!confirm('Convert this subnote to a standalone note?')) return;
    try {
      await subNotesApi.convertToNote(sn.id);
      setSubNotes((prev) => prev.filter((_, i) => i !== index));
      queryClient.invalidateQueries({ queryKey: ['note', String(note?.id)] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Converted to note');
    } catch {
      toast.error('Failed to convert');
    }
  };

  // --- Link subnote to another note ---
  const openLinkPopup = async (index: number) => {
    setLinkPopupIndex(index);
    setLinkNoteSearch('');
    setTagPopupIndex(null);
    setTmPopupIndex(null);
    setMovePopupIndex(null);
    try {
      const { notesApi } = await import('@/api/notes');
      const notes = await notesApi.getAll();
      setLinkAllNotes(notes.filter((n) => n.id !== note?.id).map((n) => ({ id: n.id, name: n.name })));
    } catch {
      setLinkAllNotes([]);
    }
  };

  const linkSubNoteToNote = async (index: number, targetNoteId: number) => {
    const sn = subNotes[index];
    if (!sn.id) {
      toast.error('Save the subnote first before linking');
      return;
    }
    try {
      await subNotesApi.linkToNote(sn.id, targetNoteId);
      queryClient.invalidateQueries({ queryKey: ['note', String(note?.id)] });
      queryClient.invalidateQueries({ queryKey: ['note', String(targetNoteId)] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Subnote linked to another note');
      setLinkPopupIndex(null);
    } catch {
      toast.error('Failed to link');
    }
  };

  // --- Tag popup logic ---
  const openTagPopup = (index: number) => {
    setTagPopupIndex(index);
    setTagSearch('');
    setTmPopupIndex(null);
    setMovePopupIndex(null);
  };

  const toggleSubNoteTag = (index: number, tagId: number) => {
    const sn = subNotes[index];
    const newTagIds = sn.tagIds.includes(tagId)
      ? sn.tagIds.filter((id) => id !== tagId)
      : [...sn.tagIds, tagId];
    updateSubNote(index, { tagIds: newTagIds });
  };

  const createAndAddTag = async (index: number) => {
    const name = tagSearch.trim();
    if (!name) return;
    const newTag = await handleCreateTag(name);
    if (newTag) {
      const sn = subNotes[index];
      updateSubNote(index, { tagIds: [...sn.tagIds, newTag.id] });
      setTagSearch('');
    }
  };

  // --- Team member popup logic ---
  const openTmPopup = (index: number) => {
    setTmPopupIndex(index);
    setTmSearch('');
    setTagPopupIndex(null);
    setMovePopupIndex(null);
  };

  const toggleSubNoteTeamMember = (index: number, tmId: number) => {
    const sn = subNotes[index];
    const newIds = sn.teamMemberIds.includes(tmId)
      ? sn.teamMemberIds.filter((id) => id !== tmId)
      : [...sn.teamMemberIds, tmId];
    updateSubNote(index, { teamMemberIds: newIds });
  };

  // --- Move popup ---
  const openMovePopup = async (index: number) => {
    setMovePopupIndex(index);
    setMoveNoteSearch('');
    setTagPopupIndex(null);
    setTmPopupIndex(null);
    try {
      const { notesApi } = await import('@/api/notes');
      const notes = await notesApi.getAll();
      setAllNotes(notes.filter((n) => n.id !== note?.id).map((n) => ({ id: n.id, name: n.name })));
    } catch {
      setAllNotes([]);
    }
  };

  // --- Copy functions ---
  const copyTitles = () => {
    const titles = subNotes.map((sn) => sn.header).filter(Boolean).join('\n');
    navigator.clipboard.writeText(titles);
    toast.success('Titles copied');
  };

  const copyAll = () => {
    const content = subNotes
      .map((sn) => {
        let text = sn.header;
        if (sn.description) {
          const plain = sn.description
            .replace(/<br[^>]*>/gi, '\n')
            .replace(/<\/p>/gi, '\n')
            .replace(/<\/div>/gi, '\n')
            .replace(/<\/li>/gi, '\n')
            .replace(/<\/ul>/gi, '\n')
            .replace(/<\/ol>/gi, '\n')
            .replace(/<li[^>]*>/gi, '• ')
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
          if (plain) text += '\n' + plain;
        }
        return text;
      })
      .filter(Boolean)
      .join('\n\n');
    navigator.clipboard.writeText(content);
    toast.success('All content copied');
  };

  // --- Expand/Collapse All ---
  const expandAllDescs = () => {
    setSubNotes((prev) => prev.map((sn) => ({ ...sn, descExpanded: true })));
  };

  const collapseAllDescs = () => {
    setSubNotes((prev) => prev.map((sn) => ({ ...sn, descExpanded: false })));
  };

  // --- Focus/highlight subnote ---
  const [highlightedSubNoteId, setHighlightedSubNoteId] = useState<number | undefined>(focusSubNoteId);

  useEffect(() => {
    if (!focusSubNoteId) return;
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-subnote-id="${focusSubNoteId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 300);
    const fadeTimer = setTimeout(() => setHighlightedSubNoteId(undefined), 4000);
    return () => { clearTimeout(timer); clearTimeout(fadeTimer); };
  }, [focusSubNoteId]);

  // --- SubNote search ---
  const [subNoteSearch, setSubNoteSearch] = useState('');

  const filteredSubNoteIndices = useMemo(() => {
    if (!subNoteSearch.trim()) return subNotes.map((_, i) => i);
    const q = subNoteSearch.toLowerCase();
    return subNotes
      .map((sn, i) => {
        const titleMatch = sn.header.toLowerCase().includes(q);
        const descText = sn.description ? sn.description.replace(/<[^>]*>/g, '').toLowerCase() : '';
        const descMatch = descText.includes(q);
        return (titleMatch || descMatch) ? i : -1;
      })
      .filter((i) => i !== -1);
  }, [subNotes, subNoteSearch]);

  // --- File upload for subnotes ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileUploadSnIdx, setFileUploadSnIdx] = useState<number | 'note' | null>(null);

  const uploadFileMutation = useMutation({
    mutationFn: ({ file, noteId: nId, subNoteId }: { file: File; noteId?: number; subNoteId?: number }) => filesApi.upload(file, nId, subNoteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subnote-files'] });
      queryClient.invalidateQueries({ queryKey: ['note-files'] });
      toast.success('File uploaded');
    },
    onError: () => toast.error('File upload failed'),
  });

  const deleteFileMutation = useMutation({
    mutationFn: (fileId: number) => filesApi.delete(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subnote-files'] });
      queryClient.invalidateQueries({ queryKey: ['note-files'] });
      toast.success('File deleted');
    },
    onError: () => toast.error('Failed to delete file'),
  });

  const savedSubNoteIds = subNotes.filter((sn) => sn.id).map((sn) => sn.id!);
  const { data: subNoteFiles = {} } = useQuery({
    queryKey: ['subnote-files', ...savedSubNoteIds],
    queryFn: async () => {
      const result: Record<number, { id: number; originalFileName: string; fileSize: number }[]> = {};
      await Promise.all(
        savedSubNoteIds.map(async (snId) => {
          const files = await filesApi.getBySubNoteId(snId);
          if (files.length > 0) result[snId] = files;
        })
      );
      return result;
    },
    enabled: savedSubNoteIds.length > 0,
  });

  const { data: noteFiles = [] } = useQuery({
    queryKey: ['note-files', note?.id],
    queryFn: () => filesApi.getByNoteId(note!.id),
    enabled: !!note?.id,
  });

  const handleFileUploadClick = (snIdx: number | 'note') => {
    setFileUploadSnIdx(snIdx);
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && fileUploadSnIdx !== null) {
      if (fileUploadSnIdx === 'note') {
        if (note?.id) {
          uploadFileMutation.mutate({ file, noteId: note.id });
        } else {
          toast.error('Save the note first before attaching files');
        }
      } else {
        const sn = subNotes[fileUploadSnIdx];
        if (sn.id) {
          uploadFileMutation.mutate({ file, subNoteId: sn.id });
        } else {
          toast.error('Save subnote first before attaching files');
        }
      }
    }
    e.target.value = '';
  };

  // --- Note-level tag/team MultiSelect (using inline) ---
  const [noteTagOpen, setNoteTagOpen] = useState(false);
  const [noteTagSearch, setNoteTagSearch] = useState('');
  const [noteTmOpen, setNoteTmOpen] = useState(false);
  const [noteTmSearch, setNoteTmSearch] = useState('');
  const noteTagRef = useRef<HTMLDivElement>(null);
  const noteTmRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (noteTagRef.current && !noteTagRef.current.contains(e.target as Node)) {
        setNoteTagOpen(false);
        setNoteTagSearch('');
      }
      if (noteTmRef.current && !noteTmRef.current.contains(e.target as Node)) {
        setNoteTmOpen(false);
        setNoteTmSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredNoteTags = noteTagSearch
    ? tags.filter((t) => t.name.toLowerCase().includes(noteTagSearch.toLowerCase()))
    : tags;

  const showNoteCreateTag =
    noteTagSearch.trim() &&
    !tags.some((t) => t.name.toLowerCase() === noteTagSearch.trim().toLowerCase());

  const filteredNoteTm = noteTmSearch
    ? teamMembers.filter((t) => t.name.toLowerCase().includes(noteTmSearch.toLowerCase()))
    : teamMembers;

  const showNoteCreateTm =
    noteTmSearch.trim() &&
    !teamMembers.some((t) => t.name.toLowerCase() === noteTmSearch.trim().toLowerCase());

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileInputChange} />
      {/* Main note section */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Note title"
            required
            className="flex-1 text-lg font-semibold"
          />
          <button
            type="button"
            onClick={() => setFavorite(!favorite)}
            className={clsx('p-2 rounded-lg transition-colors', favorite ? 'bg-warning-50 dark:bg-warning-900/20' : 'hover:bg-gray-100 dark:hover:bg-gray-700')}
            title="Favorite"
          >
            <Star className={clsx('w-5 h-5 stroke-[2.5]', favorite ? 'fill-warning-400 text-warning-400' : 'text-gray-500 fill-none')} />
          </button>
          <button
            type="button"
            onClick={() => setHotTopic(!hotTopic)}
            className={clsx('p-2 rounded-lg transition-colors', hotTopic ? 'bg-danger-50 dark:bg-danger-900/20' : 'hover:bg-gray-100 dark:hover:bg-gray-700')}
            title="Hot Topic"
          >
            <Flame className={clsx('w-5 h-5 stroke-[2.5]', hotTopic ? 'fill-danger-400 text-danger-500' : 'text-gray-500 fill-none')} />
          </button>
          {note && (
            <button
              type="button"
              onClick={() => handleFileUploadClick('note')}
              className="p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Attach file to note"
            >
              <Paperclip className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>

        {/* Compact Metadata Row */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Bucket */}
          <div className="flex items-center gap-1">
            <span className="text-gray-500 dark:text-gray-400">Bucket:</span>
            <select
              value={bucketId || ''}
              onChange={(e) => setBucketId(e.target.value ? Number(e.target.value) : undefined)}
              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-primary-500 outline-none"
            >
              <option value="">None</option>
              {sortedBuckets.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div className="relative flex items-center gap-1" ref={noteTagRef}>
            <span className="text-gray-500 dark:text-gray-400">Tags:</span>
            <div
              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded cursor-pointer bg-white dark:bg-gray-800 flex items-center gap-1"
              onClick={() => setNoteTagOpen(true)}
            >
              {getTags(tagIds).length > 0 ? (
                <span className="text-xs font-medium text-primary-600 dark:text-primary-400">{getTags(tagIds).length}</span>
              ) : (
                <span className="text-gray-400 text-xs">+</span>
              )}
            </div>
            {noteTagOpen && (
              <div className="absolute z-50 top-full left-0 mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                <div className="p-2 flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700">
                  {getTags(tagIds).map((t) => (
                    <span key={t.id} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300">
                      {t.name}
                      <button type="button" onClick={(e) => { e.stopPropagation(); setTagIds(tagIds.filter((id) => id !== t.id)); }} className="hover:bg-black/10 rounded-full p-0.5">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  value={noteTagSearch}
                  onChange={(e) => setNoteTagSearch(e.target.value)}
                  className="w-full px-2 py-1.5 border-b border-gray-200 dark:border-gray-700 outline-none bg-transparent text-xs dark:text-gray-100"
                  placeholder="Search or create..."
                  autoFocus
                />
                {showNoteCreateTag && (
                  <div
                    className="px-2 py-1.5 cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/20 flex items-center gap-1.5 text-primary-600 dark:text-primary-400 border-b border-gray-100 dark:border-gray-700 text-xs"
                    onClick={async () => {
                      const newTag = await handleCreateTag(noteTagSearch.trim());
                      if (newTag) { setTagIds([...tagIds, newTag.id]); setNoteTagSearch(''); }
                    }}
                  >
                    <Plus className="w-3 h-3" />
                    <span>Create "{noteTagSearch.trim()}"</span>
                  </div>
                )}
                {filteredNoteTags.map((t) => (
                  <div
                    key={t.id}
                    className={clsx('px-2 py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-1.5 text-xs border-b border-gray-50 dark:border-gray-700/50 last:border-0', tagIds.includes(t.id) && 'bg-primary-50 dark:bg-primary-900/20')}
                    onClick={() => setTagIds(tagIds.includes(t.id) ? tagIds.filter((id) => id !== t.id) : [...tagIds, t.id])}
                  >
                    <input type="checkbox" checked={tagIds.includes(t.id)} onChange={() => {}} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-3.5 h-3.5" />
                    <span>{t.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assignees */}
          <div className="relative flex items-center gap-1" ref={noteTmRef}>
            <span className="text-gray-500 dark:text-gray-400">Assignees:</span>
            <div
              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded cursor-pointer bg-white dark:bg-gray-800 flex items-center gap-1"
              onClick={() => setNoteTmOpen(true)}
            >
              {getTeamMembers(teamMemberIds).length > 0 ? (
                <span className="text-xs font-medium text-primary-600 dark:text-primary-400">{getTeamMembers(teamMemberIds).length}</span>
              ) : (
                <span className="text-gray-400 text-xs">+</span>
              )}
            </div>
            {noteTmOpen && (
              <div className="absolute z-50 top-full left-0 mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                <div className="p-2 flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700">
                  {getTeamMembers(teamMemberIds).map((m) => (
                    <span key={m.id} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                      {m.name}
                      <button type="button" onClick={(e) => { e.stopPropagation(); setTeamMemberIds(teamMemberIds.filter((id) => id !== m.id)); }} className="hover:bg-black/10 rounded-full p-0.5">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  value={noteTmSearch}
                  onChange={(e) => setNoteTmSearch(e.target.value)}
                  className="w-full px-2 py-1.5 border-b border-gray-200 dark:border-gray-700 outline-none bg-transparent text-xs dark:text-gray-100"
                  placeholder="Search or add..."
                  autoFocus
                />
                {showNoteCreateTm && (
                  <div
                    className="px-2 py-1.5 cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/20 flex items-center gap-1.5 text-primary-600 dark:text-primary-400 border-b border-gray-100 dark:border-gray-700 text-xs"
                    onClick={async () => {
                      const newM = await handleCreateTeamMember(noteTmSearch.trim());
                      if (newM) { setTeamMemberIds([...teamMemberIds, newM.id]); setNoteTmSearch(''); }
                    }}
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add "{noteTmSearch.trim()}"</span>
                  </div>
                )}
                {filteredNoteTm.map((m) => (
                  <div
                    key={m.id}
                    className={clsx('px-2 py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-1.5 text-xs border-b border-gray-50 dark:border-gray-700/50 last:border-0', teamMemberIds.includes(m.id) && 'bg-primary-50 dark:bg-primary-900/20')}
                    onClick={() => setTeamMemberIds(teamMemberIds.includes(m.id) ? teamMemberIds.filter((id) => id !== m.id) : [...teamMemberIds, m.id])}
                  >
                    <input type="checkbox" checked={teamMemberIds.includes(m.id)} onChange={() => {}} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-3.5 h-3.5" />
                    <span>{m.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Nested toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer ml-auto">
            <input
              type="checkbox"
              checked={nested}
              onChange={(e) => {
                const becomingNested = e.target.checked;
                if (becomingNested && details && details.trim() && details !== '<p><br></p>' && subNotes.length === 0) {
                  setSubNotes([{
                    id: Date.now(),
                    header: 'General',
                    description: details,
                    bucketId: undefined,
                    tagIds: [],
                    teamMemberIds: [],
                    hotTopic: false,
                    descExpanded: true,
                    dirty: true,
                    saving: false,
                  }]);
                  setDetails('');
                }
                setNested(becomingNested);
              }}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-3.5 h-3.5"
            />
            <span className="text-gray-600 dark:text-gray-400 text-xs">SubNotes</span>
          </label>
        </div>

        {/* Display applied metadata */}
        {(bucketId || tagIds.length > 0 || teamMemberIds.length > 0) && (
          <div className="flex items-center gap-2 flex-wrap text-xs bg-blue-50/50 dark:bg-blue-900/10 px-3 py-2 rounded border border-blue-100 dark:border-blue-900/30">
            {bucketId && (
              <div className="flex items-center gap-1">
                <span className="text-gray-500 dark:text-gray-400">In:</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${getBucket(bucketId)?.color}20`, color: getBucket(bucketId)?.color }}>
                  {getBucket(bucketId)?.name}
                </span>
              </div>
            )}
            {tagIds.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-gray-500 dark:text-gray-400">Tags:</span>
                {getTags(tagIds).map((t) => (
                  <span key={t.id} className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
                    {t.name}
                  </span>
                ))}
              </div>
            )}
            {teamMemberIds.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-gray-500 dark:text-gray-400">Team:</span>
                {getTeamMembers(teamMemberIds).map((m) => (
                  <span key={m.id} className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    {m.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Rich text content - only for non-nested notes */}
        {!nested && (
          <RichTextEditor content={details} onChange={setDetails} placeholder="Note content..." />
        )}


        {/* Note-level file attachments */}
        {note && noteFiles.length > 0 && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Files ({noteFiles.length})</span>
              </div>
              <button
                type="button"
                onClick={() => handleFileUploadClick('note')}
                className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Upload
              </button>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {noteFiles.map((f) => (
                <span key={f.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800">
                  <a href={filesApi.getDownloadUrl(f.id)} target="_blank" rel="noopener noreferrer" className="hover:underline" title="Click to download">
                    {f.originalFileName}
                  </a>
                  <button type="button" onClick={() => { if (confirm('Delete this file?')) deleteFileMutation.mutate(f.id); }} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 ml-0.5" title="Delete file">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SubNotes section - bucket grouped */}
      {nested && (
        <div className="space-y-3">
          {/* Toolbar — Compact */}
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              SubNotes <span className="text-gray-400 font-normal">({subNotes.length})</span>
            </h3>
            <div className="flex items-center gap-1.5">
              {subNotes.length > 0 && (
                <>
                  <button type="button" onClick={expandAllDescs} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400" title="Expand All">
                    <ChevronsDown className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={collapseAllDescs} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400" title="Collapse All">
                    <ChevronsUp className="w-4 h-4" />
                  </button>
                  {/* More menu */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setToolbarMenuOpen(!toolbarMenuOpen)}
                      className={clsx('p-1.5 rounded', toolbarMenuOpen ? 'bg-gray-100 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400')}
                      title="More options"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {toolbarMenuOpen && (
                      <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-40">
                        <button
                          type="button"
                          onClick={() => { copyTitles(); setToolbarMenuOpen(false); }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700"
                          title="Copy Titles Only"
                        >
                          <Copy className="w-3.5 h-3.5" /> Copy Titles
                        </button>
                        <button
                          type="button"
                          onClick={() => { copyAll(); setToolbarMenuOpen(false); }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700"
                          title="Copy Titles + Descriptions"
                        >
                          <ClipboardList className="w-3.5 h-3.5" /> Copy All
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowMeta((v) => !v); setToolbarMenuOpen(false); }}
                          className={clsx('w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2', showMeta ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300')}
                          title={showMeta ? 'Hide tags & assignees' : 'Show tags & assignees'}
                        >
                          {showMeta ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          {showMeta ? 'Hide Meta' : 'Show Meta'}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
              <Button type="button" variant="secondary" size="sm" onClick={() => addSubNote()}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add SubNote
              </Button>
            </div>
          </div>

          {/* SubNote search */}
          {subNotes.length > 2 && (
            <div className="relative">
              <input
                type="text"
                value={subNoteSearch}
                onChange={(e) => setSubNoteSearch(e.target.value)}
                placeholder="Search subnotes..."
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-primary-500 outline-none"
              />
              {subNoteSearch && (
                <button
                  type="button"
                  onClick={() => setSubNoteSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Subnote list — grouped by bucket */}
          {filteredSubNoteIndices.length === 0 && subNotes.length > 0 && (
            <div className="px-4 py-3 text-sm text-gray-400 italic">No subnotes match your search</div>
          )}
          {(() => {
            const sortedBkts = [...buckets].sort((a, b) => a.priority - b.priority);
            const groups = new Map<number | 'unassigned', number[]>();
            filteredSubNoteIndices.forEach((snIdx) => {
              const key = subNotes[snIdx].bucketId ?? 'unassigned';
              if (!groups.has(key)) groups.set(key, []);
              groups.get(key)!.push(snIdx);
            });
            // Sort each group: newest (updatedAt desc, fallback createdAt) first; unsaved (no id) float to top
            groups.forEach((indices, key) => {
              indices.sort((a, b) => {
                const ta = subNotes[a].updatedAt ? Date.parse(subNotes[a].updatedAt!) : Infinity;
                const tb = subNotes[b].updatedAt ? Date.parse(subNotes[b].updatedAt!) : Infinity;
                return tb - ta;
              });
              groups.set(key, indices);
            });

            const renderCard = (snIdx: number) => {
              const sn = subNotes[snIdx];
              const snResolvedTags = getTags(sn.tagIds);
              const snResolvedTm = getTeamMembers(sn.teamMemberIds);
              const snBucket = getBucket(sn.bucketId);
              const borderColor = snBucket?.color || '#9ca3af';
              const snFiles = sn.id ? (subNoteFiles[sn.id] || []) : [];
              const snOwnTagIdSet = new Set(sn.tagIds);
              const snResolvedInheritedTags = getTags(tagIds.filter((id) => !snOwnTagIdSet.has(id)));

              return (
                <div
                  key={snIdx}
                  data-subnote-id={sn.id}
                  className={clsx(
                    'rounded-lg transition-all duration-500',
                    sn.hotTopic && 'bg-danger-50/20 dark:bg-danger-900/10',
                    sn.descExpanded && 'shadow-md',
                    highlightedSubNoteId && sn.id === highlightedSubNoteId && 'ring-2 ring-primary-400 bg-primary-50/40 dark:bg-primary-900/20'
                  )}
                  style={{
                    border: `${sn.descExpanded ? '3px' : '2px'} solid ${borderColor}`,
                    borderLeftWidth: '4px',
                  }}
                >
                  {/* Title row: expand arrow + flame + title + top-right icons */}
                  <div className="flex items-start gap-1.5 px-3 py-1">
                    <button
                      type="button"
                      onClick={() => updateSubNote(snIdx, { descExpanded: !sn.descExpanded })}
                      className="flex-shrink-0 p-0.5 text-gray-400 hover:text-gray-600 mt-0.5"
                    >
                      {sn.descExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSubNote(snIdx, { hotTopic: !sn.hotTopic })}
                      className="flex-shrink-0 p-0.5 mt-0.5"
                      title="Toggle Hot Topic"
                    >
                      <Flame className={clsx('w-3.5 h-3.5 stroke-[2.5]', sn.hotTopic ? 'fill-danger-400 text-danger-500' : 'text-gray-400 fill-none hover:text-gray-600')} />
                    </button>

                    <textarea
                      value={sn.header}
                      onChange={(e) => updateSubNote(snIdx, { header: e.target.value })}
                      placeholder="SubNote title..."
                      rows={1}
                      className="flex-1 min-w-0 text-sm font-semibold bg-transparent border-none focus:ring-0 px-1 py-0 resize-none overflow-hidden outline-none dark:text-gray-100"
                      onInput={(e) => {
                        const el = e.currentTarget;
                        el.style.height = 'auto';
                        el.style.height = Math.min(80, el.scrollHeight) + 'px';
                      }}
                    />

                    {/* Top-right icons */}
                    <div className="flex items-center gap-0.5 flex-shrink-0 mt-0.5">
                      <button
                        type="button"
                        onClick={() => tagPopupIndex === snIdx ? setTagPopupIndex(null) : openTagPopup(snIdx)}
                        className={clsx('p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600', sn.tagIds.length > 0 ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400')}
                        title="Edit tags"
                      >
                        <Tag className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => tmPopupIndex === snIdx ? setTmPopupIndex(null) : openTmPopup(snIdx)}
                        className={clsx('p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600', sn.teamMemberIds.length > 0 ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400')}
                        title="Edit assignees"
                      >
                        <Users className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setBucketPopupIndex(bucketPopupIndex === snIdx ? null : snIdx)}
                        className={clsx('p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600', sn.bucketId ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400')}
                        title="Change bucket"
                      >
                        <Layers className="w-3.5 h-3.5" />
                      </button>
                      {note && sn.id && (
                        <button
                          type="button"
                          onClick={() => movePopupIndex === snIdx ? setMovePopupIndex(null) : openMovePopup(snIdx)}
                          className="p-1 rounded text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-600"
                          title="Move to another note"
                        >
                          <MoveRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {note && sn.id && (
                        <button
                          type="button"
                          onClick={() => convertSubNoteToNote(snIdx)}
                          className="p-1 rounded text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-600"
                          title="Convert to note"
                        >
                          <FileUp className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {note && sn.id && (
                        <button
                          type="button"
                          onClick={() => linkPopupIndex === snIdx ? setLinkPopupIndex(null) : openLinkPopup(snIdx)}
                          className="p-1 rounded text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-600"
                          title="Link to another note"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {note && (
                        <button
                          type="button"
                          onClick={() => saveSubNote(snIdx)}
                          disabled={sn.saving}
                          className={clsx(
                            'p-1 rounded',
                            sn.dirty ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400 hover:bg-success-200' : 'text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                          )}
                          title="Save subnote"
                        >
                          <Save className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {sn.id && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleFileUploadClick(snIdx); }}
                          className="p-1 rounded text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-600"
                          title="Attach file"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeSubNote(snIdx)}
                        className="p-1 rounded text-gray-400 hover:bg-danger-100 dark:hover:bg-danger-900/30 hover:text-danger-600"
                        title="Delete subnote"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>


                  {/* Tags, assignees, files — shown only when showMeta is on */}
                  {showMeta && (snResolvedTags.length > 0 || snResolvedInheritedTags.length > 0 || snResolvedTm.length > 0 || snFiles.length > 0) && (
                    <div className="flex items-center gap-1.5 px-3 pb-2 flex-wrap">
                      {snResolvedTags.map((t) => (
                        <span key={t.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {t.name}
                          <button type="button" onClick={() => toggleSubNoteTag(snIdx, t.id)} className="hover:bg-black/10 rounded-full p-0.5">
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      ))}
                      {snResolvedInheritedTags.map((t) => (
                        <span key={`inh-${t.id}`} className="px-2 py-0.5 text-[11px] rounded-full bg-gray-100 dark:bg-gray-700/50 text-gray-400 dark:text-gray-500 font-normal border border-dashed border-gray-300 dark:border-gray-600 italic" title="Inherited from parent note">
                          {t.name}
                        </span>
                      ))}
                      {snResolvedTm.map((m) => (
                        <span key={m.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          {m.name}
                          <button type="button" onClick={() => toggleSubNoteTeamMember(snIdx, m.id)} className="hover:bg-black/10 rounded-full p-0.5">
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      ))}
                      {snFiles.map((f) => (
                        <span key={f.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800">
                          <a href={filesApi.getDownloadUrl(f.id)} target="_blank" rel="noopener noreferrer" className="hover:underline" title="Click to download">
                            {f.originalFileName}
                          </a>
                          <button type="button" onClick={() => { if (confirm('Delete this file?')) deleteFileMutation.mutate(f.id); }} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 ml-0.5" title="Delete file">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Expanded description */}
                  {sn.descExpanded && (
                    <div className="px-3 pb-3 pt-2 border-t-2 border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-900/20 rounded-b-lg">
                      <RichTextEditor
                        content={sn.description}
                        onChange={(val) => updateSubNote(snIdx, { description: val })}
                        placeholder="SubNote description..."
                        compact
                      />
                    </div>
                  )}
                </div>
              );
            }; // end renderCard

            return (
              <div className="space-y-3">
                {sortedBkts.map((b) => {
                  const indices = groups.get(b.id) || [];
                  return (
                    <fieldset key={b.id} className="rounded-lg" style={{ border: `2px solid ${b.color}` }}>
                      <legend className="ml-3 px-2 flex items-center gap-1.5">
                        <span className="text-xs font-semibold" style={{ color: b.color }}>{b.name}</span>
                        <button
                          type="button"
                          onClick={() => addSubNote(b.id)}
                          className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                          title={`Add subnote to ${b.name}`}
                        >
                          <Plus className="w-3.5 h-3.5" style={{ color: b.color }} />
                        </button>
                      </legend>
                      <div className="space-y-2 p-1">
                        {indices.map((snIdx) => renderCard(snIdx))}
                      </div>
                    </fieldset>
                  );
                })}
                {/* Unassigned */}
                {(() => {
                  const indices = groups.get('unassigned') || [];
                  return (
                    <fieldset className="rounded-lg border-2 border-gray-300 dark:border-gray-600">
                      <legend className="ml-3 px-2 flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Unassigned</span>
                        <button
                          type="button"
                          onClick={() => addSubNote(undefined)}
                          className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
                          title="Add unassigned subnote"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </legend>
                      <div className="space-y-2 p-1">
                        {indices.map((snIdx) => renderCard(snIdx))}
                      </div>
                    </fieldset>
                  );
                })()}
              </div>
            );
          })()}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={isLoading}>
          {isLoading ? 'Saving...' : note ? 'Update Note' : 'Create Note'}
        </Button>
      </div>
      {/* ===== Centered Modal: Tags ===== */}
      {tagPopupIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setTagPopupIndex(null)}>
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Edit Tags — {subNotes[tagPopupIndex]?.header || 'SubNote'}</h3>
              <button type="button" onClick={() => setTagPopupIndex(null)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-4">
              <div className="flex flex-wrap gap-1.5 items-center w-full min-h-[40px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-900 focus-within:ring-2 focus-within:ring-primary-500 mb-3">
                {getTags(subNotes[tagPopupIndex]?.tagIds || []).map((t) => (
                  <span key={t.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300">
                    {t.name}
                    <button type="button" onClick={() => toggleSubNoteTag(tagPopupIndex, t.id)} className="hover:bg-black/10 rounded-full p-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  className="flex-1 min-w-[100px] outline-none bg-transparent text-sm dark:text-gray-100"
                  placeholder="Search or create tags..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && tagSearch.trim() && !tags.some((t) => t.name.toLowerCase() === tagSearch.trim().toLowerCase())) {
                      e.preventDefault();
                      createAndAddTag(tagPopupIndex);
                    }
                  }}
                />
              </div>
              <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                {tagSearch.trim() && !tags.some((t) => t.name.toLowerCase() === tagSearch.trim().toLowerCase()) && (
                  <div
                    className="px-4 py-2.5 cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/20 flex items-center gap-2 text-primary-600 dark:text-primary-400 text-sm border-b border-gray-100 dark:border-gray-700"
                    onClick={() => createAndAddTag(tagPopupIndex)}
                  >
                    <Plus className="w-4 h-4" />
                    <span className="font-medium">{creatingTag ? 'Creating...' : `Create "${tagSearch.trim()}"`}</span>
                  </div>
                )}
                {(tagSearch ? tags.filter((t) => t.name.toLowerCase().includes(tagSearch.toLowerCase())) : tags).map((t) => (
                  <div
                    key={t.id}
                    className={clsx('px-4 py-2.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0', subNotes[tagPopupIndex]?.tagIds.includes(t.id) && 'bg-primary-50 dark:bg-primary-900/20')}
                    onClick={() => toggleSubNoteTag(tagPopupIndex, t.id)}
                  >
                    <input type="checkbox" checked={subNotes[tagPopupIndex]?.tagIds.includes(t.id) || false} onChange={() => {}} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    <span className="text-sm text-gray-900 dark:text-gray-100">{t.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Centered Modal: Assignees ===== */}
      {tmPopupIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setTmPopupIndex(null)}>
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Edit Team — {subNotes[tmPopupIndex]?.header || 'SubNote'}</h3>
              <button type="button" onClick={() => setTmPopupIndex(null)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-4">
              <div className="flex flex-wrap gap-1.5 items-center w-full min-h-[40px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-900 focus-within:ring-2 focus-within:ring-primary-500 mb-3">
                {getTeamMembers(subNotes[tmPopupIndex]?.teamMemberIds || []).map((m) => (
                  <span key={m.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                    {m.name}
                    <button type="button" onClick={() => toggleSubNoteTeamMember(tmPopupIndex, m.id)} className="hover:bg-black/10 rounded-full p-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tmSearch}
                  onChange={(e) => setTmSearch(e.target.value)}
                  className="flex-1 min-w-[100px] outline-none bg-transparent text-sm dark:text-gray-100"
                  placeholder="Search or add members..."
                  autoFocus
                />
              </div>
              <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                {tmSearch.trim() && !teamMembers.some((m) => m.name.toLowerCase() === tmSearch.trim().toLowerCase()) && (
                  <div
                    className="px-4 py-2.5 cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/20 flex items-center gap-2 text-primary-600 dark:text-primary-400 text-sm border-b border-gray-100 dark:border-gray-700"
                    onClick={async () => {
                      const newM = await handleCreateTeamMember(tmSearch.trim());
                      if (newM) { toggleSubNoteTeamMember(tmPopupIndex, newM.id); setTmSearch(''); }
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    <span className="font-medium">Add "{tmSearch.trim()}"</span>
                  </div>
                )}
                {(tmSearch ? teamMembers.filter((m) => m.name.toLowerCase().includes(tmSearch.toLowerCase())) : teamMembers).map((m) => (
                  <div
                    key={m.id}
                    className={clsx('px-4 py-2.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0', subNotes[tmPopupIndex]?.teamMemberIds.includes(m.id) && 'bg-primary-50 dark:bg-primary-900/20')}
                    onClick={() => toggleSubNoteTeamMember(tmPopupIndex, m.id)}
                  >
                    <input type="checkbox" checked={subNotes[tmPopupIndex]?.teamMemberIds.includes(m.id) || false} onChange={() => {}} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    <span className="text-sm text-gray-900 dark:text-gray-100">{m.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Bucket change modal ===== */}
      {bucketPopupIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setBucketPopupIndex(null)}>
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Change Bucket — {subNotes[bucketPopupIndex]?.header || 'SubNote'}</h3>
              <button type="button" onClick={() => setBucketPopupIndex(null)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-4">
              {subNotes[bucketPopupIndex]?.bucketId && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {buckets.filter((b) => b.id === subNotes[bucketPopupIndex]?.bucketId).map((b) => (
                    <span key={b.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: `${b.color}20`, color: b.color }}>
                      <span className="w-2 h-2 rounded" style={{ backgroundColor: b.color }} />
                      {b.name}
                    </span>
                  ))}
                </div>
              )}
              <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                <div
                  className={clsx('px-4 py-2.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 border-b border-gray-50 dark:border-gray-700/50', !subNotes[bucketPopupIndex]?.bucketId && 'bg-primary-50 dark:bg-primary-900/20')}
                  onClick={() => {
                    const sn = subNotes[bucketPopupIndex];
                    updateSubNote(bucketPopupIndex, { bucketId: undefined });
                    if (sn?.id) moveSubNoteBucketMutation.mutate({ id: sn.id, bucketId: undefined });
                    setBucketPopupIndex(null);
                  }}
                >
                  <span className="w-3 h-3 rounded bg-gray-300" />
                  <span className="text-sm text-gray-900 dark:text-gray-100">None</span>
                </div>
                {[...buckets].sort((a, b) => a.priority - b.priority).map((b) => (
                  <div
                    key={b.id}
                    className={clsx('px-4 py-2.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0', subNotes[bucketPopupIndex]?.bucketId === b.id && 'bg-primary-50 dark:bg-primary-900/20')}
                    onClick={() => {
                      const sn = subNotes[bucketPopupIndex];
                      updateSubNote(bucketPopupIndex, { bucketId: b.id });
                      if (sn?.id) moveSubNoteBucketMutation.mutate({ id: sn.id, bucketId: b.id });
                      setBucketPopupIndex(null);
                    }}
                  >
                    <span className="w-3 h-3 rounded flex-shrink-0" style={{ backgroundColor: b.color }} />
                    <span className="text-sm text-gray-900 dark:text-gray-100">{b.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Centered Modal: Move to Note ===== */}
      {movePopupIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setMovePopupIndex(null)}>
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Move "{subNotes[movePopupIndex]?.header || 'SubNote'}" to Note</h3>
              <button type="button" onClick={() => setMovePopupIndex(null)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-4">
              <input
                type="text"
                value={moveNoteSearch}
                onChange={(e) => setMoveNoteSearch(e.target.value)}
                placeholder="Search notes..."
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none mb-3"
                autoFocus
              />
              <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                {(moveNoteSearch ? allNotes.filter((n) => n.name.toLowerCase().includes(moveNoteSearch.toLowerCase())) : allNotes).map((n) => (
                  <div
                    key={n.id}
                    className="px-4 py-2.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 border-b border-gray-50 dark:border-gray-700/50 last:border-0"
                    onClick={() => moveSubNoteToNote(movePopupIndex, n.id)}
                  >
                    {n.name}
                  </div>
                ))}
                {allNotes.length === 0 && (
                  <div className="px-4 py-3 text-sm text-gray-400 text-center">No other notes found</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Centered Modal: Link to Note (share subnote) ===== */}
      {linkPopupIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setLinkPopupIndex(null)}>
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Link "{subNotes[linkPopupIndex]?.header || 'SubNote'}" to Another Note</h3>
              <button type="button" onClick={() => setLinkPopupIndex(null)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">This will share the subnote with another parent note. It will appear in both notes.</p>
              <input
                type="text"
                value={linkNoteSearch}
                onChange={(e) => setLinkNoteSearch(e.target.value)}
                placeholder="Search notes..."
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none mb-3"
                autoFocus
              />
              <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                {(linkNoteSearch ? linkAllNotes.filter((n) => n.name.toLowerCase().includes(linkNoteSearch.toLowerCase())) : linkAllNotes).map((n) => (
                  <div
                    key={n.id}
                    className="px-4 py-2.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 border-b border-gray-50 dark:border-gray-700/50 last:border-0"
                    onClick={() => linkSubNoteToNote(linkPopupIndex, n.id)}
                  >
                    {n.name}
                  </div>
                ))}
                {linkAllNotes.length === 0 && (
                  <div className="px-4 py-3 text-sm text-gray-400 text-center">No other notes found</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
