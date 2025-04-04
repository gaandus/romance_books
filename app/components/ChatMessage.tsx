'use client';

import { useState } from 'react';
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

export default function ChatMessage({ 
    message, 
    books, 
    onMarkAsRead, 
    onMarkAsNotInterested
}: ChatMessageProps) {
    const [showAllTags, setShowAllTags] = useState<{ [key: string]: boolean }>({});
    const [showAllWarnings, setShowAllWarnings] = useState<{ [key: string]: boolean }>({});
    const [showFullSummary, setShowFullSummary] = useState<{ [key: string]: boolean }>({});

    console.log('ChatMessage render:', {
        message,
        books,
        booksLength: books?.length,
        isArray: Array.isArray(books),
        firstBook: books?.[0],
        booksKeys: books?.map(b => ({
            id: b.id,
            title: b.title,
            author: b.author
        }))
    });

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
        <div className="flex flex-col space-y-6">
            {/* Chat Message */}
            <div className="bg-card rounded-lg shadow-sm border p-4 max-w-2xl mx-auto w-full">
                <p className="text-card-foreground leading-relaxed">{message}</p>
            </div>

            {/* Book Cards */}
            {Array.isArray(books) && books.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {books.map((book) => (
                        <Card key={book.id} className="flex flex-col hover:shadow-lg transition-shadow duration-200">
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between gap-2">
                                    <CardTitle className="text-lg font-semibold">
                                        {book.title}
                                    </CardTitle>
                                    <a 
                                        href={book.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-primary hover:text-primary/80 transition-colors"
                                        title="View on Romance.io"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                    </a>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">by {book.author}</p>
                                    
                                    {book.series && (
                                        <p className="text-sm text-muted-foreground">
                                            Book {book.seriesNumber} in {book.series}
                                        </p>
                                    )}

                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">⭐ {book.averageRating.toFixed(1)}</span>
                                        <span className="text-sm text-muted-foreground">({book.ratingsCount} ratings)</span>
                                    </div>

                                    <div className="spice-level text-sm" data-level={book.spiceLevel}>
                                        Spice Level
                                    </div>

                                    <div className="relative">
                                        <p className={`text-sm ${!showFullSummary[book.id] ? 'line-clamp-3' : ''}`}>
                                            {book.summary}
                                        </p>
                                        {book.summary.length > 150 && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-xs h-6 px-2 hover:bg-accent/80 mt-1"
                                                onClick={() => toggleSummary(book.id)}
                                            >
                                                {showFullSummary[book.id] ? 'Show Less' : 'Show More'}
                                            </Button>
                                        )}
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs font-medium text-muted-foreground">Tags:</span>
                                            <div className="flex flex-wrap gap-1">
                                                {(showAllTags[book.id] ? book.tags : book.tags.slice(0, 3)).map((tag) => (
                                                    <Badge key={tag} variant="secondary" className="text-xs hover:bg-secondary/80">
                                                        {tag}
                                                    </Badge>
                                                ))}
                                                {book.tags.length > 3 && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-xs h-6 px-2 hover:bg-accent/80"
                                                        onClick={() => toggleTags(book.id)}
                                                    >
                                                        {showAllTags[book.id] ? 'Show Less' : `+${book.tags.length - 3} More`}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {book.contentWarnings && book.contentWarnings.length > 0 && (
                                            <div className="flex items-center gap-1">
                                                <span className="text-xs font-medium text-muted-foreground">Warnings:</span>
                                                <div className="flex flex-wrap gap-1">
                                                    {(showAllWarnings[book.id] ? book.contentWarnings : book.contentWarnings.slice(0, 3)).map((warning) => (
                                                        <Badge key={warning} variant="destructive" className="text-xs hover:bg-destructive/80">
                                                            {warning}
                                                        </Badge>
                                                    ))}
                                                    {book.contentWarnings.length > 3 && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-xs h-6 px-2 hover:bg-accent/80"
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
                            <CardFooter className="flex gap-2 mt-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onMarkAsRead(book.id)}
                                    className="flex items-center gap-1 hover:bg-green-500/10 hover:text-green-500 hover:border-green-500/20"
                                >
                                    <Bookmark className="h-4 w-4" />
                                    Mark as Read
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onMarkAsNotInterested(book.id)}
                                    className="flex items-center gap-1 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20"
                                >
                                    <XCircle className="h-4 w-4" />
                                    Not Interested
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center text-muted-foreground py-4">
                    No books found matching your preferences. Try adjusting your search criteria.
                </div>
            )}
        </div>
    );
} 