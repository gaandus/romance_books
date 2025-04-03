import { Book } from '@/types/book';

export type BookWithRelations = Book;

export interface LLMPreferences {
  tags?: string[];
  contentWarnings?: string[];
  spiceLevel: string | null;
  pageCount: number | null;
  excludeIds?: string[];
} 