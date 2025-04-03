import { z } from 'zod';

// Zod schemas for validation
export const BookSchema = z.object({
  id: z.string(),
  title: z.string(),
  author: z.string(),
  averageRating: z.number().min(0).max(5),
  ratingsCount: z.number().min(0),
  spiceLevel: z.string(),
  summary: z.string(),
  url: z.string().url(),
  tags: z.array(z.object({
    id: z.string(),
    name: z.string(),
    count: z.number().min(1)
  })),
  contentWarnings: z.array(z.object({
    id: z.string(),
    name: z.string(),
    count: z.number().min(1)
  })),
  series: z.string().nullable(),
  seriesNumber: z.number().nullable(),
  pageCount: z.number().nullable(),
  publishedDate: z.date().nullable(),
  scrapedStatus: z.string(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const UserPreferencesSchema = z.object({
  genres: z.array(z.string()).min(1),
  spiceLevel: z.enum(['Sweet', 'Mild', 'Medium', 'Hot', 'Inferno']).optional(),
  excludeRead: z.boolean().default(true),
  excludeNotInterested: z.boolean().default(true),
  minRating: z.number().min(0).max(5).default(3.5),
  maxRating: z.number().min(0).max(5).default(5.0)
});

export const RecommendationResponseSchema = z.object({
  books: z.array(BookSchema),
  total: z.number(),
  hasMore: z.boolean()
});

// TypeScript types derived from Zod schemas
export type Book = z.infer<typeof BookSchema>;
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
export type RecommendationResponse = z.infer<typeof RecommendationResponseSchema>;

// API response types
export type ApiResponse<T> = {
  data: T;
  error?: string;
  message?: string;
};

// Error types
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Query parameter types
export type RecommendationQueryParams = {
  genres?: string[];
  spiceLevel?: 'Sweet' | 'Mild' | 'Medium' | 'Hot' | 'Inferno';
  excludeRead?: boolean;
  excludeNotInterested?: boolean;
  minRating?: number;
  maxRating?: number;
  page?: number;
  limit?: number;
}; 