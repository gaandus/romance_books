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
    seriesName: string | null;
    seriesNumber: number | null;
    rating: number;
    numRatings: number;
    spiceLevel: string;
    summary: string;
    url: string;
    tags: Tag[];
    contentWarnings: ContentWarning[];
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