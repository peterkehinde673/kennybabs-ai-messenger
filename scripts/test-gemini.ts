import { loadConfig } from '../agent/config.js';
import { generateAgentResponse } from '../agent/gemini.js';

async function test() {
  console.log('🧪 Testing Gemini AI Integration directly...');
  const config = loadConfig();
  console.log(`- API Key present: ${config.geminiApiKey ? 'YES (' + config.geminiApiKey.substring(0, 6) + '...)' : 'NO'}`);
  console.log(`- Model: ${config.geminiModel}`);
  
  const testSender = 'DIRECT://test-verifier';
  const testMessage = 'Hello Kennybabs! What can you do on Unicity?';
  
  console.log(`\n📤 Sending prompt: "${testMessage}"`);
  const reply = await generateAgentResponse(testSender, testMessage, config);
  console.log(`\n📥 Response generated:\n"${reply}"\n`);
}

test().catch(console.error);
