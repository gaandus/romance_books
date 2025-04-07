export interface Book {
  id: string;
  title: string;
  url: string;
  titleScraped: string | null;
  authorScraped: string | null;
  seriesName: string | null;
  seriesNumber: number | null;
  rating: number | null;
  numRatings: number | null;
  pages: number | null;
  publishedDate: Date | null;
  spiceLevel: string | null;
  summary: string | null;
  scrapedStatus: string | null;
  createdAt: Date;
  updatedAt: Date;
  tags: { id: string; name: string; count: number; }[];
  contentWarnings: { id: string; name: string; count: number; }[];
  filters: { id: string; name: string; count: number; }[];
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