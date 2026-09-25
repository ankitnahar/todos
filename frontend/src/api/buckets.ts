import api from './api';
import type { Bucket } from '@/types';

export interface CreateBucketRequest {
  name: string;
  color: string;
  priority: number;
  isDefault?: boolean;
}

export interface UpdateBucketRequest {
  name?: string;
  color?: string;
  priority?: number;
  isDefault?: boolean;
}

export const bucketsApi = {
  getAll: async (): Promise<Bucket[]> => {
    const { data } = await api.get<Bucket[]>('/buckets');
    return data;
  },

  getById: async (id: number): Promise<Bucket> => {
    const { data } = await api.get<Bucket>(`/buckets/${id}`);
    return data;
  },

  create: async (request: CreateBucketRequest): Promise<Bucket> => {
    const { data } = await api.post<Bucket>('/buckets', request);
    return data;
  },

  update: async (id: number, request: UpdateBucketRequest): Promise<Bucket> => {
    const { data } = await api.put<Bucket>(`/buckets/${id}`, request);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/buckets/${id}`);
  },
};
