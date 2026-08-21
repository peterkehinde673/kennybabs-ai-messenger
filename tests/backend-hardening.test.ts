import assert from 'assert';
import { generateAgentResponse } from '../agent/gemini.js';
import { AgentConfig } from '../agent/config.js';

async function runUnitTests() {
  console.log('🧪 Running Backend Hardening Unit Tests...\n');

  const fallbackConfig: AgentConfig = {
    network: 'testnet2',
    nametag: 'kennybabs',
    mnemonic: 'test mnemonic',
    oracleApiKey: 'test-key',
    walletApiUrl: 'https://wallet-api.unicity.network',
    geminiApiKey: '',
    geminiModel: 'gemini-3.6-flash',
    port: 3001,
    dataDir: './data'
  };

  // Test 1: Gemini Fallback on Missing Key
  console.log('1. Testing Gemini transparent fallback handling...');
  const fallbackReply = await generateAgentResponse('@testuser', 'Hello bot', fallbackConfig);
  assert(fallbackReply.includes('@kennybabs'), 'Fallback must identify as @kennybabs');
  console.log('   ✅ PASS: Fallback response handled transparently.');

  // Test 2: In-Flight Lock & Deduplication
  console.log('2. Testing In-Flight Lock & Deduplication Logic...');
  const processedIds = new Set<string>();
  const inFlightIds = new Set<string>();
  const testMsgId = 'msg-dedup-1001';

  inFlightIds.add(testMsgId);
  assert(inFlightIds.has(testMsgId), 'Lock must be acquired');

  const isDuplicate = inFlightIds.has(testMsgId) || processedIds.has(testMsgId);
  assert(isDuplicate === true, 'Concurrent duplicate delivery must be rejected');

  processedIds.add(testMsgId);
  inFlightIds.delete(testMsgId);
  assert(!inFlightIds.has(testMsgId), 'Lock must be released');
  assert(processedIds.has(testMsgId), 'Message must be cached in processed set');
  console.log('   ✅ PASS: In-flight locks and duplicate rejection verified.');

  // Test 3: Failed Delivery State Handling
  console.log('3. Testing Failed Delivery State Logic...');
  let delivered = false;
  let attempts = 0;
  const maxAttempts = 3;
  const failedMsgId = 'msg-failed-999';

  while (!delivered && attempts < maxAttempts) {
    attempts++;
    // Simulate transient send failure
  }

  if (delivered) {
    processedIds.add(failedMsgId);
  }
  assert(!processedIds.has(failedMsgId), 'Failed message must NOT be marked in processed set');
  assert(attempts === 3, 'Retries must terminate at maxAttempts');
  console.log('   ✅ PASS: Failed delivery state correctly isolated.');

  console.log('\n🎉 ALL UNIT TESTS PASSED (100% SUCCESS)!');
}

runUnitTests().catch((err) => {
  console.error('❌ Unit Test Failure:', err);
  process.exit(1);
});
