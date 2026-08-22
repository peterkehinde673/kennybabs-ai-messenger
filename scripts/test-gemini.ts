import { loadConfig } from '../agent/config.js';
import { generateAgentResponse } from '../agent/gemini.js';

async function run() {
  const config = loadConfig();
  const question = process.argv[2] || 'Who is the president of Russia?';
  const key = (config.geminiApiKey || process.env.GEMINI_API_KEY || '').replace(/['"\s]/g, '');

  console.log(`========================================`);
  console.log(`❓ USER QUESTION: "${question}"`);
  console.log(`🤖 CONFIGURED MODEL: ${config.geminiModel}`);
  console.log(`🔑 API KEY LOADED: ${key ? key.substring(0, 10) + '...' : 'NONE'}`);
  console.log(`========================================`);

  const result = await generateAgentResponse('@test-user', question, config);

  console.log(`\n💬 GEMINI AI RESULT:`);
  console.log(`Success: ${result.success}`);
  if (result.success && result.text) {
    console.log(`Answer:\n${result.text}`);
  } else {
    console.log(`Error: ${result.error}`);
  }
  console.log(`========================================\n`);
  process.exit(result.success ? 0 : 1);
}

run().catch(console.error);
