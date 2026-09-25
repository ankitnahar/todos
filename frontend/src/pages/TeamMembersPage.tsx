import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamMembersApi, CreateTeamMemberRequest, UpdateTeamMemberRequest } from '@/api/teamMembers';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';
import { Modal } from '@/components/shared/Modal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';

export function TeamMembersPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '' });
  const [search, setSearch] = useState('');

  const { data: teamMembers = [], isLoading } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: teamMembersApi.getAll,
  });

  const filtered = useMemo(() =>
    search
      ? teamMembers.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
      : teamMembers,
    [teamMembers, search]
  );

  const createMutation = useMutation({
    mutationFn: (data: CreateTeamMemberRequest) => teamMembersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      toast.success('Team member created');
      handleCloseModal();
    },
    onError: () => toast.error('Failed to create team member'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTeamMemberRequest }) =>
      teamMembersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      toast.success('Team member updated');
      handleCloseModal();
    },
    onError: () => toast.error('Failed to update team member'),
  });

  const deleteMutation = useMutation({
    mutationFn: teamMembersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      toast.success('Team member deleted');
    },
    onError: () => toast.error('Failed to delete team member'),
  });

  const handleOpenCreate = () => {
    setEditingMember(null);
    setFormData({ name: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (member: { id: number; name: string }) => {
    setEditingMember(member.id);
    setFormData({ name: member.name });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMember(null);
    setFormData({ name: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMember) {
      updateMutation.mutate({ id: editingMember, data: formData });
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
          Assignees <span className="text-gray-400 font-normal text-base">({teamMembers.length})</span>
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
          placeholder="Search members..."
          className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-gray-100"
        />
      </div>

      {/* List */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_auto] gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <span className="w-8"></span>
          <span>Name</span>
          <span>Actions</span>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {filtered.map((member) => (
            <div
              key={member.id}
              className="grid grid-cols-[auto_1fr_auto] gap-3 px-3 py-2 items-center hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-medium">
                {member.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{member.name}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEdit(member)}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Edit"
                >
                  <Edit className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400 stroke-[2]" />
                </button>
                <button
                  onClick={() => setDeleteId(member.id)}
                  className="p-1.5 rounded hover:bg-danger-100 dark:hover:bg-danger-900/30"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5 text-danger-500" />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-gray-500">No members found</div>
          )}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingMember ? 'Edit Member' : 'Add Member'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter name"
            required
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={handleCloseModal}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {editingMember ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Delete Team Member"
        message="Are you sure? They will be removed from all notes."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
