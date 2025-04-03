import { PrismaClient } from '@prisma/client';
import 'server-only';
import { Book } from '@/types/book';

// Singleton pattern for PrismaClient
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Cache for frequently accessed data
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { data: any; timestamp: number }>();

function getCachedData(key: string): any | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
}

function setCachedData(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
}

// Cache for unique filters and tags
let uniqueFiltersCache: string[] = [];
let uniqueTagsCache: string[] = [];

// Cache expiration time (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000;
let lastCacheTime = 0;

export interface BookQueryParams {
  filters?: string[];
  tags?: string[];
  minRating?: number;
  maxSpiceLevel?: number;
  minSpiceLevel?: number;
  authorIncludes?: string;
  titleIncludes?: string;
  excludeIds?: string[];
  page?: number;
  pageSize?: number;
}

export async function loadBooks(params: BookQueryParams = {}): Promise<{ books: Book[], total: number }> {
  const {
    filters,
    tags,
    minRating,
    maxSpiceLevel,
    minSpiceLevel,
    authorIncludes,
    titleIncludes,
    excludeIds,
    page = 1,
    pageSize = 20
  } = params;

  const skip = (page - 1) * pageSize;
  const cacheKey = `books-${JSON.stringify(params)}`;

  // Check cache first
  const cached = getCachedData(cacheKey);
  if (cached) {
    return cached;
  }

  // Build the where clause
  const where: any = {
    AND: []
  };

  if (excludeIds?.length) {
    where.AND.push({ id: { notIn: excludeIds } });
  }

  if (filters?.length) {
    where.AND.push({
      filters: {
        some: {
          name: { in: filters }
        }
      }
    });
  }

  if (tags?.length) {
    where.AND.push({
      tags: {
        some: {
          name: { in: tags }
        }
      }
    });
  }

  if (minRating !== undefined) {
    where.AND.push({ averageRating: { gte: minRating } });
  }

  if (maxSpiceLevel !== undefined) {
    where.AND.push({ spiceLevel: { lte: maxSpiceLevel } });
  }

  if (minSpiceLevel !== undefined) {
    where.AND.push({ spiceLevel: { gte: minSpiceLevel } });
  }

  if (authorIncludes) {
    where.AND.push({ author: { contains: authorIncludes, mode: 'insensitive' } });
  }

  if (titleIncludes) {
    where.AND.push({ title: { contains: titleIncludes, mode: 'insensitive' } });
  }

  // If no conditions, remove the AND array
  if (where.AND.length === 0) {
    delete where.AND;
  }

  // Get total count and books in parallel
  const [total, books] = await Promise.all([
    prisma.book.count({ where }),
    prisma.book.findMany({
      where,
      skip,
      take: pageSize,
      include: {
        tags: true,
        filters: true,
        contentWarnings: true
      },
      orderBy: {
        averageRating: 'desc'
      }
    })
  ]);

  const transformedBooks: Book[] = books.map(book => ({
    id: book.id,
    title: book.title,
    author: book.author,
    url: book.url,
    averageRating: book.averageRating,
    ratingsCount: book.ratingsCount,
    spiceLevel: book.spiceLevel || null,
    summary: book.summary,
    tags: book.tags.map((tag: { name: string }) => tag.name),
    contentWarnings: book.contentWarnings.map((warning: { name: string }) => warning.name),
    series: book.series || null,
    seriesNumber: book.seriesNumber || null,
    pageCount: book.pageCount || null,
    publishedDate: book.publishedDate || null,
    scrapedStatus: book.scrapedStatus || null,
    createdAt: book.createdAt,
    updatedAt: book.updatedAt
  }));

  const result = { books: transformedBooks, total };
  setCachedData(cacheKey, result);
  return result;
}

export async function getUniqueFilters(): Promise<string[]> {
  const cacheKey = 'unique-filters';
  const cached = getCachedData(cacheKey);
  if (cached) {
    return cached;
  }

  const filters = await prisma.filter.findMany({
    select: {
      name: true
    },
    orderBy: {
      name: 'asc'
    }
  });

  const result = filters.map(f => f.name);
  setCachedData(cacheKey, result);
  return result;
}

export async function getUniqueTags(): Promise<string[]> {
  const cacheKey = 'unique-tags';
  const cached = getCachedData(cacheKey);
  if (cached) {
    return cached;
  }

  const tags = await prisma.tag.findMany({
    select: {
      name: true
    },
    orderBy: {
      name: 'asc'
    }
  });

  const result = tags.map(t => t.name);
  setCachedData(cacheKey, result);
  return result;
}

export async function getBookById(id: string): Promise<Book | undefined> {
  const cacheKey = `book-${id}`;
  const cached = getCachedData(cacheKey);
  if (cached) {
    return cached;
  }

  const book = await prisma.book.findUnique({
    where: { id },
    include: {
      tags: true,
      filters: true,
      contentWarnings: true
    }
  });

  if (!book) {
    return undefined;
  }

  const transformedBook: Book = {
    id: book.id,
    title: book.title,
    author: book.author,
    url: book.url,
    averageRating: book.averageRating,
    ratingsCount: book.ratingsCount,
    spiceLevel: book.spiceLevel || null,
    summary: book.summary,
    tags: book.tags.map((tag: { name: string }) => tag.name),
    contentWarnings: book.contentWarnings.map((warning: { name: string }) => warning.name),
    series: book.series || null,
    seriesNumber: book.seriesNumber || null,
    pageCount: book.pageCount || null,
    publishedDate: book.publishedDate || null,
    scrapedStatus: book.scrapedStatus || null,
    createdAt: book.createdAt,
    updatedAt: book.updatedAt
  };

  setCachedData(cacheKey, transformedBook);
  return transformedBook;
} 