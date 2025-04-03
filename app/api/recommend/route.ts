import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UserPreferencesSchema, ApiError, ApiResponse, RecommendationResponse, Book } from '@/types';

const MAX_BOOKS_PER_PAGE = 4;

// Spice level mapping
const SPICE_LEVEL_MAP = {
    'Sweet': ['Sweet'],
    'Mild': ['Sweet', 'Mild'],
    'Medium': ['Sweet', 'Mild', 'Medium'],
    'Hot': ['Sweet', 'Mild', 'Medium', 'Hot'],
    'Inferno': ['Sweet', 'Mild', 'Medium', 'Hot', 'Inferno']
} as const;

type ScoredBook = {
    book: Book;
    score: number;
};

export async function POST(request: Request): Promise<NextResponse<ApiResponse<RecommendationResponse>>> {
    try {
        const body = await request.json();
        
        // Validate request body
        const preferences = UserPreferencesSchema.parse(body);
        
        // Build query conditions
        const conditions: any = {};
        
        // Add genre conditions if specified
        if (preferences.genres && preferences.genres.length > 0) {
            conditions.tags = {
                some: {
                    name: {
                        in: preferences.genres.map(genre => genre.toLowerCase())
                    }
                }
            };
        }

        // Add spice level condition if specified
        if (preferences.spiceLevel) {
            const spiceLevels = SPICE_LEVEL_MAP[preferences.spiceLevel];
            if (spiceLevels) {
                conditions.spiceLevel = {
                    in: spiceLevels
                };
            }
        }

        // Add rating condition
        conditions.averageRating = {
            gte: preferences.minRating,
            lte: preferences.maxRating
        };

        // Execute the query with timeout
        const queryPromise = prisma.book.findMany({
            where: conditions,
            include: {
                tags: true,
                contentWarnings: true
            },
            take: MAX_BOOKS_PER_PAGE * 3,
            orderBy: [
                { ratingsCount: 'desc' },
                { averageRating: 'desc' }
            ]
        });

        // Add timeout to the query
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Query timeout')), 5000);
        });

        let books: Book[];
        try {
            books = await Promise.race([queryPromise, timeoutPromise]) as Book[];
            
            // Score books based on how well they match criteria
            const scoredBooks: ScoredBook[] = books.map((book: Book) => {
                let score = 0;
                
                // Score based on matching genres
                if (preferences.genres) {
                    const matchingGenres = book.tags.filter((tag) => 
                        preferences.genres.includes(tag.name.toLowerCase())
                    ).length;
                    score += (matchingGenres / preferences.genres.length) * 4;
                }

                // Score based on rating
                const ratingScore = 1 - Math.abs(book.averageRating - 4.0) / 1.5;
                score += ratingScore;

                // Score based on number of ratings
                const reviewScore = Math.min(book.ratingsCount / 1000, 1);
                score += reviewScore;

                // Add randomization factor
                score += Math.random() * 0.5;

                return { book, score };
            });

            // Sort by score and take top books
            books = scoredBooks
                .sort((a: ScoredBook, b: ScoredBook) => b.score - a.score)
                .map((item: ScoredBook) => item.book)
                .slice(0, MAX_BOOKS_PER_PAGE);

        } catch (error) {
            // Try a simpler query as fallback
            books = await prisma.book.findMany({
                where: {
                    averageRating: { 
                        gte: preferences.minRating,
                        lte: preferences.maxRating
                    },
                    tags: preferences.genres ? {
                        some: {
                            name: {
                                in: preferences.genres.map(genre => genre.toLowerCase())
                            }
                        }
                    } : undefined
                },
                include: {
                    tags: true,
                    contentWarnings: true
                },
                take: MAX_BOOKS_PER_PAGE * 3,
                orderBy: [
                    { ratingsCount: 'desc' },
                    { averageRating: 'desc' }
                ]
            }) as Book[];
            
            // Apply the same scoring system to fallback results
            const scoredBooks: ScoredBook[] = books.map((book: Book) => {
                let score = 0;
                
                if (preferences.genres) {
                    const matchingGenres = book.tags.filter((tag) => 
                        preferences.genres.includes(tag.name.toLowerCase())
                    ).length;
                    score += (matchingGenres / preferences.genres.length) * 4;
                }

                const ratingScore = 1 - Math.abs(book.averageRating - 4.0) / 1.5;
                score += ratingScore;

                const reviewScore = Math.min(book.ratingsCount / 1000, 1);
                score += reviewScore;

                score += Math.random() * 0.5;

                return { book, score };
            });

            books = scoredBooks
                .sort((a: ScoredBook, b: ScoredBook) => b.score - a.score)
                .map((item: ScoredBook) => item.book)
                .slice(0, MAX_BOOKS_PER_PAGE);
        }

        return NextResponse.json({
            data: {
                books,
                total: books.length,
                hasMore: false // TODO: Implement pagination
            }
        });

    } catch (error) {
        console.error('Error in recommend route:', error);
        
        if (error instanceof ApiError) {
            return NextResponse.json(
                { 
                    data: { books: [], total: 0, hasMore: false },
                    error: error.message 
                },
                { status: error.statusCode }
            );
        }

        return NextResponse.json(
            { 
                data: { books: [], total: 0, hasMore: false },
                error: 'Internal server error' 
            },
            { status: 500 }
        );
    }
} 