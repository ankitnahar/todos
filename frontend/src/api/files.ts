import api from './api';
import type { FileAttachment } from '@/types';

export const filesApi = {
  upload: async (file: File, noteId?: number, subNoteId?: number): Promise<FileAttachment> => {
    const formData = new FormData();
    formData.append('file', file);
    if (noteId) formData.append('noteId', noteId.toString());
    if (subNoteId) formData.append('subNoteId', subNoteId.toString());

    const { data } = await api.post<FileAttachment>(
      '/files/upload',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data;
  },

  getByNoteId: async (noteId: number): Promise<FileAttachment[]> => {
    const { data } = await api.get<FileAttachment[]>(`/files/note/${noteId}`);
    return data;
  },

  getBySubNoteId: async (subNoteId: number): Promise<FileAttachment[]> => {
    const { data } = await api.get<FileAttachment[]>(`/files/subnote/${subNoteId}`);
    return data;
  },

  download: async (fileId: number): Promise<Blob> => {
    const { data } = await api.get(`/files/${fileId}/download`, {
      responseType: 'blob',
    });
    return data;
  },

  delete: async (fileId: number): Promise<void> => {
    await api.delete(`/files/${fileId}`);
  },

  getDownloadUrl: (fileId: number): string => {
    return `http://localhost:9090/api/files/${fileId}/download`;
  },
};
