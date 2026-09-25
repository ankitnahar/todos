import api from './api';
import type {
  Note,
  SubNote,
  CreateNoteRequest,
  UpdateNoteRequest,
  CreateSubNoteRequest,
  UpdateSubNoteRequest,
  NoteFilters,
  HotTopicItem,
  Stats,
} from '@/types';

export const notesApi = {
  getAll: async (filters?: NoteFilters): Promise<Note[]> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.tagIds?.length) {
      filters.tagIds.forEach(id => params.append('tagIds', id.toString()));
    }
    if (filters?.bucketIds?.length) {
      filters.bucketIds.forEach(id => params.append('bucketIds', id.toString()));
    }
    if (filters?.teamMemberIds?.length) {
      filters.teamMemberIds.forEach(id => params.append('teamMemberIds', id.toString()));
    }
    if (filters?.trackStatus && filters.trackStatus !== 'all') {
      params.append('trackStatus', filters.trackStatus);
    }
    if (filters?.tagIds?.length) {
      params.append('tagMatchMode', filters.tagMatchMode || 'AND');
    }
    const { data } = await api.get<Note[]>(`/notes?${params.toString()}`);
    return data;
  },

  getById: async (id: number): Promise<Note> => {
    const { data } = await api.get<Note>(`/notes/${id}`);
    return data;
  },

  create: async (request: CreateNoteRequest): Promise<Note> => {
    const { data } = await api.post<Note>('/notes', request);
    return data;
  },

  update: async (id: number, request: UpdateNoteRequest): Promise<Note> => {
    const { data } = await api.put<Note>(`/notes/${id}`, request);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/notes/${id}`);
  },

  toggleFavorite: async (id: number): Promise<Note> => {
    const { data } = await api.post<Note>(`/notes/${id}/toggle-favorite`);
    return data;
  },

  toggleHotTopic: async (id: number): Promise<Note> => {
    const { data } = await api.post<Note>(`/notes/${id}/toggle-hot-topic`);
    return data;
  },

  trackToday: async (id: number): Promise<Note> => {
    const { data } = await api.post<Note>(`/notes/${id}/track-today`);
    return data;
  },

  untrackToday: async (id: number): Promise<Note> => {
    const { data } = await api.post<Note>(`/notes/${id}/untrack-today`);
    return data;
  },

  moveToBucket: async (id: number, bucketId: number): Promise<Note> => {
    const { data } = await api.post<Note>(`/notes/${id}/move-bucket`, { bucketId });
    return data;
  },

  duplicate: async (id: number): Promise<Note> => {
    const { data } = await api.post<Note>(`/notes/${id}/duplicate`);
    return data;
  },

  getDeleted: async (): Promise<Note[]> => {
    const { data } = await api.get<Note[]>('/notes/deleted');
    return data;
  },

  restore: async (id: number): Promise<Note> => {
    const { data } = await api.post<Note>(`/notes/${id}/restore`);
    return data;
  },

  hardDelete: async (id: number): Promise<void> => {
    await api.delete(`/notes/${id}/hard-delete`);
  },

  getHotTopics: async (): Promise<HotTopicItem[]> => {
    const { data } = await api.get<HotTopicItem[]>('/notes/hot-topics');
    return data;
  },

  getStats: async (): Promise<Stats> => {
    const { data } = await api.get<Stats>('/notes/stats');
    return data;
  },
};

export const subNotesApi = {
  create: async (noteId: number, request: CreateSubNoteRequest): Promise<SubNote> => {
    const { data } = await api.post<SubNote>(`/notes/${noteId}/subnotes`, request);
    return data;
  },

  update: async (subNoteId: number, request: UpdateSubNoteRequest): Promise<SubNote> => {
    const { data } = await api.put<SubNote>(`/notes/subnotes/${subNoteId}`, request);
    return data;
  },

  delete: async (subNoteId: number): Promise<void> => {
    await api.delete(`/notes/subnotes/${subNoteId}`);
  },

  toggleHotTopic: async (subNoteId: number): Promise<SubNote> => {
    const { data } = await api.post<SubNote>(`/notes/subnotes/${subNoteId}/toggle-hot-topic`);
    return data;
  },

  trackToday: async (subNoteId: number): Promise<SubNote> => {
    const { data } = await api.post<SubNote>(`/notes/subnotes/${subNoteId}/track-today`);
    return data;
  },

  untrackToday: async (subNoteId: number): Promise<SubNote> => {
    const { data } = await api.post<SubNote>(`/notes/subnotes/${subNoteId}/untrack-today`);
    return data;
  },

  moveToBucket: async (subNoteId: number, bucketId: number): Promise<SubNote> => {
    const { data } = await api.post<SubNote>(`/notes/subnotes/${subNoteId}/move-bucket`, { bucketId });
    return data;
  },

  moveToNote: async (subNoteId: number, noteId: number): Promise<SubNote> => {
    const { data } = await api.post<SubNote>(`/notes/subnotes/${subNoteId}/move-note`, { noteId });
    return data;
  },

  convertToNote: async (subNoteId: number): Promise<Note> => {
    const { data } = await api.post<Note>(`/notes/subnotes/${subNoteId}/convert-to-note`);
    return data;
  },

  linkToNote: async (subNoteId: number, noteId: number): Promise<SubNote> => {
    const { data } = await api.post<SubNote>(`/notes/subnotes/${subNoteId}/link-to-note`, { noteId });
    return data;
  },

  unlinkFromNote: async (subNoteId: number, noteId: number): Promise<void> => {
    await api.post(`/notes/subnotes/${subNoteId}/unlink-from-note`, { noteId });
  },
};
