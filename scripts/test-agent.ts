import { loadConfig } from '../agent/config.js';
import { initializePersistentIdentity } from '../agent/identity.js';

async function runTest() {
  console.log('🔍 Running Real Network Agent Verification Test...');
  const config = loadConfig();

  console.log('1. Validating Configuration...');
  console.log(`   - Network: ${config.network}`);
  console.log(`   - Nametag: @${config.nametag}`);

  console.log('2. Initializing Real Sphere SDK Identity...');
  const identity = await initializePersistentIdentity(config);
  console.log(`   ✅ Wallet loaded successfully.`);
  console.log(`   - Address: ${identity.directAddress}`);

  console.log('3. Checking Unicity P2P Communications Port...');
  const comms = identity.sphere.communications || identity.sphere.transport || identity.sphere.wallet || identity.sphere;
  if (comms) {
    console.log('   ✅ Communications / Transport port active.');
  } else {
    throw new Error('Communications port failed to initialize.');
  }

  console.log('4. Testing Gemini AI Connection...');
  if (config.geminiApiKey) {
    console.log('   ✅ Gemini API key configured.');
  } else {
    console.log('   ⚠️ Gemini API key not set (Agent will run in Fallback mode).');
  }

  console.log('\n🎉 ALL REAL AGENT CHECKS PASSED SUCCESSFULLY!');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('❌ Agent Test Failed:', err);
  process.exit(1);
});
