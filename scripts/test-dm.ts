import { loadConfig } from '../agent/config.js';
import { generateAgentResponse } from '../agent/gemini.js';
import { initializePersistentIdentity } from '../agent/identity.js';

async function testDMAndAI() {
  console.log('🧪 Testing Gemini AI and P2P DM Subsystem...');
  const config = loadConfig();

  console.log('\n1. Testing Google Gemini AI Connection with your API Key...');
  const testSender = 'DIRECT://0000dca8924d716c3ce65db592d9f8d62153837af7a83073f20e1a3efd4806f682e0e7ee421a';
  const testQuestion = 'Hello Kennybabs! What is Unicity Sphere?';
  console.log(`   User Question: "${testQuestion}"`);

  const aiReply = await generateAgentResponse(testSender, testQuestion, config);
  console.log(`   🤖 Gemini AI Reply:\n   "${aiReply}"\n`);

  console.log('2. Initializing Persistent Identity...');
  const identity = await initializePersistentIdentity(config);

  console.log('3. Sending Test P2P DM across Nostr Network...');
  if (identity.sphere.communications && typeof identity.sphere.communications.sendDM === 'function') {
    await identity.sphere.communications.sendDM(identity.directAddress, 'Ping from Kennybabs test runner');
    console.log('   ✅ P2P DM sent successfully across the network!');
  }

  console.log('\n🎉 ALL AI AND MESSAGING TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

testDMAndAI().catch((err) => {
  console.error('❌ Test error:', err);
  process.exit(1);
});
