import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.DEEPSEEK_API_KEY;
const baseUrl = process.env.DEEPSEEK_BASE_URL;

async function testModel(modelName) {
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: 'hello' }],
        max_tokens: 10
      })
    });
    const text = await res.text();
    if (res.ok) {
      console.log(`[OK] Model ${modelName} works. Response:`, text.substring(0, 100));
      return true;
    } else {
      console.log(`[FAILED] Model ${modelName}:`, text);
      return false;
    }
  } catch (e) {
    console.error(`[ERROR] Model ${modelName}:`, e.message);
    return false;
  }
}

async function run() {
  const candidates = [
    'DeepSeek-V3.2',
    'DeepSeek-V3',
    'deepseek-v3',
    'deepseek-v3.2',
    'astron-code-latest',
    'xunfei-deepseek-v3',
    'generalv3.5',
    'generalv3'
  ];

  for (const model of candidates) {
    if (await testModel(model)) break;
  }
}

run();
