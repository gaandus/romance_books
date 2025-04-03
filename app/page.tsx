'use client';

import { useState, useRef, useEffect } from 'react';
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
                booksCount: data.books?.length,
                books: data.books,
                firstBook: data.books?.[0],
                totalBooks: data.totalBooks,
                hasMore: data.hasMore
            });

            if (!data.books || data.books.length === 0) {
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
                books: data.books,
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

    const handleMarkAsRead = async (bookId: string) => {
        try {
            // Remove the book from display
            setMessages(prev => prev.map(msg => ({
                ...msg,
                books: msg.books.filter(book => book.id !== bookId)
            })));
            
            // Add to read books
            setReadBooks(prev => [...prev, bookId]);
            
            // Get new recommendations
            const response = await fetch('/api/recommend', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: messages[messages.length - 1].message,
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
            if (data.books && data.books.length > 0) {
                setMessages(prev => prev.map((msg, index) => 
                    index === prev.length - 1 
                        ? { ...msg, books: [...msg.books, ...data.books] }
                        : msg
                ));
            }
        } catch (error) {
            console.error('Error marking book as read:', error);
        }
    };

    const handleMarkAsNotInterested = async (bookId: string) => {
        try {
            // Remove the book from display
            setMessages(prev => prev.map(msg => ({
                ...msg,
                books: msg.books.filter(book => book.id !== bookId)
            })));
            
            // Add to not interested books
            setNotInterestedBooks(prev => [...prev, bookId]);
            
            // Get new recommendations
            const response = await fetch('/api/recommend', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: messages[messages.length - 1].message,
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
            if (data.books && data.books.length > 0) {
                setMessages(prev => prev.map((msg, index) => 
                    index === prev.length - 1 
                        ? { ...msg, books: [...msg.books, ...data.books] }
                        : msg
                ));
            }
        } catch (error) {
            console.error('Error marking book as not interested:', error);
        }
    };

    return (
        <div className="min-h-screen flex flex-col">
            <header className="border-b bg-background">
                <div className="container mx-auto px-4 py-4">
                    <h1 className="text-2xl font-bold">Romance Book Recommender</h1>
                </div>
            </header>

            <main className="flex-1 container mx-auto px-4 py-8 overflow-y-auto">
                <div className="space-y-8">
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

            <footer className="border-t bg-background">
                <form onSubmit={handleSubmit} className="container mx-auto px-4 py-4">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Tell me what kind of romance books you like..."
                            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={isLoading}
                        />
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Loading...' : 'Get Recommendations'}
                        </Button>
                    </div>
                </form>
            </footer>
        </div>
    );
} 