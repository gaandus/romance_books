import { NextRequest, NextResponse } from 'next/server';
import { loadBooks } from '@/app/utils/dataLoader';
import type { Book } from '@/types/book';

function findSimilarBooks(targetBook: Book, allBooks: Book[], limit: number = 5): Book[] {
  // Filter out the target book
  const otherBooks = allBooks.filter(book => book.id !== targetBook.id);
  
  // Score each book based on similarity
  const scoredBooks = otherBooks.map(book => {
    let score = 0;
    
    // Match spice level
    if (book.spiceLevel === targetBook.spiceLevel) {
      score += 2;
    }
    
    // Match tags
    const matchingTags = book.tags.filter(tag => targetBook.tags.includes(tag));
    score += matchingTags.length;
    
    // Match content warnings
    const matchingWarnings = book.contentWarnings.filter(warning => 
      targetBook.contentWarnings.includes(warning)
    );
    score += matchingWarnings.length;
    
    // Consider rating
    score += book.averageRating;
    
    return { book, score };
  });
  
  // Sort by score and return top books
  return scoredBooks
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.book);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookId } = body;

    if (!bookId) {
      return NextResponse.json(
        { error: 'Book ID is required' },
        { status: 400 }
      );
    }

    // Load all books
    const { books: allBooks } = await loadBooks();
    
    // Find the target book
    const targetBook = allBooks.find(book => book.id === bookId);
    
    if (!targetBook) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }
    
    // Find similar books
    const similarBooks = findSimilarBooks(targetBook, allBooks);

    return NextResponse.json({ 
      recommendations: similarBooks,
      totalBooks: similarBooks.length,
      hasMore: similarBooks.length === 5
    });
  } catch (error) {
    console.error('Error in similar books API:', error);
    return NextResponse.json(
      { error: 'Failed to get similar books' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId');

    if (!bookId) {
      return NextResponse.json(
        { error: 'Book ID is required' },
        { status: 400 }
      );
    }

    // Load all books
    const { books: allBooks } = await loadBooks();
    
    // Find the target book
    const targetBook = allBooks.find(book => book.id === bookId);
    
    if (!targetBook) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }
    
    // Find similar books
    const similarBooks = findSimilarBooks(targetBook, allBooks);

    return NextResponse.json({ 
      recommendations: similarBooks,
      totalBooks: similarBooks.length,
      hasMore: similarBooks.length === 5
    });
  } catch (error) {
    console.error('Error in similar books API:', error);
    return NextResponse.json(
      { error: 'Failed to get similar books' },
      { status: 500 }
    );
  }
} 