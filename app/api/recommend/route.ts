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
        console.log('API route: Starting request processing');
        const body = await request.json();
        console.log('API route: Request body:', body);
        
        // Extract message from the request
        const { message } = body;
        
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
        } catch (error) {
            console.error('API route: Error analyzing preferences:', error);
            if (error instanceof Error) {
                console.error('API route: Error details:', {
                    message: error.message,
                    name: error.name,
                    stack: error.stack,
                    cause: error.cause,
                    error: error,
                    response: (error as any).response?.data,
                    status: (error as any).response?.status,
                    headers: (error as any).response?.headers
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
        
        console.log('API route: Building query conditions');
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

        // Add content warning conditions
        if (preferences?.contentWarnings?.length > 0) {
            conditions.contentWarnings = {
                some: {
                    OR: preferences.contentWarnings.map((warning: string) => ({
                        name: {
                            contains: warning.toLowerCase()
                        }
                    }))
                }
            };
        }

        // Exclude books with warnings the user doesn't want
        if (preferences?.excludedWarnings?.length > 0) {
            conditions.NOT = {
                contentWarnings: {
                    some: {
                        OR: preferences.excludedWarnings.map((warning: string) => ({
                            name: {
                                contains: warning.toLowerCase()
                            }
                        }))
                    }
                }
            };
        }

        console.log('API route: Query conditions:', JSON.stringify(conditions, null, 2));

        // Query the database
        console.log('API route: Querying database');
        const books = await prisma.book.findMany({
            where: conditions,
            include: {
                tags: true,
                contentWarnings: true
            },
            take: MAX_BOOKS_PER_PAGE
        });
        console.log('API route: Found books:', books.length);

        // Transform books to match the expected format
        console.log('API route: Transforming books');
        const transformedBooks = books.map((book: Book & { tags: any[], contentWarnings: any[] }) => ({
            id: book.id,
            title: book.title,
            author: book.author,
            url: book.url,
            rating: book.rating,
            numRatings: book.numRatings,
            spiceLevel: book.spiceLevel,
            summary: book.summary,
            tags: book.tags.map((tag: { id: string, name: string }) => ({
                id: tag.id,
                name: tag.name.split('(')[0].trim(),
                count: parseInt(tag.name.match(/\((\d+)\)/)?.[1] || '0')
            })),
            contentWarnings: book.contentWarnings.map((cw: { id: string, name: string }) => ({
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

        console.log('API route: Returning response');
        // Return the response
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