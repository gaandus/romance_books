import OpenAI from 'openai';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Log all environment variables (excluding sensitive data)
console.log('Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    openAIKeyLength: process.env.OPENAI_API_KEY?.length,
    envFiles: {
        '.env': !!process.env.OPENAI_API_KEY,
        '.env.local': !!process.env.OPENAI_API_KEY,
        '.env.development': !!process.env.OPENAI_API_KEY,
        '.env.production': !!process.env.OPENAI_API_KEY
    }
});

// Initialize OpenAI client with configuration
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 3,
    timeout: 30000
});

async function testOpenAIRequest() {
    console.log('Testing OpenAI API request...');
    
    if (!process.env.OPENAI_API_KEY) {
        console.error('OPENAI_API_KEY is not set in environment variables');
        return;
    }
    
    try {
        // Test 1: Simple JSON response
        console.log('\nTest 1: Simple JSON response');
        const completion1 = await openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant. Please respond in JSON format."
                },
                {
                    role: "user",
                    content: "Hello, how are you?"
                }
            ],
            temperature: 0.7,
            max_tokens: 1000,
            response_format: { type: "json_object" }
        });
        console.log('Test 1 Success! Response:', completion1.choices[0].message.content);

        // Test 2: Complex JSON response with specific structure
        console.log('\nTest 2: Complex JSON response');
        const completion2 = await openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [
                {
                    role: "system",
                    content: `You are a romance book recommendation assistant. Please respond in JSON format with the following structure:
{
    "spiceLevel": "Medium",
    "genres": ["contemporary"],
    "contentWarnings": [],
    "excludedWarnings": []
}`
                },
                {
                    role: "user",
                    content: "I like spicy books"
                }
            ],
            temperature: 0.7,
            max_tokens: 1000,
            response_format: { type: "json_object" }
        });
        console.log('Test 2 Success! Response:', completion2.choices[0].message.content);

    } catch (error) {
        console.error('Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            name: error instanceof Error ? error.name : 'Unknown',
            stack: error instanceof Error ? error.stack : undefined,
            error: error,
            fullError: JSON.stringify(error, null, 2)
        });
    }
}

// Run the test
testOpenAIRequest(); 