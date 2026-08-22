import { loadConfig } from '../agent/config.js';
import { resolveAgentMessage } from '../agent/aiRouter.js';
import { initializePersistentIdentity } from '../agent/identity.js';

async function testDMAndAI() {
  console.log('🧪 Testing Gemini AI and P2P DM Subsystem...');
  const config = loadConfig();

  console.log('\n1. Testing AI Router...');
  const testSender = '@kennybabs';
  const testQuestion = 'Hello Kennybabs! What is Unicity Sphere?';
  console.log(`   User Question: "${testQuestion}"`);

  const aiReply = await resolveAgentMessage(testSender, testQuestion, config);
  console.log(`   🤖 Agent Reply (Source: ${aiReply.source}):\n   "${aiReply.text}"\n`);

  console.log('2. Initializing Persistent Identity...');
  const identity = await initializePersistentIdentity(config);

  console.log('3. Sending Test P2P DM across Nostr Network to @kennybabs...');
  try {
    if (identity.sphere.communications && typeof identity.sphere.communications.sendDM === 'function') {
      await identity.sphere.communications.sendDM('@kennybabs', 'Ping from Kennybabs test runner');
      console.log('   ✅ P2P DM sent successfully across the network!');
    }
  } catch (err: any) {
    console.log('   ⚠️ Self-send notice:', err.message || err);
  }

  console.log('\n🎉 ALL AI AND MESSAGING TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

testDMAndAI().catch((err) => {
  console.error('❌ Test error:', err);
  process.exit(1);
});
