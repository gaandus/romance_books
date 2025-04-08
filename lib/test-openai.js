require('dotenv').config();
const OpenAI = require('openai');

console.log('Environment check:', {
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    openAIKeyLength: process.env.OPENAI_API_KEY?.length,
    nodeEnv: process.env.NODE_ENV
});

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function testOpenAI() {
    try {
        console.log('Testing OpenAI API connection...');
        
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY is not set');
        }
        
        const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: "Hello! This is a test message." }],
            model: "gpt-3.5-turbo",
        });

        console.log('API Response:', completion.choices[0].message.content);
        console.log('API test successful!');
    } catch (error) {
        console.error('Error testing OpenAI API:');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        if (error.cause) {
            console.error('Error cause:', error.cause);
        }
        console.error('Full error:', error);
    }
}

testOpenAI(); 