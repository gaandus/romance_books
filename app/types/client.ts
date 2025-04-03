export interface Book {
  id: string;
  title: string;
  author: string;
  url: string;
  averageRating: number;
  ratingsCount: number;
  spiceLevel: string | null;
  summary: string;
  tags: string[];
  contentWarnings: string[];
  series: string | null;
  seriesNumber: number | null;
  pageCount: number | null;
  publishedDate: Date | null;
  scrapedStatus: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Filters {
  min_rating?: number;
  tags?: string[];
  filters?: string[];
  content_warnings?: string[];
  spice_level?: string;
  page_count?: number;
  min_spice_level?: string;
  max_spice_level?: string;
}

export interface Refinement {
  question: string;
  options: string[];
}

export interface LastPreferences {
  text: string;
  filters?: Filters;
} 