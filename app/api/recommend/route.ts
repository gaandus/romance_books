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

type SpiceLevel = keyof typeof SPICE_LEVEL_MAP;
type ScoredBook = {
    book: Book;
    score: number;
};

export async function POST(request: Request): Promise<NextResponse<ApiResponse<RecommendationResponse>>> {
    try {
        const body = await request.json();
        
        // Extract message and book lists from the request
        const { message, readBooks = [], notInterestedBooks = [], previouslySeenBooks = [] } = body;
        
        if (!message) {
            throw new ApiError('Message is required', 400, 'MISSING_MESSAGE');
        }

        // Extract genres from the message using simple keyword matching
        const genreKeywords = [
            'contemporary', 'historical', 'paranormal', 'fantasy', 'scifi', 'science fiction',
            'romantic comedy', 'romcom', 'dystopian', 'post-apocalyptic', 'western', 'sports',
            'billionaire', 'small town', 'small-town', 'college', 'academic', 'medical',
            'military', 'suspense', 'thriller', 'mystery', 'cozy mystery', 'erotic', 'dark',
            'reverse harem', 'why choose', 'menage', 'polyamorous', 'lgbtq', 'lgbt', 'lesbian',
            'gay', 'mm', 'ff', 'mf', 'mmf', 'ffm', 'mmff', 'ffmm', 'mmfm', 'ffmf'
        ];
        
        const extractedGenres = genreKeywords.filter(keyword => 
            message.toLowerCase().includes(keyword.toLowerCase())
        );
        
        // Default to some popular genres if none were extracted
        const genres = extractedGenres.length > 0 ? extractedGenres : ['contemporary', 'romantic comedy'];
        
        // Extract spice level from the message
        let spiceLevel: SpiceLevel = 'Medium'; // Default
        if (message.toLowerCase().includes('sweet') || message.toLowerCase().includes('clean')) {
            spiceLevel = 'Sweet';
        } else if (message.toLowerCase().includes('mild')) {
            spiceLevel = 'Mild';
        } else if (message.toLowerCase().includes('hot') || message.toLowerCase().includes('spicy')) {
            spiceLevel = 'Hot';
        } else if (message.toLowerCase().includes('inferno') || message.toLowerCase().includes('explicit')) {
            spiceLevel = 'Inferno';
        }
        
        // Build query conditions
        const conditions: any = {};
        
        // Add genre conditions
        conditions.tags = {
            some: {
                name: {
                    in: genres.map(genre => genre.toLowerCase())
                }
            }
        };

        // Add spice level condition
        const spiceLevels = SPICE_LEVEL_MAP[spiceLevel];
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
                const matchingGenres = book.tags.filter((tag) => 
                    genres.includes(tag.name.toLowerCase())
                ).length;
                score += (matchingGenres / genres.length) * 4;

                // Score based on rating
                const ratingScore = 1 - Math.abs(book.rating - 4.0) / 1.5;
                score += ratingScore;

                // Score based on number of ratings
                const reviewScore = Math.min(book.numRatings / 1000, 1);
                score += reviewScore;

                return { book, score };
            });
            
            // Sort by score and take the top books
            const topBooks = scoredBooks
                .sort((a, b) => b.score - a.score)
                .slice(0, MAX_BOOKS_PER_PAGE)
                .map(item => item.book);
            
            // Get total count for pagination
            const totalCount = await prisma.book.count({ where: conditions });
            
            return NextResponse.json({
                data: {
                    books: topBooks,
                    total: totalCount,
                    hasMore: totalCount > MAX_BOOKS_PER_PAGE
                }
            });
            
        } catch (error) {
            console.error('Database query error:', error);
            throw new ApiError('Failed to fetch book recommendations', 500, 'DB_QUERY_ERROR');
        }
        
    } catch (error) {
        console.error('API error:', error);
        
        if (error instanceof ApiError) {
            return NextResponse.json({
                data: { books: [], total: 0, hasMore: false },
                error: error.message,
                code: error.code
            }, { status: error.statusCode });
        }
        
        return NextResponse.json({
            data: { books: [], total: 0, hasMore: false },
            error: 'Internal server error'
        }, { status: 500 });
    }
} 