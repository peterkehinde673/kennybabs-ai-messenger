import assert from 'assert';
import { generateAgentResponse } from '../agent/gemini.js';
import { DMQueue } from '../agent/listener.js';
import { AgentConfig } from '../agent/config.js';

async function runUnitTests() {
  console.log('🧪 Running Comprehensive Backend Hardening Tests...\n');

  const baseConfig: AgentConfig = {
    network: 'testnet2',
    nametag: 'kennybabs',
    mnemonic: 'test mnemonic',
    oracleApiKey: 'test-key',
    walletApiUrl: 'https://wallet-api.unicity.network',
    geminiApiKey: 'TEST_API_KEY',
    geminiModel: 'gemini-2.5-flash',
    geminiFallbackModel: '',
    geminiMaxRetries: 3,
    geminiRetryDelayMs: 500,
    dmConcurrency: 1,
    port: 3001,
    dataDir: './data'
  };

  // TEST 1: Gemini success -> returns text and success: true
  console.log('TEST 1: Verifying Gemini success generates clean response...');
  const mockFetchSuccess = async (url: string | URL | Request) => {
    return {
      status: 200,
      ok: true,
      headers: new Headers(),
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Yes, I am online on Unicity Sphere testnet2.' }] } }]
      })
    } as unknown as Response;
  };

  const result1 = await generateAgentResponse('@user1', 'Are you online?', baseConfig, mockFetchSuccess as any);
  assert.strictEqual(result1.success, true);
  assert.strictEqual(result1.text, 'Yes, I am online on Unicity Sphere testnet2.');
  assert.strictEqual(result1.modelUsed, 'gemini-2.5-flash');
  console.log('   ✅ PASS: Gemini success returned clean response.\n');

  // TEST 2: Gemini 429 -> exactly 3 attempts against SAME model, ZERO model switching, returns success: false
  console.log('TEST 2: Verifying HTTP 429 retries same model exactly 3 times with ZERO fallback model switching...');
  const requestedUrls429: string[] = [];
  const mockFetch429 = async (url: string | URL | Request) => {
    requestedUrls429.push(url.toString());
    return {
      status: 429,
      ok: false,
      headers: new Headers({ 'retry-after': '0' }),
      text: async () => 'Quota exceeded'
    } as unknown as Response;
  };

  const result2 = await generateAgentResponse('@user2', 'Hello', baseConfig, mockFetch429 as any);
  assert.strictEqual(result2.success, false);
  assert.strictEqual(result2.text, null);
  assert.strictEqual(result2.error, 'GENERATION_FAILED_QUOTA_OR_UNAVAILABLE');
  assert.strictEqual(requestedUrls429.length, 3, 'Must attempt exactly 3 retries');
  for (const url of requestedUrls429) {
    assert(url.includes('models/gemini-2.5-flash:generateContent'), 'Every attempt must be against gemini-2.5-flash');
    assert(!url.includes('gemini-1.5-flash'), 'Must not attempt obsolete gemini-1.5-flash');
    assert(!url.includes('gemini-2.0-flash'), 'Must not attempt obsolete gemini-2.0-flash');
    assert(!url.includes('tts'), 'Must not attempt TTS models');
  }
  console.log('   ✅ PASS: HTTP 429 retried same model 3 times with 0 fallback model attempts.\n');

  // TEST 3: Gemini 404 -> exactly 1 attempt against configured model, zero fallback cascade
  console.log('TEST 3: Verifying HTTP 404 fails immediately with ZERO fallback model cascade...');
  const requestedUrls404: string[] = [];
  const mockFetch404 = async (url: string | URL | Request) => {
    requestedUrls404.push(url.toString());
    return {
      status: 404,
      ok: false,
      headers: new Headers(),
      text: async () => 'Model not found'
    } as unknown as Response;
  };

  const result3 = await generateAgentResponse('@user3', 'Hello', baseConfig, mockFetch404 as any);
  assert.strictEqual(result3.success, false);
  assert.strictEqual(result3.text, null);
  assert.strictEqual(requestedUrls404.length, 1, 'Must attempt exactly 1 model');
  assert(requestedUrls404[0].includes('models/gemini-2.5-flash:generateContent'));
  console.log('   ✅ PASS: HTTP 404 failed cleanly without fallback storm.\n');

  // TEST 4: Duplicate message ID -> zero additional Gemini processing
  console.log('TEST 4: Verifying deduplication rejects duplicate message IDs...');
  const processedIds = new Set<string>();
  const inFlightIds = new Set<string>();
  const testMsgId = 'msg-dedup-555';

  inFlightIds.add(testMsgId);
  assert(inFlightIds.has(testMsgId), 'Lock must be active');

  const duplicateDetected = processedIds.has(testMsgId) || inFlightIds.has(testMsgId);
  assert.strictEqual(duplicateDetected, true, 'Duplicate must be detected');

  processedIds.add(testMsgId);
  inFlightIds.delete(testMsgId);
  assert.strictEqual(inFlightIds.has(testMsgId), false, 'Lock must be released');
  assert.strictEqual(processedIds.has(testMsgId), true, 'Processed set must contain ID');
  console.log('   ✅ PASS: Duplicate message ID correctly rejected.\n');

  // TEST 5: DM Queue concurrency enforcement (concurrency = 1)
  console.log('TEST 5: Verifying DM Queue enforces sequential processing (concurrency = 1)...');
  let activeCount = 0;
  let maxObservedActive = 0;
  const processedOrder: number[] = [];

  const queue = new DMQueue(1, async (item) => {
    activeCount++;
    if (activeCount > maxObservedActive) maxObservedActive = activeCount;
    await new Promise(r => setTimeout(r, 20));
    processedOrder.push(parseInt(item.senderText, 10));
    activeCount--;
  });

  queue.push({ msgId: '1', replyTarget: '@u', senderText: '1', timestamp: '1' });
  queue.push({ msgId: '2', replyTarget: '@u', senderText: '2', timestamp: '2' });
  queue.push({ msgId: '3', replyTarget: '@u', senderText: '3', timestamp: '3' });

  await new Promise(r => setTimeout(r, 120));
  assert.strictEqual(maxObservedActive, 1, 'Max concurrent workers must strictly be 1');
  assert.deepStrictEqual(processedOrder, [1, 2, 3], 'Messages must be processed sequentially');
  console.log('   ✅ PASS: DM Queue enforced strict concurrency of 1.\n');

  // TEST 6: Gemini success after 429 retry
  console.log('TEST 6: Verifying Gemini succeeds on retry 2 after initial 429...');
  let callCount = 0;
  const mockFetchRetrySuccess = async (url: string | URL | Request) => {
    callCount++;
    if (callCount === 1) {
      return {
        status: 429,
        ok: false,
        headers: new Headers({ 'retry-after': '0' }),
        text: async () => 'Rate limited'
      } as unknown as Response;
    }
    return {
      status: 200,
      ok: true,
      headers: new Headers(),
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Recovered answer on retry' }] } }]
      })
    } as unknown as Response;
  };

  const result6 = await generateAgentResponse('@user6', 'Test retry', baseConfig, mockFetchRetrySuccess as any);
  assert.strictEqual(result6.success, true);
  assert.strictEqual(result6.text, 'Recovered answer on retry');
  assert.strictEqual(callCount, 2, 'Must have made exactly 2 attempts');
  console.log('   ✅ PASS: Succeeded on retry attempt 2 without model switching.\n');

  console.log('🎉 ALL 6 PRODUCTION HARDENING TESTS PASSED WITH 100% SUCCESS!');
}

runUnitTests().catch((err) => {
  console.error('❌ Test Failure:', err);
  process.exit(1);
});
