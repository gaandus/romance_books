import { NextResponse } from 'next/server';
import { analyzeUserPreferences } from '@/lib/llm';
import { loadBooks } from '@/app/utils/dataLoader';
import { Book } from '@/types/book';

function normalizeString(str: string): string {
  return str.toLowerCase().trim();
}

function stringsMatch(str1: string, str2: string): boolean {
  const normalized1 = normalizeString(str1);
  const normalized2 = normalizeString(str2);
  return normalized1 === normalized2 || 
         normalized2.includes(normalized1) || 
         normalized1.includes(normalized2);
}

function filterBooksByPreferences(books: Book[], preferences: any, excludeIds: string[] = []): Book[] {
  return books.filter((book: Book) => {
    // Exclude books by ID
    if (excludeIds.includes(book.id)) {
      return false;
    }

    // Filter by spice level if specified
    if (preferences.spiceLevel && book.spiceLevel) {
      const spiceLevels = ['Sweet', 'Mild', 'Medium', 'Hot', 'Scorching', 'Inferno'];
      const minSpiceIndex = spiceLevels.indexOf(preferences.spiceLevel);
      if (minSpiceIndex >= 0) {
        const bookSpiceIndex = spiceLevels.indexOf(book.spiceLevel);
        if (bookSpiceIndex < minSpiceIndex) return false;
      }
    }

    // Filter by genres if specified
    if (preferences.genres?.length) {
      const hasMatchingGenre = preferences.genres.some((genre: string) =>
        book.tags.some((tag: string) => stringsMatch(genre, tag))
      );
      if (!hasMatchingGenre) return false;
    }

    // Filter by content warnings if specified
    if (preferences.contentWarnings?.length) {
      const hasMatchingWarning = preferences.contentWarnings.some((warning: string) =>
        book.contentWarnings.some((cw: string) => stringsMatch(warning, cw))
      );
      if (!hasMatchingWarning) return false;
    }

    // Filter by excluded warnings if specified
    if (preferences.excludedWarnings?.length) {
      const hasExcludedWarning = preferences.excludedWarnings.some((warning: string) =>
        book.contentWarnings.some((cw: string) => stringsMatch(warning, cw))
      );
      if (hasExcludedWarning) return false;
    }

    // Filter by minimum rating
    if (preferences.minimumRating) {
      if (book.averageRating < preferences.minimumRating) return false;
    }

    // Filter by keywords if specified
    if (preferences.keywords?.length) {
      const hasMatchingKeyword = preferences.keywords.some((keyword: string) =>
        stringsMatch(keyword, book.summary) ||
        book.tags.some((tag: string) => stringsMatch(keyword, tag))
      );
      if (!hasMatchingKeyword) return false;
    }

    return true;
  });
}

export async function POST(request: Request) {
  try {
    const { message, readBooks, notInterestedBooks } = await request.json();

    // Analyze user preferences using OpenAI
    const preferences = await analyzeUserPreferences(message);

    // Load books from the database
    const { books } = await loadBooks();

    // Get all books that match preferences
    const matchingBooks = filterBooksByPreferences(books, preferences);

    // Sort by rating
    const sortedBooks = matchingBooks.sort((a: Book, b: Book) => b.averageRating - a.averageRating);

    // Get initial recommendations (excluding read and not interested books)
    const excludedIds = [...(readBooks || []), ...(notInterestedBooks || [])];
    let recommendations = filterBooksByPreferences(sortedBooks, preferences, excludedIds).slice(0, 5);

    // If we need more recommendations to reach 5, get them from the full matching books list
    if (recommendations.length < 5) {
      const remainingCount = 5 - recommendations.length;
      const additionalBooks = sortedBooks
        .filter(book => !excludedIds.includes(book.id) && !recommendations.some(r => r.id === book.id))
        .slice(0, remainingCount);
      recommendations = [...recommendations, ...additionalBooks];
    }

    return NextResponse.json({ 
      recommendations,
      totalBooks: recommendations.length,
      hasMore: recommendations.length === 5
    });
  } catch (error) {
    console.error('Error in recommendations route:', error);
    return NextResponse.json(
      { error: 'Failed to get recommendations' },
      { status: 500 }
    );
  }
} 