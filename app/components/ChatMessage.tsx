'use client';

import { useState, memo } from 'react';
import { Book } from '@/types/book';
import { Button } from './ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Star, Bookmark, XCircle, AlertTriangle, ExternalLink } from 'lucide-react';

interface ChatMessageProps {
    message: string;
    books: Book[];
    onMarkAsRead: (bookId: string) => void;
    onMarkAsNotInterested: (bookId: string) => void;
}

const ChatMessage = memo(function ChatMessage({ 
    message, 
    books, 
    onMarkAsRead, 
    onMarkAsNotInterested
}: ChatMessageProps) {
    const [showAllTags, setShowAllTags] = useState<{ [key: string]: boolean }>({});
    const [showAllWarnings, setShowAllWarnings] = useState<{ [key: string]: boolean }>({});
    const [showFullSummary, setShowFullSummary] = useState<{ [key: string]: boolean }>({});

    if (process.env.NODE_ENV === 'development') {
        console.log('ChatMessage render:', {
            message,
            books,
            booksLength: books?.length,
            isArray: Array.isArray(books),
            firstBook: books?.[0],
            booksKeys: books?.map(b => ({
                id: b.id,
                title: b.title,
                authorScraped: b.authorScraped,
                spiceLevel: b.spiceLevel,
                seriesName: b.seriesName,
                seriesNumber: b.seriesNumber
            }))
        });
    }

    if (!Array.isArray(books)) {
        console.error('Books is not an array:', books);
    }

    if (books?.length === 0) {
        console.log('No books to display');
    }

    const toggleTags = (bookId: string) => {
        setShowAllTags(prev => ({
            ...prev,
            [bookId]: !prev[bookId]
        }));
    };

    const toggleWarnings = (bookId: string) => {
        setShowAllWarnings(prev => ({
            ...prev,
            [bookId]: !prev[bookId]
        }));
    };

    const toggleSummary = (bookId: string) => {
        setShowFullSummary(prev => ({
            ...prev,
            [bookId]: !prev[bookId]
        }));
    };

    return (
        <div className="flex flex-col space-y-3 sm:space-y-6">
            {/* Chat Message */}
            <div className="bg-card rounded-lg shadow-sm border p-2 sm:p-4 w-full">
                <p className="text-card-foreground leading-relaxed text-sm sm:text-base break-words">{message}</p>
            </div>

            {/* Book Cards */}
            {Array.isArray(books) && books.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-6">
                    {books.map((book) => (
                        <Card key={book.id} className="flex flex-col hover:shadow-lg transition-shadow duration-200">
                            <CardHeader className="pb-0 px-2 sm:px-4">
                                <div className="flex items-start justify-between gap-2">
                                    <CardTitle className="text-sm sm:text-lg font-semibold line-clamp-2 break-words">
                                        {book.title}
                                        {book.seriesName && (
                                            <span className="text-gray-500 font-normal">
                                                {" ("}{book.seriesName}{")"}
                                            </span>
                                        )}
                                    </CardTitle>
                                    <a 
                                        href={book.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-primary hover:text-primary/80 transition-colors flex-shrink-0"
                                        title="View on Romance.io"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    </a>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 pt-0 pb-2 sm:pb-3 px-2 sm:px-4">
                                <div className="space-y-1.5 sm:space-y-2">
                                    <div className="flex flex-col gap-1">
                                        <p className="text-sm text-gray-600">by {book.authorScraped || 'Unknown Author'}</p>
                                    </div>

                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                        <span className="text-xs sm:text-sm font-medium">⭐ {book.rating.toFixed(1)}</span>
                                        <span className="text-xs sm:text-sm text-muted-foreground">({book.numRatings} ratings)</span>
                                    </div>

                                    <div className="spice-level text-xs sm:text-sm" data-level={book.spiceLevel}>
                                        Spice Level
                                    </div>

                                    <div className="relative">
                                        <p className={`text-xs sm:text-sm break-words ${!showFullSummary[book.id] ? 'line-clamp-2 sm:line-clamp-3' : ''}`}>
                                            {book.summary}
                                        </p>
                                        {book.summary.length > 150 && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-xs h-5 sm:h-6 px-1.5 sm:px-2 hover:bg-accent/80 mt-0.5 sm:mt-1"
                                                onClick={() => toggleSummary(book.id)}
                                            >
                                                {showFullSummary[book.id] ? 'Show Less' : 'Show More'}
                                            </Button>
                                        )}
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex items-start gap-1">
                                            <span className="text-xs font-medium text-muted-foreground mt-0.5 sm:mt-1">Tags:</span>
                                            <div className="flex flex-wrap gap-1">
                                                {(showAllTags[book.id] ? book.tags : book.tags.slice(0, 3)).map((tag) => (
                                                    <Badge key={tag.id} variant="secondary" className="text-[10px] sm:text-xs hover:bg-secondary/80 break-words">
                                                        {tag.name}
                                                    </Badge>
                                                ))}
                                                {book.tags.length > 3 && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-[10px] sm:text-xs h-5 sm:h-6 px-1.5 sm:px-2 hover:bg-accent/80"
                                                        onClick={() => toggleTags(book.id)}
                                                    >
                                                        {showAllTags[book.id] ? 'Show Less' : `+${book.tags.length - 3} More`}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {book.contentWarnings && book.contentWarnings.length > 0 && (
                                            <div className="flex items-start gap-1">
                                                <span className="text-xs font-medium text-muted-foreground mt-0.5 sm:mt-1">Warnings:</span>
                                                <div className="flex flex-wrap gap-1">
                                                    {(showAllWarnings[book.id] ? book.contentWarnings : book.contentWarnings.slice(0, 3)).map((warning) => (
                                                        <Badge key={warning.id} variant="destructive" className="text-[10px] sm:text-xs hover:bg-destructive/80 break-words">
                                                            {warning.name}
                                                        </Badge>
                                                    ))}
                                                    {book.contentWarnings.length > 3 && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-[10px] sm:text-xs h-5 sm:h-6 px-1.5 sm:px-2 hover:bg-accent/80"
                                                            onClick={() => toggleWarnings(book.id)}
                                                        >
                                                            {showAllWarnings[book.id] ? 'Show Less' : `+${book.contentWarnings.length - 3} More`}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="flex flex-col sm:flex-row gap-1.5 sm:gap-2 mt-2 sm:mt-4 px-2 sm:px-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onMarkAsRead(book.id)}
                                    className="flex items-center gap-1 hover:bg-green-500/10 hover:text-green-500 hover:border-green-500/20 w-full sm:w-auto h-8 sm:h-9"
                                >
                                    <Bookmark className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    Mark as Read
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onMarkAsNotInterested(book.id)}
                                    className="flex items-center gap-1 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 w-full sm:w-auto h-8 sm:h-9"
                                >
                                    <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    Not Interested
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center text-muted-foreground py-3 sm:py-4 text-xs sm:text-base">
                    No books found matching your preferences. Try adjusting your search criteria.
                </div>
            )}
        </div>
    );
});

export default ChatMessage; 