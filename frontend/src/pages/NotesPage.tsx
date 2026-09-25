import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notesApi } from '@/api/notes';
import { NoteFilters } from '@/types';
import { NoteList } from '@/components/notes/NoteList';
import { NoteCard } from '@/components/notes/NoteCard';
import { FilterBar } from '@/components/notes/FilterBar';
import { QuickAddNoteModal } from '@/components/notes/QuickAddNoteModal';
import { Button } from '@/components/shared/Button';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Plus, LayoutGrid, List } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

export function NotesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const filters: NoteFilters = {
    bucketIds: searchParams.getAll('bucketId').map(Number).filter(Boolean),
    tagIds: searchParams.getAll('tagId').map(Number).filter(Boolean),
    teamMemberIds: searchParams.getAll('teamMemberId').map(Number).filter(Boolean),
    trackStatus: searchParams.get('trackStatus') || undefined,
    search: searchParams.get('search') || undefined,
    tagMatchMode: (searchParams.get('tagMatchMode') as 'AND' | 'OR') || undefined,
  };

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['notes', filters],
    queryFn: () => notesApi.getAll(filters),
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: notesApi.toggleFavorite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  const toggleHotTopicMutation = useMutation({
    mutationFn: notesApi.toggleHotTopic,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: notesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Note deleted');
    },
    onError: () => {
      toast.error('Failed to delete note');
    },
  });

  const handleFiltersChange = (newFilters: NoteFilters) => {
    const params = new URLSearchParams();
    newFilters.bucketIds?.forEach((id) => params.append('bucketId', id.toString()));
    newFilters.tagIds?.forEach((id) => params.append('tagId', id.toString()));
    newFilters.teamMemberIds?.forEach((id) => params.append('teamMemberId', id.toString()));
    if (newFilters.trackStatus) params.set('trackStatus', newFilters.trackStatus);
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.tagMatchMode) params.set('tagMatchMode', newFilters.tagMatchMode);
    setSearchParams(params);
  };

  const handleDelete = (id: number) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId);
      setDeleteId(null);
    }
  };

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Notes
          <span className="text-gray-400 font-normal text-base ml-2">({notes.length})</span>
        </h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded p-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-700 shadow-sm'
                  : 'text-gray-500'
              }`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-gray-700 shadow-sm'
                  : 'text-gray-500'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          <Button size="sm" onClick={() => navigate('/notes/new')}>
            <Plus className="w-4 h-4 mr-1" />
            New
          </Button>
        </div>
      </div>

      {/* Always-visible filter bar */}
      <FilterBar filters={filters} onFiltersChange={handleFiltersChange} />

      {/* Content */}
      {notes.length === 0 ? (
        <EmptyState
          icon={Plus}
          title="No notes found"
          description={filters.search || filters.tagIds?.length || filters.bucketIds?.length
            ? "Try adjusting your filters"
            : "Get started by creating your first note"
          }
          action={
            !filters.search && !filters.tagIds?.length && !filters.bucketIds?.length ? (
              <Button size="sm" onClick={() => navigate('/notes/new')}>
                <Plus className="w-4 h-4 mr-1" />
                Create Note
              </Button>
            ) : undefined
          }
        />
      ) : viewMode === 'list' ? (
        <NoteList
          notes={notes}
          searchTerm={filters.search}
          filterTagIds={filters.tagIds}
          filterTagMatchMode={filters.tagMatchMode}
          onToggleFavorite={(id) => toggleFavoriteMutation.mutate(id)}
          onToggleHotTopic={(id) => toggleHotTopicMutation.mutate(id)}
          onDelete={handleDelete}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onToggleFavorite={() => toggleFavoriteMutation.mutate(note.id)}
              onToggleHotTopic={() => toggleHotTopicMutation.mutate(note.id)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Delete Note"
        message="Are you sure you want to delete this note?"
        confirmText="Delete"
        variant="danger"
      />

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
