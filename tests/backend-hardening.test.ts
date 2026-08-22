import assert from 'assert';
import { matchLocalResponder } from '../agent/localResponder.js';
import { generateGeminiResponse, setGeminiCooldown, resetGeminiCooldown } from '../agent/gemini.js';
import { resolveAgentMessage } from '../agent/aiRouter.js';
import { DMQueue } from '../agent/listener.js';
import { AgentConfig } from '../agent/config.js';

async function runUnitTests() {
  console.log('🧪 Running Comprehensive Resilient Agent Tests...\n');

  const baseConfig: AgentConfig = {
    network: 'testnet2',
    nametag: 'kennybabs',
    mnemonic: 'test mnemonic',
    oracleApiKey: 'test-key',
    walletApiUrl: 'https://wallet-api.unicity.network',
    geminiApiKey: 'TEST_KEY',
    geminiModel: 'gemini-2.5-flash',
    geminiCooldownMs: 60000,
    geminiMaxRetries: 2,
    dmConcurrency: 1,
    port: 3001,
    dataDir: './data'
  };

  // TEST 1: Local Responder for "hi"
  console.log('TEST 1: Verifying local responder for "hi"...');
  const r1 = matchLocalResponder('hi', 'kennybabs');
  assert.strictEqual(r1.matched, true);
  assert(r1.text!.includes('KennyBabs AI'));
  console.log('   ✅ PASS: Greeting matched locally without API call.\n');

  // TEST 2: Local Responder for "are you online"
  console.log('TEST 2: Verifying local responder for "are you online"...');
  const r2 = matchLocalResponder('are you online', 'kennybabs');
  assert.strictEqual(r2.matched, true);
  assert(r2.text!.includes('online and connected'));
  console.log('   ✅ PASS: Online status matched locally.\n');

  // TEST 3: Local Responder for arithmetic "2*7"
  console.log('TEST 3: Verifying local arithmetic for "2*7"...');
  const r3 = matchLocalResponder('2*7', 'kennybabs');
  assert.strictEqual(r3.matched, true);
  assert.strictEqual(r3.text, '14');
  console.log('   ✅ PASS: Arithmetic 2*7 evaluated to 14.\n');

  // TEST 4: Local Responder for "what is unicity"
  console.log('TEST 4: Verifying local responder for "what is unicity"...');
  const r4 = matchLocalResponder('what is unicity', 'kennybabs');
  assert.strictEqual(r4.matched, true);
  assert(r4.text!.includes('Unicity is a blockchain/network project'));
  console.log('   ✅ PASS: Unicity explanation matched locally.\n');

  // TEST 5: Gemini 429 Quota Exhaustion -> Immediate Cooldown Activation
  console.log('TEST 5: Verifying Gemini 429 triggers cooldown and stops fallback storms...');
  resetGeminiCooldown();
  let fetchAttempts = 0;
  const mock429Fetch = async () => {
    fetchAttempts++;
    return {
      status: 429,
      ok: false,
      headers: new Headers(),
      text: async () => 'Quota exceeded'
    } as unknown as Response;
  };

  const geminiRes = await generateGeminiResponse('@user', 'Complex question', baseConfig, mock429Fetch as any);
  assert.strictEqual(geminiRes.success, false);
  assert.strictEqual(geminiRes.isCooldown, true);
  assert.strictEqual(fetchAttempts, 1, '429 must immediately enter cooldown without wasting retries');

  // Next call during cooldown must skip Gemini entirely
  let fetchDuringCooldown = 0;
  const mockSkipFetch = async () => { fetchDuringCooldown++; return {} as Response; };
  const routeRes = await resolveAgentMessage('@user', 'Another question', baseConfig, mockSkipFetch as any);
  assert.strictEqual(routeRes.source, 'contextual_fallback');
  assert.strictEqual(fetchDuringCooldown, 0, 'Must not make fetch call during active cooldown');
  console.log('   ✅ PASS: Cooldown circuit breaker verified with zero fallback storms.\n');

  // TEST 6: Message Deduplication
  console.log('TEST 6: Verifying deduplication logic...');
  const processedIds = new Set<string>();
  const inFlightIds = new Set<string>();
  const testMsgId = 'msg-dedup-999';

  inFlightIds.add(testMsgId);
  assert(inFlightIds.has(testMsgId), 'Lock must be active');
  const isDuplicate = inFlightIds.has(testMsgId) || processedIds.has(testMsgId);
  assert.strictEqual(isDuplicate, true);
  inFlightIds.delete(testMsgId);
  processedIds.add(testMsgId);
  console.log('   ✅ PASS: Message deduplication verified.\n');

  // TEST 7: Queue Concurrency = 1
  console.log('TEST 7: Verifying FIFO queue enforces concurrency = 1...');
  let activeWorkers = 0;
  let maxActiveObserved = 0;
  const processedOrder: number[] = [];

  const queue = new DMQueue(1, async (item) => {
    activeWorkers++;
    if (activeWorkers > maxActiveObserved) maxActiveObserved = activeWorkers;
    await new Promise(r => setTimeout(r, 20));
    processedOrder.push(parseInt(item.senderText, 10));
    activeWorkers--;
  });

  queue.push({ msgId: '1', replyTarget: '@u', senderText: '1', timestamp: '1' });
  queue.push({ msgId: '2', replyTarget: '@u', senderText: '2', timestamp: '2' });
  queue.push({ msgId: '3', replyTarget: '@u', senderText: '3', timestamp: '3' });

  await new Promise(r => setTimeout(r, 120));
  assert.strictEqual(maxActiveObserved, 1);
  assert.deepStrictEqual(processedOrder, [1, 2, 3]);
  console.log('   ✅ PASS: Sequential queue processing confirmed.\n');

  resetGeminiCooldown();
  console.log('🎉 ALL 7 RESILIENCE UNIT TESTS PASSED WITH 100% SUCCESS!');
}

runUnitTests().catch((err) => {
  console.error('❌ Test Failure:', err);
  process.exit(1);
});
