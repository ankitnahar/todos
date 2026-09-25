export interface Tag {
  id: number;
  name: string;
}

export interface Bucket {
  id: number;
  name: string;
  priority: number;
  color: string;
  isDefault: boolean;
}

export interface TeamMember {
  id: number;
  name: string;
}

export interface FileAttachment {
  id: number;
  originalFileName: string;
  storedFileName: string;
  contentType: string;
  fileSize: number;
  noteId?: number;
  subNoteId?: number;
  uploadedAt: string;
}

export interface SubNote {
  id: number;
  header: string;
  description: string;
  linkedNoteId?: number;
  bucketId?: number;
  displayOrder: number;
  hotTopic: boolean;
  createdAt: string;
  updatedAt: string;
  lastTrackedDate?: string;
  noteId: number;
  parentNoteIds?: number[];
  tagIds: number[];
  teamMemberIds: number[];
}

export interface Note {
  id: number;
  name: string;
  details: string;
  createdAt: string;
  updatedAt: string;
  lastTrackedDate?: string;
  favorite: boolean;
  hotTopic: boolean;
  deleted: boolean;
  deletedAt?: string;
  nested: boolean;
  bucketId?: number;
  tagIds: number[];
  teamMemberIds: number[];
  subNotes?: SubNote[];
}

export interface CreateNoteRequest {
  name: string;
  details?: string;
  bucketId?: number;
  tagNames?: string[];
  teamMemberIds?: number[];
  nested?: boolean;
  favorite?: boolean;
  hotTopic?: boolean;
  subNotes?: CreateSubNoteRequest[];
}

export interface UpdateNoteRequest {
  name?: string;
  details?: string;
  bucketId?: number;
  tagNames?: string[];
  teamMemberIds?: number[];
  nested?: boolean;
  favorite?: boolean;
  hotTopic?: boolean;
}

export interface CreateSubNoteRequest {
  header: string;
  description?: string;
  bucketId?: number;
  linkedNoteId?: number;
  displayOrder?: number;
  hotTopic?: boolean;
  tagNames?: string[];
  teamMemberIds?: number[];
}

export interface UpdateSubNoteRequest {
  header?: string;
  description?: string;
  bucketId?: number;
  linkedNoteId?: number;
  displayOrder?: number;
  hotTopic?: boolean;
  tagNames?: string[];
  teamMemberIds?: number[];
}

export interface NoteFilters {
  search?: string;
  tagIds?: number[];
  bucketIds?: number[];
  teamMemberIds?: number[];
  trackStatus?: string;
  tagMatchMode?: 'AND' | 'OR';
}

export interface HotTopicItem {
  type: 'note' | 'subnote';
  id: number;
  title: string;
  details?: string;
  noteId?: number;
  noteName?: string;
  bucketId?: number;
  updatedAt: string;
  tagIds: number[];
  parentTagIds?: number[];
  teamMemberIds: number[];
}

export interface Stats {
  totalNotes: number;
  favoriteNotes: number;
  hotTopicNotes: number;
  hotTopicSubNotes: number;
  deletedNotes: number;
  notesByBucket: Record<number, number>;
  notesByTag: Record<number, number>;
}

export interface BucketViewData {
  bucket: Bucket;
  notes: Note[];
  subNotes: SubNote[];
}
