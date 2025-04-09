export interface Tag {
    id: string;
    name: string;
    count: number;
}

export interface ContentWarning {
    id: string;
    name: string;
    count: number;
}

export interface Book {
    id: string;
    title: string;
    authorScraped: string | null;
    url: string;
    rating: number;
    numRatings: number;
    spiceLevel: string | null;
    summary: string;
    tags: Tag[];
    contentWarnings: ContentWarning[];
    seriesName: string | null;
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