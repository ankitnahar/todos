import api from './api';
import type { TeamMember } from '@/types';

export interface CreateTeamMemberRequest {
  name: string;
}

export interface UpdateTeamMemberRequest {
  name?: string;
}

export const teamMembersApi = {
  getAll: async (): Promise<TeamMember[]> => {
    const { data } = await api.get<TeamMember[]>('/team-members');
    return data;
  },

  getById: async (id: number): Promise<TeamMember> => {
    const { data } = await api.get<TeamMember>(`/team-members/${id}`);
    return data;
  },

  create: async (request: CreateTeamMemberRequest): Promise<TeamMember> => {
    const { data } = await api.post<TeamMember>('/team-members', request);
    return data;
  },

  update: async (id: number, request: UpdateTeamMemberRequest): Promise<TeamMember> => {
    const { data } = await api.put<TeamMember>(`/team-members/${id}`, request);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/team-members/${id}`);
  },
};
