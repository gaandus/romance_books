import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UserPreferencesSchema, ApiError, ApiResponse, RecommendationResponse, Book } from '@/types';
import { Tag, ContentWarning } from '@/types/book';
import { analyzeUserPreferences } from '@/lib/llm.js';

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
        console.log('API route: Starting request processing');
        const body = await request.json();
        console.log('API route: Request body:', body);
        
        // Extract message from the request
        const { message, readBooks = [], notInterestedBooks = [], previouslySeenBooks = [] } = body;
        
        let preferences: {
            spiceLevel: SpiceLevel;
            genres: string[];
            contentWarnings: string[];
            excludedWarnings: string[];
        };
        
        if (!message) {
            console.log('API route: Empty message, using default preferences');
            preferences = {
                spiceLevel: 'Medium',
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
        let books = await prisma.book.findMany({
            where: {
                rating: {
                    gte: 3.5,
                    lte: 5
                },
                ...(preferences.spiceLevel ? {
                    spiceLevel: {
                        in: SPICE_LEVEL_MAP[preferences.spiceLevel] || []
                    }
                } : {}),
                ...(preferences.genres && preferences.genres.length > 0 ? {
                    tags: {
                        some: {
                            OR: preferences.genres.map(genre => ({
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
            },
            include: {
                contentWarnings: true,
                tags: true
            },
            orderBy: {
                id: 'asc'
            },
            take: MAX_BOOKS_PER_PAGE
        });

        // If no books found with strict matching, try less strict matching
        if (books.length === 0) {
            console.log('API route: No books found with strict matching, trying less strict matching');
            books = await prisma.book.findMany({
                where: {
                    rating: {
                        gte: 3.5,
                        lte: 5
                    },
                    ...(preferences.spiceLevel ? {
                        spiceLevel: {
                            in: SPICE_LEVEL_MAP[preferences.spiceLevel] || []
                        }
                    } : {}),
                    ...(preferences.genres && preferences.genres.length > 0 ? {
                        tags: {
                            some: {
                                OR: preferences.genres.map(genre => ({
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
                },
                include: {
                    contentWarnings: true,
                    tags: true
                },
                orderBy: {
                    id: 'asc'
                },
                take: MAX_BOOKS_PER_PAGE
            });
        }

        // Randomize the results
        books = books.sort(() => Math.random() - 0.5);

        // Transform books to match the expected format
        console.log('API route: Transforming books');
        const transformedBooks = books.map((book: Book & { tags: Tag[], contentWarnings: ContentWarning[] }) => ({
            id: book.id,
            title: book.title,
            author: book.author,
            rating: book.rating,
            numRatings: book.numRatings,
            spiceLevel: book.spiceLevel,
            summary: book.summary,
            url: book.url,
            tags: book.tags,
            contentWarnings: book.contentWarnings
        }));

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