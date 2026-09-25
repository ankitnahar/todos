import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bucketsApi } from '@/api/buckets';
import { notesApi } from '@/api/notes';
import { useReferenceData } from '@/hooks/useReferenceData';
import { useDailyDismiss } from '@/hooks/useDailyDismiss';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Flame, Star, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useState } from 'react';
import type { SubNote } from '@/types';

function DismissButton({ id, isDismissed, onDismiss, onUndismiss }: {
  id: string;
  isDismissed: boolean;
  onDismiss: (id: string) => void;
  onUndismiss: (id: string) => void;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        isDismissed ? onUndismiss(id) : onDismiss(id);
      }}
      title={isDismissed ? 'Unmark — show again today' : 'Done for today — hide until tomorrow'}
      className="flex-shrink-0 transition-colors"
    >
      <CheckCircle2
        className={`w-4 h-4 ${isDismissed
          ? 'text-success-500 fill-success-100'
          : 'text-gray-300 dark:text-gray-600 hover:text-success-500'
        }`}
      />
    </button>
  );
}

export function PriorityViewPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { getTags, getTeamMembers } = useReferenceData();
  const { dismiss, undismiss, isDismissed } = useDailyDismiss();
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());
  const [showDismissedInBucket, setShowDismissedInBucket] = useState<Set<number>>(new Set());

  const { data: buckets = [], isLoading: bucketsLoading } = useQuery({
    queryKey: ['buckets'],
    queryFn: bucketsApi.getAll,
  });

  const { data: allNotes = [], isLoading: notesLoading } = useQuery({
    queryKey: ['notes'],
    queryFn: () => notesApi.getAll(),
  });

  const toggleHotTopic = useMutation({
    mutationFn: notesApi.toggleHotTopic,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Updated');
    },
  });

  const isLoading = bucketsLoading || notesLoading;

  const sortedBuckets = [...buckets].sort((a, b) => a.priority - b.priority);

  const groupedData = sortedBuckets.map((bucket) => ({
    bucket,
    notes: allNotes.filter((note) => note.bucketId === bucket.id),
  }));

  function toggleExpand(noteId: number) {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      next.has(noteId) ? next.delete(noteId) : next.add(noteId);
      return next;
    });
  }

  function toggleShowDismissed(bucketId: number) {
    setShowDismissedInBucket((prev) => {
      const next = new Set(prev);
      next.has(bucketId) ? next.delete(bucketId) : next.add(bucketId);
      return next;
    });
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-96"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Priority View</h1>

      <div className="space-y-3">
        {groupedData.map(({ bucket, notes }) => {
          const showDismissed = showDismissedInBucket.has(bucket.id);

          const visibleNotes = showDismissed
            ? notes
            : notes.filter((n) => !isDismissed(`note_${n.id}`));

          const dismissedNotesCount = notes.filter((n) => isDismissed(`note_${n.id}`)).length;

          return (
            <div key={bucket.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              {/* Bucket header */}
              <div className="flex items-center gap-2.5 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <span className="w-3.5 h-3.5 rounded" style={{ backgroundColor: bucket.color }} />
                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{bucket.name}</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 font-mono">
                  P{bucket.priority}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">{notes.length} {notes.length === 1 ? 'note' : 'notes'}</span>
              </div>

              {/* Notes */}
              {notes.length === 0 ? (
                <div className="px-4 py-5 text-center text-sm text-gray-400">No notes</div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {visibleNotes.map((note) => {
                    const noteTags = getTags(note.tagIds || []);
                    const members = getTeamMembers(note.teamMemberIds || []);
                    const noteKey = `note_${note.id}`;
                    const dismissed = isDismissed(noteKey);
                    const hasSubNotes = (note.subNotes?.length || 0) > 0;
                    const expanded = expandedNotes.has(note.id);

                    const visibleSubNotes = showDismissed
                      ? (note.subNotes || [])
                      : (note.subNotes || []).filter((sn) => !isDismissed(`subnote_${sn.id}`));

                    return (
                      <div key={note.id}>
                        {/* Note row */}
                        <div
                          className={`flex items-center gap-3 pl-4 pr-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer group ${dismissed ? 'opacity-50' : ''}`}
                          onClick={() => navigate(`/notes/${note.id}`)}
                        >
                          {/* Expand subnotes toggle */}
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleExpand(note.id); }}
                            className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            {hasSubNotes
                              ? (expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />)
                              : <span className="w-3.5 h-3.5 block" />
                            }
                          </button>

                          {/* Hot topic */}
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleHotTopic.mutate(note.id); }}
                            className="flex-shrink-0"
                            title="Toggle hot topic"
                          >
                            <Flame className={`w-4 h-4 ${note.hotTopic ? 'fill-danger-400 text-danger-400 stroke-danger-600' : 'text-gray-300 dark:text-gray-600 stroke-gray-400 dark:stroke-gray-500'}`} />
                          </button>

                          {/* Done for today */}
                          <DismissButton
                            id={noteKey}
                            isDismissed={dismissed}
                            onDismiss={dismiss}
                            onUndismiss={undismiss}
                          />

                          {note.favorite && <Star className="w-4 h-4 fill-warning-400 text-warning-400 stroke-warning-600 flex-shrink-0" />}

                          <span className="text-base font-medium text-gray-900 dark:text-gray-100 truncate flex-1 min-w-0">
                            {note.name}
                          </span>

                          <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
                            {noteTags.slice(0, 2).map((tag) => (
                              <span key={tag.id} className="px-2 py-0.5 text-xs rounded bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-medium">
                                {tag.name}
                              </span>
                            ))}
                            {noteTags.length > 2 && <span className="text-xs text-gray-400">+{noteTags.length - 2}</span>}
                          </div>

                          <div className="hidden sm:flex -space-x-1.5 flex-shrink-0">
                            {members.slice(0, 3).map((m) => (
                              <div
                                key={m.id}
                                className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center text-white text-[11px] font-medium border-2 border-white dark:border-gray-900"
                                title={m.name}
                              >
                                {m.name.charAt(0).toUpperCase()}
                              </div>
                            ))}
                          </div>

                          {hasSubNotes && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-medium flex-shrink-0">
                              {note.subNotes?.length}
                            </span>
                          )}
                        </div>

                        {/* Expanded subnotes */}
                        {expanded && hasSubNotes && (
                          <div className="border-t border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/30">
                            {visibleSubNotes.map((sn) => (
                              <SubNoteRow
                                key={sn.id}
                                subNote={sn}
                                dismissed={isDismissed(`subnote_${sn.id}`)}
                                onDismiss={() => dismiss(`subnote_${sn.id}`)}
                                onUndismiss={() => undismiss(`subnote_${sn.id}`)}
                                onNavigate={() => navigate(`/notes/${note.id}`)}
                                getTags={getTags}
                                getTeamMembers={getTeamMembers}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Dismissed items footer */}
                  {dismissedNotesCount > 0 && (
                    <div className="px-4 py-2 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/20">
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {dismissedNotesCount} item{dismissedNotesCount !== 1 ? 's' : ''} done for today
                      </span>
                      <button
                        onClick={() => toggleShowDismissed(bucket.id)}
                        className="text-xs text-primary-500 hover:text-primary-600 dark:text-primary-400"
                      >
                        {showDismissed ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SubNoteRow({ subNote, dismissed, onDismiss, onUndismiss, onNavigate, getTags, getTeamMembers }: {
  subNote: SubNote;
  dismissed: boolean;
  onDismiss: () => void;
  onUndismiss: () => void;
  onNavigate: () => void;
  getTags: (ids: number[]) => { id: number; name: string }[];
  getTeamMembers: (ids: number[]) => { id: number; name: string }[];
}) {
  const tags = getTags(subNote.tagIds || []);
  const members = getTeamMembers(subNote.teamMemberIds || []);

  return (
    <div
      className={`flex items-center gap-3 pl-12 pr-4 py-2 hover:bg-gray-100/50 dark:hover:bg-gray-700/30 cursor-pointer group border-b border-gray-100 dark:border-gray-700/30 last:border-0 ${dismissed ? 'opacity-50' : ''}`}
      onClick={onNavigate}
    >
      <span className="w-3.5 h-3.5 flex-shrink-0 block" />

      {subNote.hotTopic && (
        <Flame className="w-3.5 h-3.5 fill-danger-400 text-danger-400 stroke-danger-600 flex-shrink-0" />
      )}

      {/* Done for today */}
      <button
        onClick={(e) => { e.stopPropagation(); dismissed ? onUndismiss() : onDismiss(); }}
        title={dismissed ? 'Unmark — show again today' : 'Done for today'}
        className="flex-shrink-0 transition-colors"
      >
        <CheckCircle2
          className={`w-3.5 h-3.5 ${dismissed
            ? 'text-success-500 fill-success-100'
            : 'text-gray-300 dark:text-gray-600 hover:text-success-500'
          }`}
        />
      </button>

      <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1 min-w-0">
        {subNote.header}
      </span>

      <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
        {tags.slice(0, 2).map((tag) => (
          <span key={tag.id} className="px-1.5 py-0.5 text-[11px] rounded bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
            {tag.name}
          </span>
        ))}
      </div>

      <div className="hidden sm:flex -space-x-1 flex-shrink-0">
        {members.slice(0, 2).map((m) => (
          <div
            key={m.id}
            className="w-5 h-5 rounded-full bg-primary-400 flex items-center justify-center text-white text-[10px] font-medium border-2 border-white dark:border-gray-900"
            title={m.name}
          >
            {m.name.charAt(0).toUpperCase()}
          </div>
        ))}
      </div>
    </div>
  );
}
