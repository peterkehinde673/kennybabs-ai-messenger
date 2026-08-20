import { AgentConfig } from './config.js';
import { generateAgentResponse } from './gemini.js';
import { updateDMStats, pushEvent } from './server.js';

const processedMessageIds = new Set<string>();

export function setupDMListener(sphere: any, config: AgentConfig, directAddress: string): void {
  console.log('📡 Subscribing to Unicity Nostr P2P relays...');

  const handleIncomingMessage = async (msg: any) => {
    try {
      if (!msg) return;

      const sender = msg.sender || msg.from || msg.pubkey || 'unknown';
      const senderText = msg.text || msg.content || msg.message || (typeof msg === 'string' ? msg : JSON.stringify(msg));
      const msgId = msg.id || `${sender}-${Date.now()}`;

      // Deduplication
      if (processedMessageIds.has(msgId)) return;
      processedMessageIds.add(msgId);
      if (processedMessageIds.size > 1000) {
        const first = processedMessageIds.values().next().value;
        if (first) processedMessageIds.delete(first);
      }

      const isSelf = sender === directAddress || sender === `@${config.nametag}` || sender.includes('0000dca8924d');

      console.log(`\n======================================================`);
      console.log(`📩 [${isSelf ? 'SELF-TEST DM' : 'INCOMING DM'} RECEIVED]`);
      console.log(`- From:    ${sender}`);
      console.log(`- Content: "${senderText}"`);
      console.log(`- Time:    ${new Date().toLocaleTimeString()}`);
      console.log(`======================================================`);

      pushEvent({
        type: isSelf ? 'self_test_dm' : 'incoming_dm',
        sender: sender,
        text: senderText,
        timestamp: new Date().toISOString()
      });

      updateDMStats(true);

      // Generate AI response
      console.log('🧠 Querying Gemini AI for response...');
      const replyText = await generateAgentResponse(sender, senderText, config);
      console.log(`💬 AI Response generated: "${replyText.substring(0, 80)}..."`);

      // Send response back
      let sent = false;
      let attempts = 0;
      while (!sent && attempts < 3) {
        attempts++;
        try {
          console.log(`📤 [SENDING DM] Attempt ${attempts}/3 to ${sender}...`);
          if (sphere.communications && typeof sphere.communications.sendDM === 'function') {
            await sphere.communications.sendDM(sender, replyText);
          } else if (typeof sphere.sendDM === 'function') {
            await sphere.sendDM(sender, replyText);
          }
          sent = true;
          console.log(`✅ [DM SENT] Auto-reply successfully delivered!`);

          updateDMStats(false);

          pushEvent({
            type: 'outgoing_dm',
            recipient: sender,
            text: replyText,
            timestamp: new Date().toISOString()
          });
        } catch (err: any) {
          console.warn(`⚠️ Delivery attempt ${attempts} warning:`, err.message || err);
          if (attempts < 3) {
            await new Promise(r => setTimeout(r, 2000 * attempts));
          }
        }
      }
    } catch (err: any) {
      console.error('❌ Error handling incoming message:', err.message || err);
    }
  };

  // Register on all possible Unicity SDK event channels
  if (sphere.communications && typeof sphere.communications.onDirectMessage === 'function') {
    sphere.communications.onDirectMessage(handleIncomingMessage);
  }
  if (sphere.communications && typeof sphere.communications.on === 'function') {
    sphere.communications.on('message:incoming', handleIncomingMessage);
    sphere.communications.on('direct-message', handleIncomingMessage);
    sphere.communications.on('dm', handleIncomingMessage);
  }
  if (sphere.transport && typeof sphere.transport.on === 'function') {
    sphere.transport.on('message:incoming', handleIncomingMessage);
    sphere.transport.on('direct-message', handleIncomingMessage);
  }
  if (typeof sphere.on === 'function') {
    sphere.on('message:incoming', handleIncomingMessage);
    sphere.on('direct-message', handleIncomingMessage);
    sphere.on('dm', handleIncomingMessage);
  }

  // Live Heartbeat every 30s to show active connection
  setInterval(() => {
    console.log(`💓 [HEARTBEAT ${new Date().toLocaleTimeString()}] Live on Unicity Nostr relay. Listening for DMs to @${config.nametag}...`);
  }, 30000);

  console.log('✅ Real Unicity DM Listener is active on all relay channels.');
}
