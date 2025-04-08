import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        hasOpenAIKey: !!process.env.OPENAI_API_KEY,
        openAIKeyLength: process.env.OPENAI_API_KEY?.length,
        nodeEnv: process.env.NODE_ENV,
        envFiles: {
            '.env': !!process.env.OPENAI_API_KEY,
            '.env.local': !!process.env.OPENAI_API_KEY,
            '.env.development': !!process.env.OPENAI_API_KEY,
            '.env.production': !!process.env.OPENAI_API_KEY
        }
    });
} 