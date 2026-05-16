
import axios from 'axios';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const testGroq = async () => {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL;
  const baseUrl = process.env.GROQ_BASE_URL;

  console.log('Testing Groq API...');
  console.log('Model:', model);
  console.log('Base URL:', baseUrl);
  console.log('API Key (first 5 chars):', apiKey?.slice(0, 5));

  try {
    const response = await axios.post(
      `${baseUrl}/chat/completions`,
      {
        model: model,
        messages: [
          { role: 'user', content: 'Analyze the following news article and return a JSON object with summary, sentiment (Positive, Negative, or Neutral), impact_score (1-10), and 3 bullet-point insights.\n\nTEXT: "CIA chief visits Havana as fuel runs out in Cuba\n\nONLY AVAILABLE IN PAID PLANS"' }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000
      }
    );

    console.log('SUCCESS!');
    console.log('Response:', response.data.choices[0].message.content);
  } catch (error: any) {
    console.error('FAILED!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error Message:', error.message);
    }
  }
};

testGroq();
