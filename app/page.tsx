'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import ChatMessage from './components/ChatMessage';
import { Book } from '@/types/book';
import { Button } from './components/ui/button';

export default function Home() {
    const [messages, setMessages] = useState<Array<{
        message: string;
        books: Book[];
    }>>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [readBooks, setReadBooks] = useState<string[]>([]);
    const [notInterestedBooks, setNotInterestedBooks] = useState<string[]>([]);
    const lastMessageRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Only scroll if there's more than one message (not the first one)
        if (messages.length > 1 && lastMessageRef.current) {
            lastMessageRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        setIsLoading(true);
        const userMessage = input.trim();
        setInput('');

        try {
            // Get all previously seen books from all messages
            const previouslySeenBooks = messages.flatMap(msg => 
                msg.books.map(book => book.id)
            );

            const response = await fetch('/api/recommend', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: userMessage,
                    readBooks,
                    notInterestedBooks,
                    previouslySeenBooks
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to get recommendations');
            }

            const data = await response.json();
            console.log('API Response:', {
                status: response.status,
                message: userMessage,
                booksCount: data.data?.books?.length,
                books: data.data?.books,
                firstBook: data.data?.books?.[0],
                totalBooks: data.data?.total,
                hasMore: data.data?.hasMore,
                rawResponse: data
            });

            if (!data.data?.books || data.data.books.length === 0) {
                console.error('No books returned from API');
                setMessages(prev => [...prev, {
                    message: userMessage,
                    books: [],
                }]);
                return;
            }

            // Add the new message with books
            setMessages(prev => [...prev, {
                message: userMessage,
                books: data.data.books,
            }]);

        } catch (error) {
            console.error('Error:', error);
            setMessages(prev => [...prev, {
                message: userMessage,
                books: [],
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleMarkAsRead = useCallback(async (bookId: string) => {
        try {
            // Remove the book from display
            setMessages(prev => prev.map(msg => ({
                ...msg,
                books: msg.books.filter(book => book.id !== bookId)
            })));
            
            // Add to read books
            setReadBooks(prev => [...prev, bookId]);
            
            // Get new recommendations without sending a new message
            const response = await fetch('/api/recommend', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    message: messages[messages.length - 1]?.message || "",  // Use the last message
                    readBooks: [...readBooks, bookId],
                    notInterestedBooks,
                    previouslySeenBooks: messages.flatMap(msg => 
                        msg.books.map(book => book.id)
                    )
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to get new recommendations');
            }

            const data = await response.json();
            
            // Add new recommendations to display
            if (data.data?.books && data.data.books.length > 0) {
                setMessages(prev => prev.map((msg, index) => 
                    index === prev.length - 1 
                        ? { ...msg, books: [...msg.books, ...data.data.books] }
                        : msg
                ));
            }
        } catch (error) {
            console.error('Error marking book as read:', error);
        }
    }, [messages, readBooks, notInterestedBooks]);

    const handleMarkAsNotInterested = useCallback(async (bookId: string) => {
        try {
            // Remove the book from display
            setMessages(prev => prev.map(msg => ({
                ...msg,
                books: msg.books.filter(book => book.id !== bookId)
            })));
            
            // Add to not interested books
            setNotInterestedBooks(prev => [...prev, bookId]);
            
            // Get new recommendations without sending a new message
            const response = await fetch('/api/recommend', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    message: messages[messages.length - 1]?.message || "",  // Use the last message
                    readBooks,
                    notInterestedBooks: [...notInterestedBooks, bookId],
                    previouslySeenBooks: messages.flatMap(msg => 
                        msg.books.map(book => book.id)
                    )
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to get new recommendations');
            }

            const data = await response.json();
            
            // Add new recommendations to display
            if (data.data?.books && data.data.books.length > 0) {
                setMessages(prev => prev.map((msg, index) => 
                    index === prev.length - 1 
                        ? { ...msg, books: [...msg.books, ...data.data.books] }
                        : msg
                ));
            }
        } catch (error) {
            console.error('Error marking book as not interested:', error);
        }
    }, [messages, readBooks, notInterestedBooks]);

    return (
        <div className="min-h-screen flex flex-col">
            <header className="border-b bg-background sticky top-0 z-50">
                <div className="w-full px-2 sm:px-3 py-2">
                    <h1 className="text-lg sm:text-2xl font-bold">Romance Book Recommender</h1>
                </div>
            </header>

            <main className="flex-1 w-full px-2 sm:px-3 py-3 sm:py-8 overflow-y-auto pb-20 sm:pb-32">
                <div className="space-y-4 sm:space-y-8">
                    {messages.map((msg, index) => (
                        <div key={index} ref={index === messages.length - 1 ? lastMessageRef : null}>
                            <ChatMessage
                                message={msg.message}
                                books={msg.books}
                                onMarkAsRead={handleMarkAsRead}
                                onMarkAsNotInterested={handleMarkAsNotInterested}
                            />
                        </div>
                    ))}
                </div>
            </main>

            <footer className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
                <form onSubmit={handleSubmit} className="w-full px-2 sm:px-3 py-2">
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Tell me what kind of romance books you like..."
                            className="flex-1 rounded-md border border-input bg-background px-2 sm:px-3 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={isLoading}
                        />
                        <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                            {isLoading ? 'Loading...' : 'Get Recommendations'}
                        </Button>
                    </div>
                </form>
            </footer>
        </div>
    );
} 