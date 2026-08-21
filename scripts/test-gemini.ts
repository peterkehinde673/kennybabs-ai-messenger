import { loadConfig } from '../agent/config.js';
import { generateAgentResponse } from '../agent/gemini.js';

async function run() {
  const config = loadConfig();
  const question = process.argv[2] || 'Who is the president of Russia?';
  const key = (config.geminiApiKey || process.env.GEMINI_API_KEY || '').replace(/['"\s]/g, '');
  
  console.log(`========================================`);
  console.log(`❓ USER QUESTION: "${question}"`);
  console.log(`🔑 API KEY LOADED: ${key ? key.substring(0, 10) + '...' : 'NONE'}`);
  console.log(`========================================`);

  const reply = await generateAgentResponse('@test-user', question, config);
  
  console.log(`\n💬 GEMINI AI ANSWER:`);
  console.log(reply);
  console.log(`========================================\n`);
  process.exit(0);
}

run().catch(console.error);
