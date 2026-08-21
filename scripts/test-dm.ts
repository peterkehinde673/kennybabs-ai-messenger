import { loadConfig } from '../agent/config.js';
import { initializePersistentIdentity } from '../agent/identity.js';

async function sendTestMessage() {
  console.log('🚀 Sending real Unicity P2P test message to @kennybabs...');
  const config = loadConfig();
  const identity = await initializePersistentIdentity(config);

  const testMessage = `Hello Kennybabs! Test at ${new Date().toLocaleTimeString()}`;
  console.log(`📤 Sending message: "${testMessage}" to ${identity.directAddress}...`);

  if (identity.sphere.communications && typeof identity.sphere.communications.sendDM === 'function') {
    await identity.sphere.communications.sendDM(identity.directAddress, testMessage);
  } else if (typeof identity.sphere.sendDM === 'function') {
    await identity.sphere.sendDM(identity.directAddress, testMessage);
  }

  console.log('✅ Test message sent across Nostr relay!');
  process.exit(0);
}

sendTestMessage().catch(console.error);
