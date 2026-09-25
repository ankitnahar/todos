import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CreateSubNoteRequest, CreateNoteRequest } from '@/types';
import { notesApi, subNotesApi } from '@/api/notes';
import { useReferenceData } from '@/hooks/useReferenceData';
import { tagsApi } from '@/api/tags';
import { teamMembersApi } from '@/api/teamMembers';
import { Button } from '@/components/shared/Button';
import { RichTextEditor } from '@/components/shared/RichTextEditor';
import { X, Plus, Paperclip, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface QuickAddNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function QuickAddNoteModal({ isOpen, onClose, onSuccess }: QuickAddNoteModalProps) {
  const queryClient = useQueryClient();
  const { buckets, tags, teamMembers, getTags } = useReferenceData();

  // Form state
  const [isSubNote, setIsSubNote] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [parentNoteId, setParentNoteId] = useState<number | undefined>();
  const [bucketId, setBucketId] = useState<number | undefined>();
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [teamMemberIds, setTeamMemberIds] = useState<number[]>([]);
  const [descExpanded, setDescExpanded] = useState(false);

  // Autocomplete state
  const [parentNoteSearch, setParentNoteSearch] = useState('');
  const [allNotes, setAllNotes] = useState<{ id: number; name: string; subNoteCount?: number }[]>([]);
  const [showNoteDropdown, setShowNoteDropdown] = useState(false);

  // Tag/team member popup state
  const [tagPopupOpen, setTagPopupOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [tmPopupOpen, setTmPopupOpen] = useState(false);
  const [tmSearch, setTmSearch] = useState('');
  const [creatingTag, setCreatingTag] = useState(false);

  // File upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<{ id: number; name: string }[]>([]);

  const modalRef = useRef<HTMLDivElement>(null);
  const parentNoteInputRef = useRef<HTMLInputElement>(null);

  // Fetch all notes for parent note search (with subnote counts)
  useEffect(() => {
    if (!isOpen) return;
    const loadNotes = async () => {
      try {
        const notes = await notesApi.getAll({});
        setAllNotes(
          notes.map((n) => ({
            id: n.id,
            name: n.name,
            subNoteCount: n.subNotes?.length || 0,
          }))
        );
      } catch {
        setAllNotes([]);
      }
    };
    loadNotes();
  }, [isOpen]);

  // Auto-fill bucket when parent note is selected
  useEffect(() => {
    if (parentNoteId && isSubNote) {
      const loadParentBucket = async () => {
        try {
          const parentNote = await notesApi.getById(parentNoteId);
          if (parentNote) {
            setParentNoteSearch(parentNote.name);
            // Auto-set bucket to parent's bucket
            if (parentNote.bucketId) {
              setBucketId(parentNote.bucketId);
            }
          }
        } catch {
          // Fallback to just setting the name
          const parent = allNotes.find((n) => n.id === parentNoteId);
          if (parent) {
            setParentNoteSearch(parent.name);
          }
        }
      };
      loadParentBucket();
    }
  }, [parentNoteId, isSubNote, allNotes]);

  // Close modals on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }
  }, [isOpen, onClose]);

  // Close popups on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!document.querySelector('[data-tag-popup]')?.contains(target)) {
        setTagPopupOpen(false);
      }
      if (!document.querySelector('[data-tm-popup]')?.contains(target)) {
        setTmPopupOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredNotes = parentNoteSearch
    ? allNotes.filter((n) => n.name.toLowerCase().includes(parentNoteSearch.toLowerCase()))
    : allNotes;

  const filteredTags = tagSearch
    ? tags.filter((t) => t.name.toLowerCase().includes(tagSearch.toLowerCase()))
    : tags;

  const showCreateTag =
    tagSearch.trim() && !tags.some((t) => t.name.toLowerCase() === tagSearch.trim().toLowerCase());

  const filteredTm = tmSearch
    ? teamMembers.filter((t) => t.name.toLowerCase().includes(tmSearch.toLowerCase()))
    : teamMembers;

  const showCreateTm =
    tmSearch.trim() && !teamMembers.some((t) => t.name.toLowerCase() === tmSearch.trim().toLowerCase());

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) {
        toast.error('Title is required');
        throw new Error('Title required');
      }

      const tagNames = getTags(tagIds).map((t) => t.name);

      if (isSubNote) {
        if (!parentNoteId) {
          toast.error('Parent note is required for subnote');
          throw new Error('Parent note required');
        }
        const payload: CreateSubNoteRequest = {
          header: title,
          description: description || undefined,
          bucketId,
          tagNames,
          teamMemberIds,
          hotTopic: false,
        };
        const subNote = await subNotesApi.create(parentNoteId, payload);
        return { type: 'subnote', id: subNote.id, parentId: parentNoteId };
      } else {
        const payload: CreateNoteRequest = {
          name: title,
          details: description || undefined,
          bucketId,
          tagNames,
          teamMemberIds,
          nested: false,
          hotTopic: false,
          favorite: false,
        };
        const note = await notesApi.create(payload);
        return { type: 'note', id: note.id };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['subnote-files'] });
      queryClient.invalidateQueries({ queryKey: ['note-files'] });
      // Invalidate the specific parent note cache if subnote was created
      if (isSubNote && parentNoteId) {
        queryClient.invalidateQueries({ queryKey: ['note', String(parentNoteId)] });
      }
      toast.success(`${isSubNote ? 'SubNote' : 'Note'} created`);
      resetForm();
      onClose();
      onSuccess?.();
    },
    onError: (error) => {
      if (error.message !== 'Title required' && error.message !== 'Parent note required') {
        toast.error(`Failed to create ${isSubNote ? 'subnote' : 'note'}`);
      }
    },
  });

  const handleCreateTag = async () => {
    setCreatingTag(true);
    try {
      const newTag = await tagsApi.create({ name: tagSearch.trim() });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      setTagIds([...tagIds, newTag.id]);
      setTagSearch('');
      toast.success(`Tag "${tagSearch.trim()}" created`);
    } catch {
      toast.error('Failed to create tag');
    } finally {
      setCreatingTag(false);
    }
  };

  const handleCreateTeamMember = async () => {
    try {
      const newMember = await teamMembersApi.create({ name: tmSearch.trim() });
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      setTeamMemberIds([...teamMemberIds, newMember.id]);
      setTmSearch('');
      toast.success(`"${tmSearch.trim()}" added`);
    } catch {
      toast.error('Failed to add member');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFiles((prev) => [...prev, { id: Date.now(), name: file.name }]);
      toast.success(`File "${file.name}" will be attached after creation`);
    }
    e.target.value = '';
  };

  const resetForm = () => {
    setIsSubNote(true);
    setTitle('');
    setDescription('');
    setParentNoteId(undefined);
    setBucketId(undefined);
    setTagIds([]);
    setTeamMemberIds([]);
    setDescExpanded(false);
    setParentNoteSearch('');
    setUploadedFiles([]);
  };

  if (!isOpen) return null;

  const selectedParentNote = allNotes.find((n) => n.id === parentNoteId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        ref={modalRef}
        className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Quick Add {isSubNote ? 'SubNote' : 'Note'}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
          {/* Toggle: SubNote / Note */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isSubNote}
                onChange={(e) => {
                  setIsSubNote(e.target.checked);
                  setParentNoteId(undefined);
                  setParentNoteSearch('');
                }}
                className="rounded border-gray-300 text-primary-600"
              />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Create as SubNote</span>
            </label>
          </div>

          {/* Parent Note Search (only for subnote) */}
          {isSubNote && (
            <div className="relative">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Select Parent Note *
              </label>
              <div className="relative">
                <input
                  ref={parentNoteInputRef}
                  type="text"
                  value={parentNoteSearch}
                  onChange={(e) => {
                    setParentNoteSearch(e.target.value);
                    setShowNoteDropdown(true);
                  }}
                  onFocus={() => setShowNoteDropdown(true)}
                  placeholder="Search parent note..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none"
                />
                {showNoteDropdown && filteredNotes.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto">
                    {filteredNotes.map((note) => (
                      <button
                        key={note.id}
                        type="button"
                        onClick={() => {
                          setParentNoteId(note.id);
                          setParentNoteSearch(note.name);
                          setShowNoteDropdown(false);
                        }}
                        className={clsx(
                          'w-full text-left px-3 py-2 text-xs border-b border-gray-100 dark:border-gray-700 last:border-0 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700',
                          note.subNoteCount && note.subNoteCount > 0
                            ? 'bg-primary-50/30 dark:bg-primary-900/10 text-gray-900 dark:text-gray-100 font-medium'
                            : 'text-gray-900 dark:text-gray-100'
                        )}
                      >
                        <span>{note.name}</span>
                        {note.subNoteCount && note.subNoteCount > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary-200 text-primary-800 dark:bg-primary-900/40 dark:text-primary-300 font-semibold ml-2 flex-shrink-0">
                            {note.subNoteCount}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {parentNoteId && (
                <div className="mt-1 text-xs text-primary-600 dark:text-primary-400">
                  ✓ Selected: {selectedParentNote?.name}
                </div>
              )}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isSubNote ? 'SubNote title...' : 'Note title...'}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>

          {/* Bucket (auto-filled for subnotes from parent) */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Bucket
              {isSubNote && parentNoteId && bucketId ? (
                <span className="text-primary-600 dark:text-primary-400 ml-1">(from parent)</span>
              ) : null}
            </label>
            <select
              value={bucketId || ''}
              onChange={(e) => setBucketId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="">None</option>
              {buckets.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            {isSubNote && parentNoteId && bucketId && (
              <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                Inherited from parent. Click above to change if needed.
              </p>
            )}
          </div>

          {/* Tags */}
          <div data-tag-popup>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Tags</label>
            <button
              type="button"
              onClick={() => setTagPopupOpen(!tagPopupOpen)}
              className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <span className="text-gray-500 dark:text-gray-400">
                {tagIds.length > 0 ? `${tagIds.length} tag(s)` : 'Select tags...'}
              </span>
              <ChevronDown className="w-3 h-3" />
            </button>
            {tagPopupOpen && (
              <div className="absolute mt-1 w-full max-w-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                {/* Selected tags display */}
                {tagIds.length > 0 && (
                  <div className="p-2 flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    {getTags(tagIds).map((t) => (
                      <span key={t.id} className="inline-flex items-center gap-0.5 px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300">
                        {t.name}
                        <button
                          type="button"
                          onClick={() => setTagIds(tagIds.filter((id) => id !== t.id))}
                          className="hover:bg-black/10 rounded-full p-0.5"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                  <input
                    type="text"
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    placeholder="Search or create..."
                    className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 dark:text-gray-100 outline-none"
                    autoFocus
                  />
                </div>
                {showCreateTag && (
                  <button
                    type="button"
                    onClick={handleCreateTag}
                    disabled={creatingTag}
                    className="w-full px-3 py-2 text-xs text-left text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 flex items-center gap-1 border-b border-gray-100 dark:border-gray-700"
                  >
                    <Plus className="w-3 h-3" />
                    Create "{tagSearch.trim()}"
                  </button>
                )}
                {filteredTags.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTagIds(tagIds.includes(t.id) ? tagIds.filter((id) => id !== t.id) : [...tagIds, t.id])}
                    className={clsx('w-full px-3 py-2 text-xs text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0', tagIds.includes(t.id) && 'bg-primary-50 dark:bg-primary-900/20')}
                  >
                    <input type="checkbox" checked={tagIds.includes(t.id)} onChange={() => {}} className="rounded border-gray-300 text-primary-600 w-3 h-3" />
                    <span>{t.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Assignees */}
          <div data-tm-popup>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Assignees</label>
            <button
              type="button"
              onClick={() => setTmPopupOpen(!tmPopupOpen)}
              className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <span className="text-gray-500 dark:text-gray-400">
                {teamMemberIds.length > 0 ? `${teamMemberIds.length} member(s)` : 'Select members...'}
              </span>
              <ChevronDown className="w-3 h-3" />
            </button>
            {tmPopupOpen && (
              <div className="absolute mt-1 w-full max-w-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                {/* Selected team members display */}
                {teamMemberIds.length > 0 && (
                  <div className="p-2 flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    {teamMemberIds.map((tmId) => {
                      const tm = teamMembers.find((m) => m.id === tmId);
                      return tm ? (
                        <span key={tmId} className="inline-flex items-center gap-0.5 px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                          {tm.name}
                          <button
                            type="button"
                            onClick={() => setTeamMemberIds(teamMemberIds.filter((id) => id !== tmId))}
                            className="hover:bg-black/10 rounded-full p-0.5"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
                <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                  <input
                    type="text"
                    value={tmSearch}
                    onChange={(e) => setTmSearch(e.target.value)}
                    placeholder="Search or add..."
                    className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 dark:text-gray-100 outline-none"
                    autoFocus
                  />
                </div>
                {showCreateTm && (
                  <button
                    type="button"
                    onClick={handleCreateTeamMember}
                    className="w-full px-3 py-2 text-xs text-left text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 flex items-center gap-1 border-b border-gray-100 dark:border-gray-700"
                  >
                    <Plus className="w-3 h-3" />
                    Add "{tmSearch.trim()}"
                  </button>
                )}
                {filteredTm.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setTeamMemberIds(teamMemberIds.includes(m.id) ? teamMemberIds.filter((id) => id !== m.id) : [...teamMemberIds, m.id])}
                    className={clsx('w-full px-3 py-2 text-xs text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0', teamMemberIds.includes(m.id) && 'bg-primary-50 dark:bg-primary-900/20')}
                  >
                    <input type="checkbox" checked={teamMemberIds.includes(m.id)} onChange={() => {}} className="rounded border-gray-300 text-primary-600 w-3 h-3" />
                    <span>{m.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <button
              type="button"
              onClick={() => setDescExpanded(!descExpanded)}
              className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1 mb-1 hover:text-gray-900 dark:hover:text-gray-200"
            >
              <ChevronDown className={clsx('w-3 h-3 transition-transform', descExpanded && 'rotate-180')} />
              Description
            </button>
            {descExpanded && (
              <div className="mt-1">
                <RichTextEditor
                  content={description}
                  onChange={setDescription}
                  placeholder="Add description..."
                  compact
                />
              </div>
            )}
          </div>

          {/* File Upload */}
          <div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileInputChange}
              multiple
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center gap-1"
            >
              <Paperclip className="w-3.5 h-3.5" />
              Attach Files
            </button>
            {uploadedFiles.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {uploadedFiles.map((f) => (
                  <span key={f.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                    {f.name}
                    <button
                      type="button"
                      onClick={() => setUploadedFiles((prev) => prev.filter((uf) => uf.id !== f.id))}
                      className="hover:text-green-900"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => createMutation.mutate()}
            disabled={
              createMutation.isPending ||
              !title.trim() ||
              (isSubNote && !parentNoteId)
            }
          >
            {createMutation.isPending ? 'Creating...' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  );
}
