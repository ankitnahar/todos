import { useState, useRef, useEffect } from 'react';
import { sanitizeHtml } from '@/utils/sanitize';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { SubNote, UpdateSubNoteRequest } from '@/types';
import { Card } from '@/components/shared/Card';
import { RichTextEditor } from '@/components/shared/RichTextEditor';
import { filesApi } from '@/api/files';
import { ChevronDown, ChevronRight, Edit, Save, X, Flame, Trash2, Paperclip, Tag, Users, MoveRight, FileUp, Link2, Unlink, Layers, Copy } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';
import { useReferenceData } from '@/hooks/useReferenceData';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

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

// Normalize description HTML to ensure line breaks display properly
function normalizeDescriptionHTML(html: string): string {
  if (!html) return '';
  // Convert raw newlines to <br> tags for proper display
  return html.replace(/\n/g, '<br>');
}

interface SubNoteCardProps {
  subNote: SubNote;
  currentNoteId?: number;
  isExpanded?: boolean;
  isHighlighted?: boolean;
  showMeta?: boolean;
  inheritedTagIds?: number[];
  onToggleExpand?: () => void;
  onUpdate?: (id: number, data: UpdateSubNoteRequest) => Promise<void>;
  onDelete?: (id: number) => void;
  onUnlink?: (id: number) => void;
  onToggleHotTopic?: (id: number) => void;
  onMove?: (id: number) => void;
  onConvert?: (id: number) => void;
  onLink?: (id: number) => void;
  onEditTags?: (id: number) => void;
  onEditAssignees?: (id: number) => void;
  onEditBucket?: (id: number) => void;
}

export function SubNoteCard({
  subNote,
  currentNoteId,
  isExpanded = false,
  isHighlighted = false,
  showMeta = false,
  inheritedTagIds = [],
  onToggleExpand,
  onUpdate,
  onDelete,
  onUnlink,
  onToggleHotTopic,
  onMove,
  onConvert,
  onLink,
  onEditTags,
  onEditAssignees,
  onEditBucket,
}: SubNoteCardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedDescription, setEditedDescription] = useState(subNote.description);
  const { buckets, getTags, getTeamMembers } = useReferenceData();

  const isLinkedHere = currentNoteId != null && (subNote.parentNoteIds?.length ?? 0) > 1 && subNote.parentNoteIds?.includes(currentNoteId);

  useEffect(() => {
    if (!isEditing) {
      setEditedDescription(subNote.description);
    }
  }, [subNote.description, isEditing]);

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

  const resolvedTags = getTags(subNote.tagIds);
  const resolvedMembers = getTeamMembers(subNote.teamMemberIds);
  const ownTagIdSet = new Set(subNote.tagIds);
  const resolvedInheritedTags = getTags(inheritedTagIds.filter((id) => !ownTagIdSet.has(id)));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: subNoteFiles = [] } = useQuery({
    queryKey: ['files', 'subnote', subNote.id],
    queryFn: () => filesApi.getBySubNoteId(subNote.id),
  });

  const uploadFileMutation = useMutation({
    mutationFn: (file: File) => filesApi.upload(file, undefined, subNote.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', 'subnote', subNote.id] });
      toast.success('File uploaded');
    },
    onError: () => toast.error('Upload failed'),
  });

  const deleteFileMutation = useMutation({
    mutationFn: filesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', 'subnote', subNote.id] });
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFileMutation.mutate(file);
    e.target.value = '';
  };

  const hasChanges = editedDescription !== subNote.description;

  const handleSave = async () => {
    if (!onUpdate || !hasChanges) return;
    const currentTags = getTags(subNote.tagIds);
    await onUpdate(subNote.id, {
      header: subNote.header,
      description: editedDescription,
      tagNames: currentTags.map((t) => t.name),
      teamMemberIds: subNote.teamMemberIds,
      bucketId: subNote.bucketId ?? undefined,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedDescription(subNote.description);
    setIsEditing(false);
  };


  const [inlineEditHeader, setInlineEditHeader] = useState<string | null>(null);

  const handleDoubleClickHeader = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInlineEditHeader(subNote.header);
  };

  const handleInlineHeaderSave = async () => {
    if (inlineEditHeader !== null && inlineEditHeader !== subNote.header && onUpdate) {
      const selectedTags = getTags(subNote.tagIds);
      await onUpdate(subNote.id, { header: inlineEditHeader, tagNames: selectedTags.map(t => t.name), teamMemberIds: subNote.teamMemberIds });
    }
    setInlineEditHeader(null);
  };

  const handleInlineHeaderKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleInlineHeaderSave();
    if (e.key === 'Escape') setInlineEditHeader(null);
  };

  useEffect(() => {
    if (!isExpanded) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (isEditing) {
        const hasChanges = editedDescription !== subNote.description;
        if (hasChanges) {
          if (!confirm('You have unsaved changes. Discard them?')) return;
        }
        handleCancel();
      }
      e.stopPropagation();
      onToggleExpand?.();
    };
    document.addEventListener('keydown', handleEsc, true);
    return () => document.removeEventListener('keydown', handleEsc, true);
  }, [isExpanded, isEditing, editedDescription, subNote.description]);

  const bucketColor = buckets.find((b) => b.id === subNote.bucketId)?.color;
  const borderColor = bucketColor || (subNote.hotTopic ? '#f87171' : '#d1d5db');

  return (
    <Card className={clsx(
      'transition-all',
      isHighlighted && 'ring-2 ring-primary-500 bg-primary-50/50 dark:bg-primary-900/20',
    )}
    style={{
      border: `${isExpanded ? '3px' : '2px'} solid ${borderColor}`,
      borderLeftWidth: '4px',
    }}
    >
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
      {/* Title row - always visible */}
      <div
        className="flex items-start gap-2 px-3 py-1 cursor-pointer select-none group/row"
        onClick={onToggleExpand}
      >
        <button className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0 mt-0.5">
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>

        <div className="flex-1 min-w-0 select-text">
          {inlineEditHeader !== null ? (
            <input
              type="text"
              value={inlineEditHeader}
              onChange={(e) => setInlineEditHeader(e.target.value)}
              onBlur={handleInlineHeaderSave}
              onKeyDown={handleInlineHeaderKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="w-full text-sm font-medium bg-white dark:bg-gray-800 border border-primary-400 rounded px-2 py-0.5 focus:ring-1 focus:ring-primary-500 outline-none"
              autoFocus
            />
          ) : (
            <>
              <span
                className="font-medium text-sm text-gray-900 dark:text-gray-100 break-words select-text"
                onDoubleClick={handleDoubleClickHeader}
                title="Double-click to edit"
              >
                {subNote.header}
              </span>
              {isLinkedHere && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 ml-1.5">
                  <Link2 className="w-2.5 h-2.5" /> linked
                </span>
              )}
            </>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {isEditing && hasChanges && (
            <button
              onClick={(e) => { e.stopPropagation(); handleSave(); }}
              className="px-2 py-0.5 rounded bg-success-100 text-success-700 hover:bg-success-200 dark:bg-success-900/30 dark:text-success-400 text-xs font-medium flex items-center gap-1 mr-1"
              title="Save changes"
            >
              <Save className="w-3 h-3" /> Save
            </button>
          )}
          {onToggleHotTopic && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleHotTopic(subNote.id); }}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Toggle hot topic"
            >
              <Flame className={`w-3.5 h-3.5 stroke-[2.5] ${subNote.hotTopic ? 'fill-danger-400 text-danger-500' : 'text-gray-400 fill-none'}`} />
            </button>
          )}
          {onUpdate && (
            <button
              onClick={(e) => { e.stopPropagation(); setIsEditing(true); if (!isExpanded && onToggleExpand) onToggleExpand(); }}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600"
              title="Edit"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
          )}
          {onEditTags && (
            <button
              onClick={(e) => { e.stopPropagation(); onEditTags(subNote.id); }}
              className={clsx('p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700', resolvedTags.length > 0 ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400')}
              title="Edit tags"
            >
              <Tag className="w-3.5 h-3.5" />
            </button>
          )}
          {onEditAssignees && (
            <button
              onClick={(e) => { e.stopPropagation(); onEditAssignees(subNote.id); }}
              className={clsx('p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700', resolvedMembers.length > 0 ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400')}
              title="Edit assignees"
            >
              <Users className="w-3.5 h-3.5" />
            </button>
          )}
          {onEditBucket && (
            <button
              onClick={(e) => { e.stopPropagation(); onEditBucket(subNote.id); }}
              className={clsx('p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700', subNote.bucketId ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400')}
              title="Change bucket"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
          )}
          {onMove && (
            <button
              onClick={(e) => { e.stopPropagation(); onMove(subNote.id); }}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600"
              title="Move to another note"
            >
              <MoveRight className="w-3.5 h-3.5" />
            </button>
          )}
          {onConvert && (
            <button
              onClick={(e) => { e.stopPropagation(); onConvert(subNote.id); }}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600"
              title="Convert to note"
            >
              <FileUp className="w-3.5 h-3.5" />
            </button>
          )}
          {onLink && (
            <button
              onClick={(e) => { e.stopPropagation(); onLink(subNote.id); }}
              className={clsx('p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700', isLinkedHere ? 'text-primary-500 dark:text-primary-400' : 'text-gray-400 hover:text-gray-600')}
              title={isLinkedHere ? `Linked to ${(subNote.parentNoteIds?.length ?? 1) - 1} other note(s)` : 'Link to another note'}
            >
              <Link2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            className={clsx('p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700', subNoteFiles.length > 0 ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400')}
            title="Upload file"
          >
            <Paperclip className="w-3.5 h-3.5" />
          </button>
          {isLinkedHere && onUnlink ? (
            <button
              onClick={(e) => { e.stopPropagation(); onUnlink(subNote.id); }}
              className="p-1 rounded hover:bg-warning-100 dark:hover:bg-warning-900/30 text-gray-400 hover:text-warning-600"
              title="Unlink from this note"
            >
              <Unlink className="w-3.5 h-3.5" />
            </button>
          ) : onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(subNote.id); }}
              className="p-1 rounded hover:bg-danger-100 dark:hover:bg-danger-900/30 text-gray-400 hover:text-danger-600"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="text-[11px] text-gray-400 dark:text-gray-500 ml-1">
            {format(new Date(subNote.updatedAt), 'MMM d')}
          </span>
        </div>
      </div>

      {/* Tags, assignees, files — shown only when showMeta is on */}
      {showMeta && (resolvedTags.length > 0 || resolvedInheritedTags.length > 0 || resolvedMembers.length > 0 || subNoteFiles.length > 0) && (
        <div className="flex items-center gap-1.5 flex-wrap px-3 pb-1">
          {resolvedTags.map((tag) => (
            <span key={tag.id} className="px-2 py-0.5 text-[11px] rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium border border-blue-200 dark:border-blue-800">
              {tag.name}
            </span>
          ))}
          {resolvedInheritedTags.map((tag) => (
            <span key={`inh-${tag.id}`} className="px-2 py-0.5 text-[11px] rounded-full bg-gray-100 dark:bg-gray-700/50 text-gray-400 dark:text-gray-500 font-normal border border-dashed border-gray-300 dark:border-gray-600 italic" title="Inherited from parent note">
              {tag.name}
            </span>
          ))}
          {resolvedMembers.map((m) => (
            <span key={m.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              {m.name}
            </span>
          ))}
          {subNoteFiles.map((file) => (
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

      {/* Expanded content — always editable inline */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t-2 border-gray-200 dark:border-gray-600 pt-3 bg-gray-50/50 dark:bg-gray-900/20 rounded-b-lg">
          {isEditing ? (
            <div className="space-y-2">
              <RichTextEditor content={editedDescription} onChange={setEditedDescription} />
              <div className="flex items-center gap-1 pt-1">
                <button
                  onClick={handleSave}
                  disabled={!hasChanges}
                  className={clsx(
                    'px-3 py-1 text-xs rounded transition-colors flex items-center gap-1',
                    hasChanges
                      ? 'bg-success-100 text-success-700 hover:bg-success-200 dark:bg-success-900/30 dark:text-success-400'
                      : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed'
                  )}
                >
                  <Save className="w-3 h-3" /> Save
                </button>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1 text-xs rounded bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 transition-colors flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div
                  className="flex-1 min-w-0 cursor-text rounded p-1 -m-1 hover:bg-white dark:hover:bg-gray-800 transition-colors"
                  onClick={(e) => {
                    handleDescriptionClick(e);
                    if ((e.target as HTMLElement).tagName !== 'A') {
                      setIsEditing(true);
                    }
                  }}
                  title="Click to edit"
                >
                  {subNote.description ? (
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none text-gray-900 dark:text-gray-100 select-text [&_p]:my-0 [&_p]:leading-snug [&_ul]:!text-gray-900 dark:[&_ul]:!text-white [&_ol]:!text-gray-900 dark:[&_ol]:!text-white [&_li]:!text-gray-900 dark:[&_li]:!text-white [&_li_*]:!text-gray-900 dark:[&_li_*]:!text-white [&_li::marker]:!text-gray-900 dark:[&_li::marker]:!text-white [&_code]:bg-gray-900 [&_code]:text-gray-100 [&_code]:rounded [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code::before]:content-none [&_code::after]:content-none [&_pre]:bg-gray-900 [&_pre]:text-gray-100 [&_pre]:rounded [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-sm [&_pre]:overflow-x-auto"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(normalizeDescriptionHTML(subNote.description)) }}
                    />
                  ) : (
                    <p className="text-sm text-gray-400 italic">Click to add description...</p>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const text = htmlToPlainText(subNote.description || '');
                    navigator.clipboard.writeText(text);
                    toast.success('Copied to clipboard');
                  }}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0 mt-1"
                  title="Copy description"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
