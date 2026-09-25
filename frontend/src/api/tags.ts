import api from './api';
import type { Tag } from '@/types';

export interface CreateTagRequest {
  name: string;
}

export interface UpdateTagRequest {
  name?: string;
}

export const tagsApi = {
  getAll: async (): Promise<Tag[]> => {
    const { data } = await api.get<Tag[]>('/tags');
    return data;
  },

  getById: async (id: number): Promise<Tag> => {
    const { data } = await api.get<Tag>(`/tags/${id}`);
    return data;
  },

  create: async (request: CreateTagRequest): Promise<Tag> => {
    const { data } = await api.post<Tag>('/tags', request);
    return data;
  },

  update: async (id: number, request: UpdateTagRequest): Promise<Tag> => {
    const { data } = await api.put<Tag>(`/tags/${id}`, request);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/tags/${id}`);
  },
};
