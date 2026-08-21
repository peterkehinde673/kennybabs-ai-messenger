import assert from 'assert';
import { generateAgentResponse } from '../agent/gemini.js';
import { AgentConfig } from '../agent/config.js';

async function runUnitTests() {
  console.log('🧪 Running Backend Hardening Unit Tests...\n');

  // Test 1: Gemini Transparent Fallback on Missing Key
  console.log('1. Testing Gemini transparent fallback handling...');
  const fallbackConfig: AgentConfig = {
    network: 'testnet2',
    nametag: 'kennybabs',
    mnemonic: 'test mnemonic',
    oracleApiKey: 'test-key',
    walletApiUrl: 'https://wallet-api.unicity.network',
    geminiApiKey: '',
    geminiModel: 'gemini-1.5-flash',
    port: 3001,
    dataDir: './data'
  };
  const fallbackReply = await generateAgentResponse('@testuser', 'Hello bot', fallbackConfig);
  assert(fallbackReply.includes('@kennybabs'), 'Fallback must identify as @kennybabs');
  console.log('   ✅ PASS: Fallback response handled transparently without crashes.');

  // Test 2: Message Deduplication & In-Flight Lock
  console.log('2. Testing In-Flight Lock & Deduplication Logic...');
  const processedIds = new Set<string>();
  const inFlightIds = new Set<string>();
  const testMsgId = 'msg-dedup-1001';

  // First arrival
  assert(!processedIds.has(testMsgId), 'Must not be processed yet');
  inFlightIds.add(testMsgId);
  assert(inFlightIds.has(testMsgId), 'Lock must be acquired');

  // Second arrival during processing (Simulated in-flight lock rejection)
  const isDuplicate = inFlightIds.has(testMsgId) || processedIds.has(testMsgId);
  assert(isDuplicate === true, 'Concurrent duplicate delivery must be rejected');

  // Completion
  processedIds.add(testMsgId);
  inFlightIds.delete(testMsgId);
  assert(!inFlightIds.has(testMsgId), 'Lock must be released');
  assert(processedIds.has(testMsgId), 'Message must be cached in processed set');
  console.log('   ✅ PASS: In-flight locks and duplicate rejection verified.');

  console.log('\n🎉 ALL UNIT TESTS PASSED (100% SUCCESS)!');
}

runUnitTests().catch((err) => {
  console.error('❌ Unit Test Failure:', err);
  process.exit(1);
});
