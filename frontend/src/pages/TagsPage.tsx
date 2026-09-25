import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tagsApi, CreateTagRequest, UpdateTagRequest } from '@/api/tags';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';
import { Modal } from '@/components/shared/Modal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Plus, Edit, Trash2, Search, Tag } from 'lucide-react';
import toast from 'react-hot-toast';

export function TagsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '' });
  const [search, setSearch] = useState('');

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.getAll,
  });

  const filtered = useMemo(() =>
    search
      ? tags.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
      : tags,
    [tags, search]
  );

  const createMutation = useMutation({
    mutationFn: (data: CreateTagRequest) => tagsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast.success('Tag created');
      handleCloseModal();
    },
    onError: () => toast.error('Failed to create tag'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTagRequest }) =>
      tagsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast.success('Tag updated');
      handleCloseModal();
    },
    onError: () => toast.error('Failed to update tag'),
  });

  const deleteMutation = useMutation({
    mutationFn: tagsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast.success('Tag deleted');
    },
    onError: () => toast.error('Failed to delete tag'),
  });

  const handleOpenCreate = () => {
    setEditingTag(null);
    setFormData({ name: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tag: { id: number; name: string }) => {
    setEditingTag(tag.id);
    setFormData({ name: tag.name });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTag(null);
    setFormData({ name: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTag) {
      updateMutation.mutate({ id: editingTag, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-96"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Tags <span className="text-gray-400 font-normal text-base">({tags.length})</span>
        </h1>
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus className="w-4 h-4 mr-1" /> Add
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tags..."
          className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-gray-100"
        />
      </div>

      {/* Compact tag list - multi-column for space efficiency */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 divide-gray-100 dark:divide-gray-700/50">
          {filtered.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700/50 sm:border-r last:border-r-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Tag className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" />
                <span className="text-sm text-gray-900 dark:text-gray-100 truncate">{tag.name}</span>
              </div>
              <div className="flex items-center gap-0.5 ml-2 flex-shrink-0">
                <button
                  onClick={() => handleOpenEdit(tag)}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Edit"
                >
                  <Edit className="w-3 h-3 text-gray-600 dark:text-gray-400 stroke-[2]" />
                </button>
                <button
                  onClick={() => setDeleteId(tag.id)}
                  className="p-1 rounded hover:bg-danger-100 dark:hover:bg-danger-900/30"
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3 text-danger-500 stroke-[2]" />
                </button>
              </div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="px-3 py-6 text-center text-sm text-gray-500">No tags found</div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingTag ? 'Edit Tag' : 'Create Tag'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Tag Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter tag name"
            required
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={handleCloseModal}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {editingTag ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Delete Tag"
        message="Are you sure? This tag will be removed from all notes."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
