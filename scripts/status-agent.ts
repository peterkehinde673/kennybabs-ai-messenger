import { loadConfig } from '../agent/config.js';

async function checkStatus() {
  console.log('========================================');
  console.log('KENNYBABS AGENT CONFIGURATION CHECK');
  console.log('========================================');
  const config = loadConfig();
  console.log(`1. Network Config:     ${config.network}`);
  console.log(`2. Nametag Config:     @${config.nametag}`);
  console.log(`3. Data Directory:     ${config.dataDir}`);
  console.log(`4. Wallet API Gateway: ${config.walletApiUrl}`);
  console.log(`5. Gemini API Key:     ${config.geminiApiKey ? 'CONFIGURED' : 'NOT SET'}`);
  console.log('========================================');

  console.log('\nQuerying local runtime API (http://localhost:3001/api/status)...');
  try {
    const res = await fetch(`http://localhost:${config.port}/api/status`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log(`Status:             ${data.status.toUpperCase()}`);
    console.log(`Direct Address:     ${data.directAddress}`);
    console.log(`Chain Public Key:   ${data.chainPublicKey}`);
    console.log(`DM Listener Active: ${data.dmListenerActive ? 'YES' : 'NO'}`);
    console.log(`Gemini AI Active:   ${data.geminiActive ? 'YES' : 'NO'}`);
    console.log(`Total In / Out DMs: ${data.totalIncomingDms} / ${data.totalOutgoingDms}`);
  } catch (err) {
    console.log('Backend process is currently offline or unreachable on port ' + config.port);
  }
}

checkStatus().catch(console.error);
