const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

// Load .env from Backend directory
dotenv.config({ path: path.join(__dirname, '../Backend/.env') });

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_BASE_URL = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

async function testGroq() {
    console.log('Testing Groq API...');
    console.log(`URL: ${GROQ_BASE_URL}`);
    console.log(`Model: ${GROQ_MODEL}`);
    console.log(`API Key (first 5 chars): ${GROQ_API_KEY?.slice(0, 5)}...`);

    if (!GROQ_API_KEY) {
        console.error('ERROR: GROQ_API_KEY is not set in Backend/.env');
        return;
    }

    try {
        const response = await axios.post(
            `${GROQ_BASE_URL}/chat/completions`,
            {
                model: GROQ_MODEL,
                messages: [
                    { role: 'user', content: 'Say hello' }
                ],
                max_tokens: 10
            },
            {
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('SUCCESS!');
        console.log('Response:', response.data.choices[0].message.content);
    } catch (error) {
        console.error('FAILED!');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }
    }
}

testGroq();
