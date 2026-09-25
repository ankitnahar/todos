import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notesApi } from '@/api/notes';
import { useReferenceData } from '@/hooks/useReferenceData';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { RotateCcw, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import toast from 'react-hot-toast';

export function DeletedNotesPage() {
  const queryClient = useQueryClient();
  const { getBucket, getTags } = useReferenceData();
  const [permanentDeleteId, setPermanentDeleteId] = useState<number | null>(null);

  const { data: deletedNotes = [], isLoading } = useQuery({
    queryKey: ['deletedNotes'],
    queryFn: notesApi.getDeleted,
  });

  const restoreMutation = useMutation({
    mutationFn: notesApi.restore,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deletedNotes'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Note restored');
    },
    onError: () => {
      toast.error('Failed to restore note');
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: notesApi.hardDelete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deletedNotes'] });
      toast.success('Note permanently deleted');
    },
    onError: () => {
      toast.error('Failed to delete note');
    },
  });

  const confirmPermanentDelete = () => {
    if (permanentDeleteId) {
      permanentDeleteMutation.mutate(permanentDeleteId);
      setPermanentDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Deleted Notes</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Restore or permanently delete notes
        </p>
      </div>

      {deletedNotes.length === 0 ? (
        <EmptyState
          icon={Trash2}
          title="No deleted notes"
          description="Deleted notes will appear here and can be restored"
        />
      ) : (
        <div className="space-y-4">
          {deletedNotes.map((note) => {
            const bucket = getBucket(note.bucketId);
            const noteTags = getTags(note.tagIds);
            return (
              <Card key={note.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      {note.name}
                    </h3>

                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 mb-3">
                      <span>Deleted: {format(new Date(note.deletedAt || note.updatedAt), 'PPP')}</span>
                      {bucket && (
                        <>
                          <span>&bull;</span>
                          <Badge variant="default">{bucket.name}</Badge>
                        </>
                      )}
                    </div>

                    {noteTags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {noteTags.map((tag) => (
                          <Badge key={tag.id} variant="default">
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => restoreMutation.mutate(note.id)}
                      disabled={restoreMutation.isPending}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Restore
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setPermanentDeleteId(note.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Forever
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={permanentDeleteId !== null}
        onClose={() => setPermanentDeleteId(null)}
        onConfirm={confirmPermanentDelete}
        title="Permanently Delete Note"
        message="This action cannot be undone. The note will be permanently deleted."
        confirmText="Delete Forever"
        variant="danger"
      />
    </div>
  );
}
