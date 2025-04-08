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
        
        if (!message) {
            console.log('API route: Missing message in request');
            throw new ApiError('Message is required', 400, 'MISSING_MESSAGE');
        }

        // Analyze user preferences using OpenAI
        let preferences;
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
        
        console.log('API route: Building query conditions');
        // Build query conditions based on preferences
        const queryConditions: any = {
            rating: {
                gte: 3.5,
                lte: 5
            }
        };

        // Map spice level to database values
        const spiceLevelMap: Record<string, string[]> = {
            'Sweet': ['1 of 5'],
            'Mild': ['2 of 5'],
            'Medium': ['3 of 5'],
            'Hot': ['4 of 5', '5 of 5']
        };

        // Add spice level condition if specified
        if (preferences.spiceLevel) {
            const spiceLevels = spiceLevelMap[preferences.spiceLevel] || [];
            if (spiceLevels.length > 0) {
                queryConditions.spiceLevel = {
                    in: spiceLevels
                };
            }
        }

        // Add previously seen books to excluded list
        if (previouslySeenBooks && previouslySeenBooks.length > 0) {
            queryConditions.id = {
                notIn: previouslySeenBooks
            };
        }

        // Add read books to excluded list
        if (readBooks && readBooks.length > 0) {
            queryConditions.id = {
                ...queryConditions.id,
                notIn: [...(queryConditions.id?.notIn || []), ...readBooks]
            };
        }

        // Add not interested books to excluded list
        if (notInterestedBooks && notInterestedBooks.length > 0) {
            queryConditions.id = {
                ...queryConditions.id,
                notIn: [...(queryConditions.id?.notIn || []), ...notInterestedBooks]
            };
        }

        // Add tags condition if specified
        if (preferences.genres && preferences.genres.length > 0) {
            console.log('API route: Adding tag conditions for:', preferences.genres);
            queryConditions.tags = {
                some: {
                    OR: preferences.genres.map(genre => ({
                        name: {
                            contains: genre.split('(')[0].trim(),
                            mode: 'insensitive'
                        }
                    }))
                }
            };
            console.log('API route: Tag conditions:', JSON.stringify(queryConditions.tags, null, 2));
        }

        // Add content warnings condition if specified
        if (preferences.contentWarnings && preferences.contentWarnings.length > 0) {
            queryConditions.contentWarnings = {
                some: {
                    OR: preferences.contentWarnings.map(warning => ({
                        name: {
                            contains: warning.split('(')[0].trim(),
                            mode: 'insensitive'
                        }
                    }))
                }
            };
        }

        // Add excluded warnings condition if specified
        if (preferences.excludedWarnings && preferences.excludedWarnings.length > 0) {
            queryConditions.NOT = {
                contentWarnings: {
                    some: {
                        OR: preferences.excludedWarnings.map(warning => ({
                            name: {
                                contains: warning.split('(')[0].trim(),
                                mode: 'insensitive'
                            }
                        }))
                    }
                }
            };
        }

        console.log('API route: Query conditions:', JSON.stringify(queryConditions, null, 2));

        // Query the database with strict matching first (AND)
        console.log('API route: Querying database with strict matching (AND)');
        let books = await prisma.book.findMany({
            where: {
                ...queryConditions,
                AND: [
                    // Tags must match at least one requested genre
                    preferences.genres && preferences.genres.length > 0 ? {
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
                    } : {},
                    // Content warnings must match at least one requested warning
                    preferences.contentWarnings && preferences.contentWarnings.length > 0 ? {
                        contentWarnings: {
                            some: {
                                OR: preferences.contentWarnings.map(warning => ({
                                    name: {
                                        contains: warning.split('(')[0].trim(),
                                        mode: 'insensitive'
                                    }
                                }))
                            }
                        }
                    } : {}
                ]
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

        // Randomize the results
        books = books.sort(() => Math.random() - 0.5);

        // If no books found, try less strict matching (OR)
        if (books.length === 0) {
            console.log('API route: No books found with strict matching, trying OR matching');
            
            books = await prisma.book.findMany({
                where: {
                    ...queryConditions,
                    OR: [
                        // Tags can match any requested genre
                        preferences.genres && preferences.genres.length > 0 ? {
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
                        } : {},
                        // Content warnings can match any requested warning
                        preferences.contentWarnings && preferences.contentWarnings.length > 0 ? {
                            contentWarnings: {
                                some: {
                                    OR: preferences.contentWarnings.map(warning => ({
                                        name: {
                                            contains: warning.split('(')[0].trim(),
                                            mode: 'insensitive'
                                        }
                                    }))
                                }
                            }
                        } : {}
                    ]
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

            // Randomize the results
            books = books.sort(() => Math.random() - 0.5);
        }

        // If still no books found, try most lenient matching (only rating and spice level)
        if (books.length === 0) {
            console.log('API route: No books found with OR matching, trying most lenient query');
            
            const lenientQuery = {
                rating: {
                    gte: 3.5,
                    lte: 5
                },
                ...(preferences.spiceLevel ? {
                    spiceLevel: {
                        in: spiceLevelMap[preferences.spiceLevel] || []
                    }
                } : {})
            };
            
            books = await prisma.book.findMany({
                where: lenientQuery,
                include: {
                    contentWarnings: true,
                    tags: true
                },
                orderBy: {
                    id: 'asc'
                },
                take: MAX_BOOKS_PER_PAGE
            });

            // Randomize the results
            books = books.sort(() => Math.random() - 0.5);
        }

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