import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notesApi } from '@/api/notes';
import { UpdateNoteRequest } from '@/types';
import { NoteForm } from '@/components/notes/NoteForm';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import toast from 'react-hot-toast';

export function NoteEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const focusSubNoteId = searchParams.get('subNoteId') ? Number(searchParams.get('subNoteId')) : undefined;

  const { data: note, isLoading } = useQuery({
    queryKey: ['note', id],
    queryFn: () => notesApi.getById(Number(id)),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateNoteRequest) => notesApi.update(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note', id] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Note updated successfully');
      navigate(`/notes/${id}`);
    },
    onError: () => {
      toast.error('Failed to update note');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => notesApi.delete(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Note deleted');
      navigate('/notes');
    },
    onError: () => toast.error('Failed to delete note'),
  });

  const handleDelete = () => {
    if (confirm('Delete this note and all its subnotes? This cannot be undone.')) {
      deleteMutation.mutate();
    }
  };

  const handleSubmit = async (data: UpdateNoteRequest) => {
    await updateMutation.mutateAsync(data);
  };

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" onClick={() => navigate(`/notes/${id}`)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Note
        </Button>
        <button
          onClick={handleDelete}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-danger-200 dark:border-danger-800 text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/30 transition-colors"
          title="Delete note"
        >
          <Trash2 className="w-4 h-4" />
          Delete Note
        </button>
      </div>

      <NoteForm
        note={note}
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/notes/${id}`)}
        isLoading={updateMutation.isPending}
        focusSubNoteId={focusSubNoteId}
      />
    </div>
  );
}
