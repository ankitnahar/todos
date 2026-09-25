import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notesApi } from '@/api/notes';
import { CreateNoteRequest, UpdateNoteRequest } from '@/types';
import { NoteForm } from '@/components/notes/NoteForm';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import toast from 'react-hot-toast';

export function NoteCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: CreateNoteRequest) => notesApi.create(data),
    onSuccess: (note) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Note created successfully');
      navigate(`/notes/${note.id}`);
    },
    onError: () => {
      toast.error('Failed to create note');
    },
  });

  const handleSubmit = async (data: CreateNoteRequest | UpdateNoteRequest) => {
    await createMutation.mutateAsync(data as CreateNoteRequest);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/notes')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Notes
        </Button>
      </div>

      <NoteForm
        onSubmit={handleSubmit}
        onCancel={() => navigate('/notes')}
        isLoading={createMutation.isPending}
      />
    </div>
  );
}
