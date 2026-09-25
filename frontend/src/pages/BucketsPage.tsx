import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bucketsApi, CreateBucketRequest, UpdateBucketRequest } from '@/api/buckets';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';
import { Modal } from '@/components/shared/Modal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';

export function BucketsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBucket, setEditingBucket] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    color: '#3b82f6',
    priority: 50,
  });

  const { data: buckets = [], isLoading } = useQuery({
    queryKey: ['buckets'],
    queryFn: bucketsApi.getAll,
  });

  const sortedBuckets = useMemo(() =>
    [...buckets].sort((a, b) => a.priority - b.priority),
    [buckets]
  );

  const filtered = useMemo(() =>
    search
      ? sortedBuckets.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()))
      : sortedBuckets,
    [sortedBuckets, search]
  );

  const createMutation = useMutation({
    mutationFn: (data: CreateBucketRequest) => bucketsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buckets'] });
      toast.success('Bucket created');
      handleCloseModal();
    },
    onError: () => toast.error('Failed to create bucket'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateBucketRequest }) =>
      bucketsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buckets'] });
      toast.success('Bucket updated');
      handleCloseModal();
    },
    onError: () => toast.error('Failed to update bucket'),
  });

  const deleteMutation = useMutation({
    mutationFn: bucketsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buckets'] });
      toast.success('Bucket deleted');
    },
    onError: () => toast.error('Failed to delete bucket'),
  });

  const handleOpenCreate = () => {
    setEditingBucket(null);
    setFormData({ name: '', color: '#3b82f6', priority: 50 });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (bucket: any) => {
    setEditingBucket(bucket.id);
    setFormData({ name: bucket.name, color: bucket.color, priority: bucket.priority });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBucket(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBucket) {
      updateMutation.mutate({ id: editingBucket, data: formData });
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
          Buckets <span className="text-gray-400 font-normal text-base">({buckets.length})</span>
        </h1>
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus className="w-4 h-4 mr-1" /> Add
        </Button>
      </div>

      {buckets.length > 5 && (
        <div className="relative max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search buckets..."
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
      )}

      {/* Compact list sorted by priority (lower = higher priority) */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_60px_60px_auto] gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <span className="w-4"></span>
          <span>Name</span>
          <span>Priority</span>
          <span>Default</span>
          <span>Actions</span>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {filtered.map((bucket) => (
            <div
              key={bucket.id}
              className="grid grid-cols-[auto_1fr_60px_60px_auto] gap-3 px-3 py-2 items-center hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <span className="w-4 h-4 rounded" style={{ backgroundColor: bucket.color }} />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{bucket.name}</span>
              <span className="text-xs text-center font-mono text-gray-600 dark:text-gray-400">{bucket.priority}</span>
              <span className="text-center">
                {bucket.isDefault && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium">
                    Yes
                  </span>
                )}
              </span>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => handleOpenEdit(bucket)}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Edit"
                >
                  <Edit className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400 stroke-[2]" />
                </button>
                <button
                  onClick={() => setDeleteId(bucket.id)}
                  className="p-1.5 rounded hover:bg-danger-100 dark:hover:bg-danger-900/30"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5 text-danger-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingBucket ? 'Edit Bucket' : 'Create Bucket'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Bucket name"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-10 h-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                />
                <span className="text-xs text-gray-500 font-mono">{formData.color}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Priority <span className="font-normal text-gray-400">(lower = higher)</span>
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={handleCloseModal}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {editingBucket ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Delete Bucket"
        message="Notes in this bucket will become unassigned."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
