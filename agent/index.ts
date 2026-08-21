import { loadConfig } from './config.js';
import { initializePersistentIdentity } from './identity.js';
import { setupDMListener } from './listener.js';
import { startStatusServer, updateRuntimeStats } from './server.js';

async function main() {
  const config = loadConfig();

  // Start local status API server on port 3001
  startStatusServer(config.port);

  // Initialize persistent wallet identity from SDK
  const identity = await initializePersistentIdentity(config);

  console.log('\n========================================');
  console.log('KENNYBABS AI MESSENGER');
  console.log('========================================');
  console.log(`Sphere SDK:         @unicitylabs/sphere-sdk v0.14.3`);
  console.log(`Network:            ${config.network}`);
  console.log(`Identity:           @${identity.nametag}`);
  console.log(`Direct Address:     ${identity.directAddress}`);
  console.log(`Chain Public Key:   ${identity.chainPublicKey}`);
  console.log(`Persistent Wallet:  ACTIVE (${identity.isExisting ? 'Existing' : 'Created'})`);
  console.log(`DM Listener:        ACTIVE`);
  console.log(`Gemini AI:          ${config.geminiApiKey ? 'ACTIVE' : 'FALLBACK'}`);
  console.log('========================================\n');

  // Register single direct-message listener
  setupDMListener(identity.sphere, config, identity.directAddress);

  // Update server status state
  updateRuntimeStats({
    status: 'online',
    network: config.network,
    nametag: identity.nametag,
    directAddress: identity.directAddress,
    chainPublicKey: identity.chainPublicKey,
    dmListenerActive: true,
    geminiActive: !!config.geminiApiKey
  });
}

main().catch((error) => {
  console.error('\nSTARTUP FAILED — IDENTITY UNAVAILABLE');
  console.error(error);
  process.exit(1);
});
