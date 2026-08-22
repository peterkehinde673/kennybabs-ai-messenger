import { loadConfig } from '../agent/config.js';
import { resolveAgentMessage } from '../agent/aiRouter.js';
import { getGeminiCooldownRemaining } from '../agent/gemini.js';

async function run() {
  const config = loadConfig();
  const question = process.argv[2] || 'Who is the president of Russia?';

  console.log(`========================================`);
  console.log(`❓ USER QUESTION: "${question}"`);
  console.log(`🤖 CONFIGURED MODEL: ${config.geminiModel}`);
  console.log(`⏱️ COOLDOWN STATUS: ${getGeminiCooldownRemaining() > 0 ? 'ACTIVE' : 'READY'}`);
  console.log(`========================================`);

  const result = await resolveAgentMessage('@test-user', question, config);

  console.log(`\n💬 AGENT RESPONSE:`);
  console.log(`Source: ${result.source}`);
  console.log(`Answer:\n${result.text}`);
  console.log(`========================================\n`);
  process.exit(0);
}

run().catch(console.error);
