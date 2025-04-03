export interface Book {
    id: string;
    title: string;
    author: string;
    url: string;
    averageRating: number;
    ratingsCount: number;
    spiceLevel: string | null;
    summary: string;
    tags: string[];
    contentWarnings: string[];
    series: string | null;
    seriesNumber: number | null;
    pageCount: number | null;
    publishedDate: Date | null;
    scrapedStatus: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface Message {
    type: 'user' | 'assistant' | 'book';
    content: string;
    book?: Book;
    recommendations?: Book[];
}

export interface UserPreferences {
    genres?: string[];
    contentWarnings?: string[];
    excludedWarnings?: string[];
    minimumRating?: number;
    spiceLevel?: string;
    keywords?: string[];
} 