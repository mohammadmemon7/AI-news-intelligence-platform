
import axios from 'axios';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const testNewsData = async () => {
  const apiKey = process.env.NEWS_API_KEY;
  console.log('Testing NewsData.io API...');
  console.log('API Key:', apiKey?.slice(0, 8) + '...');

  try {
    const response = await axios.get('https://newsdata.io/api/1/news', {
      params: {
        apikey: apiKey,
        language: 'en'
      }
    });

    console.log('SUCCESS!');
    console.log('Status:', response.data.status);
    console.log('Total Results:', response.data.totalResults);
    if (response.data.results) {
        console.log('First Title:', response.data.results[0]?.title);
    }
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

testNewsData();
