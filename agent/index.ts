import { loadConfig } from './config.js';
import { initializePersistentIdentity } from './identity.js';
import { setupDMListener } from './listener.js';
import { startStatusServer, updateRuntimeStats } from './server.js';

async function main() {
  console.log('===================================================');
  console.log('🚀 Starting Kennybabs AI Messenger Backend Agent...');
  console.log('===================================================');

  const config = loadConfig();

  // Start status API server
  startStatusServer(config.port);

  // Initialize persistent wallet identity
  const identity = await initializePersistentIdentity(config);

  console.log('\n===================================================');
  console.log('📍 AGENT RUNTIME IDENTITY SUMMARY');
  console.log(`- Network:          ${config.network}`);
  console.log(`- Nametag:          @${identity.nametag}`);
  console.log(`- Direct Address:   ${identity.directAddress}`);
  console.log(`- Chain Public Key: ${identity.chainPublicKey}`);
  console.log(`- Data Storage:     ${config.dataDir}`);
  console.log(`- Gemini AI Engine: ${config.geminiApiKey ? 'ENABLED' : 'FALLBACK MODE (No API Key)'}`);
  console.log('===================================================\n');

  // Setup DM listener
  setupDMListener(identity.sphere, config, identity.directAddress);

  // Update status
  updateRuntimeStats({
    status: 'online',
    network: config.network,
    nametag: identity.nametag,
    directAddress: identity.directAddress,
    chainPublicKey: identity.chainPublicKey,
    dmListenerActive: true,
    geminiActive: !!config.geminiApiKey
  });

  console.log('🤖 Agent is FULLY ACTIVE and ready to receive Unicity DMs!');
}

main().catch((error) => {
  console.error('❌ Fatal Agent Startup Error:', error);
  process.exit(1);
});
