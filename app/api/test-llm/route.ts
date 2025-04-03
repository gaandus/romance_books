import { NextResponse } from 'next/server';
import { analyzeUserPreferences } from '@/lib/llm';

// Prevent static generation
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Test the OpenAI API with a simple message
    const preferences = await analyzeUserPreferences("test");
    const isAvailable = Object.keys(preferences).length > 0;
    
    return NextResponse.json({ 
      available: isAvailable,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking LLM service:', error);
    return NextResponse.json({ 
      available: false,
      error: 'Failed to check LLM service',
      timestamp: new Date().toISOString()
    }, { status: 200 }); // Return 200 to prevent build failures
  }
} 