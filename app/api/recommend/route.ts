import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UserPreferencesSchema, ApiError, ApiResponse, RecommendationResponse, Book } from '@/types';
import { Tag, ContentWarning } from '@/types/book';
import { analyzeUserPreferences } from '@/lib/llm.js';

const MAX_BOOKS_PER_PAGE = 4;

// Spice level mapping
const SPICE_LEVEL_MAP = {
    'Sweet': ['1 of 5'],
    'Mild': ['2 of 5'],
    'Medium': ['3 of 5'],
    'Hot': ['4 of 5'],
    'Scorching': ['5 of 5'],
    'Inferno': ['5 of 5']
} as const;

type SpiceLevel = keyof typeof SPICE_LEVEL_MAP;
type ScoredBook = {
    book: Book;
    score: number;
};

export async function POST(request: Request): Promise<NextResponse<ApiResponse<RecommendationResponse>>> {
    try {
        console.log('API route: Starting request processing');
        const body = await request.json();
        console.log('API route: Request body:', body);
        
        // Extract message from the request
        const { message, readBooks = [], notInterestedBooks = [], previouslySeenBooks = [] } = body;
        
        let preferences: {
            spiceLevel: SpiceLevel | null;
            genres: string[];
            contentWarnings: string[];
            excludedWarnings: string[];
        };
        
        if (!message) {
            console.log('API route: Empty message, using default preferences');
            preferences = {
                spiceLevel: null,
                genres: [],
                contentWarnings: [],
                excludedWarnings: []
            };
        } else {
            // Analyze user preferences using OpenAI
            try {
                console.log('API route: Starting OpenAI analysis');
                console.log('API route: Environment check:', {
                    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
                    openAIKeyLength: process.env.OPENAI_API_KEY?.length,
                    nodeEnv: process.env.NODE_ENV,
                    envKeys: Object.keys(process.env)
                });
                
                preferences = await analyzeUserPreferences(message);
                console.log('API route: Analyzed preferences:', preferences);
                
                // Validate preferences
                if (!preferences || !preferences.spiceLevel || !Array.isArray(preferences.genres)) {
                    console.error('API route: Invalid preferences returned from OpenAI:', preferences);
                    throw new ApiError('Failed to analyze preferences', 500, 'INVALID_PREFERENCES');
                }
            } catch (error) {
                console.error('API route: Error analyzing preferences:', error);
                if (error instanceof Error) {
                    console.error('API route: Error details:', {
                        message: error.message,
                        name: error.name,
                        stack: error.stack,
                        response: (error as any).response?.data,
                        status: (error as any).response?.status,
                        headers: (error as any).response?.headers
                    });
                }
                throw new ApiError('Failed to analyze preferences', 500, 'ANALYSIS_ERROR');
            }
        }
        
        console.log('API route: Building query conditions');
        // Build query conditions
        console.log('API route: Querying database with strict matching (AND)');
        console.log('API route: Spice level debug:', {
            requestedLevel: preferences.spiceLevel,
            mappedLevels: preferences.spiceLevel ? SPICE_LEVEL_MAP[preferences.spiceLevel] : ['Sweet', 'Mild', 'Medium', 'Hot', 'Scorching', 'Inferno'],
            allLevels: Object.keys(SPICE_LEVEL_MAP)
        });

        // Check existing spice levels in the database
        const existingSpiceLevels = await Promise.race([
            prisma.book.findMany({
                select: {
                    spiceLevel: true
                },
                distinct: ['spiceLevel'],
                where: {
                    spiceLevel: {
                        not: null
                    }
                }
            }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Database query timeout')), 5000)
            )
        ]);
        console.log('API route: Existing spice levels in database:', existingSpiceLevels.map((b: { spiceLevel: string | null }) => b.spiceLevel));

        let books = await Promise.race([
            prisma.book.findMany({
                where: {
                    rating: {
                        gte: 3.5,
                        lte: 5
                    },
                    ...(preferences.spiceLevel ? {
                        spiceLevel: {
                            in: SPICE_LEVEL_MAP[preferences.spiceLevel] || []
                        }
                    } : {
                        spiceLevel: {
                            in: ['1 of 5', '2 of 5', '3 of 5', '4 of 5', '5 of 5']
                        }
                    }),
                    ...(preferences.genres && preferences.genres.length > 0 ? {
                        tags: {
                            some: {
                                AND: preferences.genres.map(genre => ({
                                    name: {
                                        startsWith: genre.split('(')[0].trim(),
                                        mode: 'insensitive'
                                    }
                                }))
                            }
                        }
                    } : {}),
                    ...(preferences.contentWarnings && preferences.contentWarnings.length > 0 ? {
                        contentWarnings: {
                            some: {
                                AND: preferences.contentWarnings.map(warning => ({
                                    name: {
                                        startsWith: warning.split('(')[0].trim(),
                                        mode: 'insensitive'
                                    }
                                }))
                            }
                        }
                    } : {}),
                    ...(preferences.excludedWarnings && preferences.excludedWarnings.length > 0 ? {
                        NOT: {
                            contentWarnings: {
                                some: {
                                    OR: preferences.excludedWarnings.map(warning => ({
                                        name: {
                                            startsWith: warning.split('(')[0].trim(),
                                            mode: 'insensitive'
                                        }
                                    }))
                                }
                            }
                        }
                    } : {}),
                    ...(previouslySeenBooks && previouslySeenBooks.length > 0 ? {
                        id: {
                            notIn: previouslySeenBooks
                        }
                    } : {}),
                    ...(readBooks && readBooks.length > 0 ? {
                        id: {
                            notIn: [...(previouslySeenBooks || []), ...readBooks]
                        }
                    } : {}),
                    ...(notInterestedBooks && notInterestedBooks.length > 0 ? {
                        id: {
                            notIn: [...(previouslySeenBooks || []), ...(readBooks || []), ...notInterestedBooks]
                        }
                    } : {})
                },
                include: {
                    contentWarnings: true,
                    tags: true
                },
                orderBy: {
                    id: 'asc'
                },
                take: MAX_BOOKS_PER_PAGE
            }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Database query timeout')), 5000)
            )
        ]);

        console.log('API route: Found books with strict matching:', books.length);
        console.log('API route: Sample book from database:', {
            id: books[0]?.id,
            title: books[0]?.title,
            author: books[0]?.author,
            spiceLevel: books[0]?.spiceLevel,
            tags: books[0]?.tags,
            contentWarnings: books[0]?.contentWarnings
        });

        // If no books found with strict matching, try less strict matching
        if (books.length === 0) {
            console.log('API route: No books found with strict matching, trying less strict matching');
            const lessStrictQuery = {
                rating: {
                    gte: 3.5,
                    lte: 5
                },
                ...(preferences.spiceLevel ? {
                    spiceLevel: {
                        in: SPICE_LEVEL_MAP[preferences.spiceLevel] || []
                    }
                } : {
                    spiceLevel: {
                        in: ['1 of 5', '2 of 5', '3 of 5', '4 of 5', '5 of 5']
                    }
                }),
                ...(preferences.genres && preferences.genres.length > 0 ? {
                    tags: {
                        some: {
                            OR: preferences.genres.map(genre => ({
                                name: {
                                    contains: genre.split('(')[0].trim(),
                                    mode: 'insensitive'
                                }
                            }))
                        }
                    }
                } : {}),
                ...(preferences.contentWarnings && preferences.contentWarnings.length > 0 ? {
                    contentWarnings: {
                        some: {
                            OR: preferences.contentWarnings.map(warning => ({
                                name: {
                                    startsWith: warning.split('(')[0].trim(),
                                    mode: 'insensitive'
                                }
                            }))
                        }
                    }
                } : {}),
                ...(preferences.excludedWarnings && preferences.excludedWarnings.length > 0 ? {
                    NOT: {
                        contentWarnings: {
                            some: {
                                OR: preferences.excludedWarnings.map(warning => ({
                                    name: {
                                        startsWith: warning.split('(')[0].trim(),
                                        mode: 'insensitive'
                                    }
                                }))
                            }
                        }
                    }
                } : {}),
                ...(previouslySeenBooks && previouslySeenBooks.length > 0 ? {
                    id: {
                        notIn: previouslySeenBooks
                    }
                } : {}),
                ...(readBooks && readBooks.length > 0 ? {
                    id: {
                        notIn: [...(previouslySeenBooks || []), ...readBooks]
                    }
                } : {}),
                ...(notInterestedBooks && notInterestedBooks.length > 0 ? {
                    id: {
                        notIn: [...(previouslySeenBooks || []), ...(readBooks || []), ...notInterestedBooks]
                    }
                } : {})
            };
            
            console.log('API route: Less strict query:', JSON.stringify(lessStrictQuery, null, 2));
            
            books = await Promise.race([
                prisma.book.findMany({
                    where: lessStrictQuery,
                    include: {
                        contentWarnings: true,
                        tags: true
                    },
                    orderBy: {
                        id: 'asc'
                    },
                    take: MAX_BOOKS_PER_PAGE
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Database query timeout')), 5000)
                )
            ]);
            
            console.log('API route: Found books with less strict matching:', books.length);
        }

        // Randomize the results
        books = books.sort(() => Math.random() - 0.5);

        // Transform books to match the expected format
        console.log('API route: Transforming books');
        console.log('API route: Sample book before transform:', books[0]);
        const transformedBooks = books.map((book: Book & { tags: Tag[], contentWarnings: ContentWarning[] }) => {
            const transformed = {
                id: book.id,
                title: book.title,
                author: book.author,
                rating: book.rating,
                numRatings: book.numRatings,
                spiceLevel: book.spiceLevel,
                summary: book.summary,
                url: book.url,
                tags: book.tags,
                contentWarnings: book.contentWarnings,
                series: book.series,
                seriesNumber: book.seriesNumber
            };
            console.log('API route: Transformed book:', transformed);
            return transformed;
        });

        // Return the response
        console.log('API route: Returning response');
        return NextResponse.json({
            status: 200,
            message: 'Success',
            data: {
                books: transformedBooks,
                total: transformedBooks.length,
                hasMore: false
            }
        });
    } catch (error) {
        console.error('API route: Error in recommendation API:', error);
        return NextResponse.json({
            status: 500,
            message: error instanceof Error ? error.message : 'An unknown error occurred',
            code: 'INTERNAL_ERROR',
            data: {
                books: [],
                total: 0,
                hasMore: false
            }
        }, { status: 500 });
    }
} 