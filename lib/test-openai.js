require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testOpenAI() {
  try {
    console.log('Testing OpenAI API connection...');
    console.log('API Key:', process.env.OPENAI_API_KEY ? 'Present' : 'Missing');
    
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: "Hello! This is a test message." }],
      model: "gpt-3.5-turbo",
    });

    console.log('API Response:', completion.choices[0].message.content);
    console.log('API test successful!');
  } catch (error) {
    console.error('Error testing OpenAI API:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testOpenAI(); 