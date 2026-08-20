async function checkStatus() {
  try {
    const res = await fetch('http://localhost:3001/api/status');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log('\n===========================================');
    console.log('📊 KENNYBABS AI MESSENGER LIVE STATUS');
    console.log('===========================================');
    console.log(`Status:              ${data.status.toUpperCase()}`);
    console.log(`Network:             ${data.network}`);
    console.log(`Nametag:             @${data.nametag}`);
    console.log(`Direct Address:      ${data.directAddress}`);
    console.log(`DM Listener Active:  ${data.dmListenerActive ? 'YES' : 'NO'}`);
    console.log(`Gemini AI Active:    ${data.geminiActive ? 'YES' : 'NO'}`);
    console.log(`Uptime:              ${data.uptimeSeconds} seconds`);
    console.log(`Total Incoming DMs:  ${data.totalIncomingDms}`);
    console.log(`Total Outgoing DMs:  ${data.totalOutgoingDms}`);
    console.log(`Last Incoming DM:    ${data.lastIncomingTimestamp || 'None'}`);
    console.log(`Last Outgoing DM:    ${data.lastOutgoingTimestamp || 'None'}`);
    console.log('===========================================\n');
  } catch (err) {
    console.log('\n❌ Agent is currently OFFLINE (Could not connect to http://localhost:3001/api/status)\n');
  }
}
checkStatus();
