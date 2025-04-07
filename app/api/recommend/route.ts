import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UserPreferencesSchema, ApiError, ApiResponse, RecommendationResponse, Book } from '@/types';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const MAX_BOOKS_PER_PAGE = 4;

// Spice level mapping
const SPICE_LEVEL_MAP = {
    'Sweet': ['Sweet'],
    'Mild': ['Sweet', 'Mild'],
    'Medium': ['Sweet', 'Mild', 'Medium'],
    'Hot': ['Sweet', 'Mild', 'Medium', 'Hot'],
    'Inferno': ['Sweet', 'Mild', 'Medium', 'Hot', 'Inferno']
} as const;

type SpiceLevel = keyof typeof SPICE_LEVEL_MAP;
type ScoredBook = {
    book: Book;
    score: number;
};

async function analyzeUserPreferences(message: string) {
    const prompt = `Analyze the following user request for romance book recommendations and extract:
1. Preferred genres (from: contemporary, historical, paranormal, fantasy, scifi, romantic comedy, dystopian, western, sports, billionaire, small town, college, medical, military, suspense, thriller, mystery, erotic, dark, reverse harem, why choose, menage, polyamorous, lgbtq)
2. Preferred spice level (Sweet, Mild, Medium, Hot, Inferno)
3. Any specific themes or tropes mentioned

User request: "${message}"

Respond in JSON format:
{
    "genres": ["genre1", "genre2"],
    "spiceLevel": "level",
    "themes": ["theme1", "theme2"]
}`;

    const completion = await openai.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "gpt-3.5-turbo",
        response_format: { type: "json_object" }
    });

    return JSON.parse(completion.choices[0].message.content || '{"genres":[],"spiceLevel":"Medium","themes":[]}');
}

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
        const preferences = await analyzeUserPreferences(message);
        console.log('Analyzed preferences:', preferences);
        
        // Build query conditions
        const conditions: any = {};
        
        // Add genre conditions
        conditions.tags = {
            some: {
                name: {
                    startsWith: preferences.genres.map(genre => genre.toLowerCase())
                }
            }
        };

        // Add spice level condition
        const spiceLevels = SPICE_LEVEL_MAP[preferences.spiceLevel as SpiceLevel];
        if (spiceLevels) {
            conditions.spiceLevel = {
                in: spiceLevels
            };
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
            console.log('Sample book:', books[0]);
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
                tags: books[0].tags
            });
        }

        if (!books || books.length === 0) {
            console.log('No books found with conditions:', conditions);
            throw new ApiError('No books found matching your criteria', 404, 'NO_BOOKS_FOUND');
        }

        // Score and sort books
        const scoredBooks: ScoredBook[] = books.map(book => {
            let score = 0;

            // Score based on rating
            const ratingScore = 1 - Math.abs(book.rating - 4.0) / 1.5;
            score += ratingScore;

            // Score based on number of ratings
            const reviewScore = Math.min(book.numRatings / 1000, 1);
            score += reviewScore;

            // Score based on tag matches
            const tagMatches = book.tags.filter(tag => 
                preferences.genres.some(genre => tag.name.toLowerCase().startsWith(genre.toLowerCase()))
            ).length;
            score += tagMatches * 0.5;

            return { book, score };
        });

        // Sort by score and take top books
        const topBooks = scoredBooks
            .sort((a, b) => b.score - a.score)
            .slice(0, MAX_BOOKS_PER_PAGE)
            .map(sb => sb.book);

        console.log('Selected top books:', topBooks.length);

        // Transform books to match the expected format
        const transformedBooks = topBooks.map(book => ({
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
                hasMore: false
            }
        });
    } catch (error) {
        console.error('API error:', error);
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
            message: 'Failed to fetch book recommendations',
            code: 'DB_QUERY_ERROR',
            data: {
                books: [],
                total: 0,
                hasMore: false
            }
        }, { status: 500 });
    }
} 