import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UserPreferencesSchema, ApiError, ApiResponse, RecommendationResponse, Book } from '@/types';
import { analyzeUserPreferences } from '@/lib/llm';

const MAX_BOOKS_PER_PAGE = 4;

// Spice level mapping
const SPICE_LEVEL_MAP = {
    'Sweet': ['Sweet'],
    'Mild': ['Sweet', 'Mild'],
    'Medium': ['Sweet', 'Mild', 'Medium'],
    'Hot': ['Sweet', 'Mild', 'Medium', 'Hot'],
    'Scorching': ['Sweet', 'Mild', 'Medium', 'Hot', 'Scorching'],
    'Inferno': ['Sweet', 'Mild', 'Medium', 'Hot', 'Scorching', 'Inferno']
} as const;

type SpiceLevel = keyof typeof SPICE_LEVEL_MAP;
type ScoredBook = {
    book: Book;
    score: number;
};

export async function POST(request: Request): Promise<NextResponse<ApiResponse<RecommendationResponse>>> {
    try {
        const body = await request.json();
        console.log('Request body:', body);
        
        // Extract message and book lists from the request
        const { message, readBooks = [], notInterestedBooks = [], previouslySeenBooks = [] } = body;
        
        if (!message) {
            throw new ApiError('Message is required', 400, 'MISSING_MESSAGE');
        }

        // Analyze user preferences using OpenAI
        let preferences;
        try {
            preferences = await analyzeUserPreferences(message);
            console.log('Analyzed preferences:', preferences);
        } catch (error) {
            console.error('Error analyzing preferences:', error);
            if (error instanceof Error) {
                console.error('Error details:', {
                    message: error.message,
                    name: error.name,
                    stack: error.stack,
                    cause: error.cause
                });
            }
            // Fallback to default preferences if analysis fails
            preferences = {
                spiceLevel: 'Medium',
                genres: ['contemporary', 'romantic comedy'],
                contentWarnings: [],
                excludedWarnings: []
            };
        }
        
        // Build query conditions
        const conditions: any = {};
        
        // Add genre conditions
        if (preferences?.genres?.length > 0) {
            conditions.tags = {
                some: {
                    OR: preferences.genres.map((genre: string) => ({
                        name: {
                            contains: genre.toLowerCase()
                        }
                    }))
                }
            };
        }

        // Add spice level condition
        if (preferences?.spiceLevel) {
            const spiceLevels = SPICE_LEVEL_MAP[preferences.spiceLevel as keyof typeof SPICE_LEVEL_MAP];
            if (spiceLevels) {
                conditions.spiceLevel = {
                    in: spiceLevels
                };
            }
        }

        // Add rating condition
        conditions.rating = {
            gte: 3.5,
            lte: 5.0
        };
        
        // Exclude previously seen books
        if (previouslySeenBooks.length > 0) {
            conditions.id = {
                notIn: previouslySeenBooks
            };
        }

        // Exclude books with content warnings the user wants to avoid
        if (preferences?.excludedWarnings?.length > 0) {
            conditions.NOT = {
                contentWarnings: {
                    some: {
                        name: {
                            in: preferences.excludedWarnings
                        }
                    }
                }
            };
        }

        console.log('Query conditions:', JSON.stringify(conditions, null, 2));

        // Execute the query with timeout
        const queryPromise = prisma.book.findMany({
            where: conditions,
            include: {
                tags: true,
                contentWarnings: true
            },
            take: MAX_BOOKS_PER_PAGE * 3,
            orderBy: [
                {
                    numRatings: 'desc'
                },
                {
                    rating: 'desc'
                }
            ]
        }).then((books: Book[]) => {
            console.log('Raw books from database:', books.length);
            if (books.length > 0) {
                console.log('Sample book:', {
                    id: books[0].id,
                    title: books[0].title,
                    tags: books[0].tags.map(t => t.name)
                });
            }
            return books;
        });

        // Add timeout to the query
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Database query timeout')), 5000);
        });

        // Race the query against the timeout
        const books = await Promise.race([queryPromise, timeoutPromise]) as Book[];
        console.log('Found books:', books.length);
        if (books.length > 0) {
            console.log('First book details:', {
                id: books[0].id,
                title: books[0].title,
                rating: books[0].rating,
                numRatings: books[0].numRatings,
                tags: books[0].tags.map(t => t.name)
            });
        }

        if (!books || books.length === 0) {
            console.log('No books found with conditions:', conditions);
            throw new ApiError('No books found matching your criteria', 404, 'NO_BOOKS_FOUND');
        }

        // Score and filter books
        const scoredBooks = books.map(book => {
            let score = 0;
            
            // Base score for all books
            score += 1;
            
            // Score based on rating
            if (book.rating) {
                score += (book.rating - 3.5) * 2; // Higher ratings get more points
            }
            
            // Score based on number of ratings
            if (book.numRatings) {
                score += Math.min(book.numRatings / 1000, 1); // More ratings = more points
            }
            
            // Score based on tags
            if (book.tags) {
                book.tags.forEach(tag => {
                    const tagName = (tag as any).name?.toLowerCase() || '';
                    if (preferences?.genres?.some((genre: string) => tagName.includes(genre.toLowerCase()))) {
                        score += 2; // Matching genre tags get more points
                    }
                });
            }
            
            // Score based on spice level
            if (book.spiceLevel && preferences?.spiceLevel) {
                const bookSpiceLevels = SPICE_LEVEL_MAP[book.spiceLevel as keyof typeof SPICE_LEVEL_MAP] || [];
                const preferredSpiceLevels = SPICE_LEVEL_MAP[preferences.spiceLevel as keyof typeof SPICE_LEVEL_MAP] || [];
                if (bookSpiceLevels.some(level => preferredSpiceLevels.includes(level as any))) {
                    score += 3; // Matching spice level gets more points
                }
            }
            
            // Penalize books with excluded content warnings
            if (book.contentWarnings && preferences?.excludedWarnings) {
                const hasExcludedWarning = book.contentWarnings.some(warning => 
                    preferences.excludedWarnings.some((excluded: string) => 
                        warning.name.toLowerCase().includes(excluded.toLowerCase())
                    )
                );
                if (hasExcludedWarning) {
                    score -= 5; // Bigger penalty for excluded warnings
                }
            }
            
            return { ...book, score };
        }).sort((a, b) => b.score - a.score)
          .slice(0, 10);

        console.log('Selected top books:', scoredBooks.length);
        if (scoredBooks.length > 0) {
            console.log('Top book score:', scoredBooks[0].score);
        }

        // Transform books to match the expected format
        const transformedBooks = scoredBooks.map(book => ({
            id: book.id,
            title: book.title,
            author: book.author,
            url: book.url,
            rating: book.rating,
            numRatings: book.numRatings,
            spiceLevel: book.spiceLevel,
            summary: book.summary,
            tags: book.tags.map(tag => ({
                id: tag.id,
                name: tag.name.split('(')[0].trim(),
                count: parseInt(tag.name.match(/\((\d+)\)/)?.[1] || '0')
            })),
            contentWarnings: book.contentWarnings.map(cw => ({
                id: cw.id,
                name: cw.name.split('(')[0].trim(),
                count: parseInt(cw.name.match(/\((\d+)\)/)?.[1] || '0')
            })),
            series: null,
            seriesNumber: book.seriesNumber,
            pageCount: null,
            publishedDate: book.publishedDate,
            scrapedStatus: book.scrapedStatus,
            createdAt: book.createdAt,
            updatedAt: book.updatedAt
        }));

        console.log('Transformed books:', transformedBooks.length);

        return NextResponse.json({
            status: 200,
            message: 'Success',
            data: {
                books: transformedBooks,
                total: transformedBooks.length,
                page: 1,
                hasMore: false
            }
        });
    } catch (error) {
        console.error('Error in recommendation route:', error);
        if (error instanceof ApiError) {
            return NextResponse.json({
                status: error.statusCode,
                message: error.message,
                code: error.code,
                data: {
                    books: [],
                    total: 0,
                    hasMore: false
                }
            }, { status: error.statusCode });
        }
        return NextResponse.json({
            status: 500,
            message: 'Internal server error',
            code: 'INTERNAL_ERROR',
            data: {
                books: [],
                total: 0,
                hasMore: false
            }
        }, { status: 500 });
    }
} 