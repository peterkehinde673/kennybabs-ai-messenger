import { AgentConfig } from './config.js';
import { generateAgentResponse } from './gemini.js';
import { updateDMStats, pushEvent } from './server.js';

const processedMessageIds = new Set<string>();

export function setupDMListener(sphere: any, config: AgentConfig, directAddress: string): void {
  console.log('📡 Subscribing to Unicity Nostr P2P relays...');

  const handleIncomingMessage = async (msg: any) => {
    try {
      if (!msg) return;

      const sender = msg.senderNametag || msg.sender || msg.from || (msg.data && msg.data.sender) || '';
      const senderText = msg.content || msg.text || msg.message || (msg.data && msg.data.text) || (typeof msg === 'string' ? msg : '');

      if (!senderText || typeof senderText !== 'string' || senderText.trim().length === 0) {
        return;
      }

      const msgId = msg.id || `${sender}-${senderText.substring(0, 15)}-${Date.now()}`;
      if (processedMessageIds.has(msgId)) return;
      processedMessageIds.add(msgId);
      if (processedMessageIds.size > 1000) {
        const first = processedMessageIds.values().next().value;
        if (first) processedMessageIds.delete(first);
      }

      console.log(`\n======================================================`);
      console.log(`📩 [INCOMING DM RECEIVED]`);
      console.log(`- From:    ${sender || 'Direct Address'}`);
      console.log(`- Content: "${senderText}"`);
      console.log(`- Time:    ${new Date().toLocaleTimeString()}`);
      console.log(`======================================================`);

      pushEvent({
        type: 'incoming_dm',
        sender: sender || 'Unicity User',
        text: senderText,
        timestamp: new Date().toISOString()
      });

      updateDMStats(true);

      // Generate AI response
      const replyTarget = sender || directAddress;
      const replyText = await generateAgentResponse(replyTarget, senderText, config);

      console.log(`[AI RESPONSE] Target: ${replyTarget}\n"${replyText}"\n`);

      // Send reply
      let sent = false;
      let attempts = 0;
      while (!sent && attempts < 3) {
        attempts++;
        try {
          console.log(`📤 [SENDING DM] Attempt ${attempts}/3 to ${replyTarget}...`);
          if (sphere.communications && typeof sphere.communications.sendDM === 'function') {
            await sphere.communications.sendDM(replyTarget, replyText);
          } else if (typeof sphere.sendDM === 'function') {
            await sphere.sendDM(replyTarget, replyText);
          }
          sent = true;
          console.log(`✅ [DM SENT] Auto-reply successfully delivered to ${replyTarget}!`);

          updateDMStats(false);

          pushEvent({
            type: 'outgoing_dm',
            recipient: replyTarget,
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
      console.error('❌ Error handling incoming DM:', err.message || err);
    }
  };

  if (sphere.communications && typeof sphere.communications.onDirectMessage === 'function') {
    sphere.communications.onDirectMessage(handleIncomingMessage);
  }
  if (sphere.communications && typeof sphere.communications.on === 'function') {
    sphere.communications.on('message:incoming', handleIncomingMessage);
  }
  if (typeof sphere.on === 'function') {
    sphere.on('message:incoming', handleIncomingMessage);
  }

  // Periodic Mailbox & Transport sync
  setInterval(async () => {
    try {
      if (sphere.receive && typeof sphere.receive === 'function') {
        await sphere.receive();
      }
    } catch {}
  }, 4000);

  // Heartbeat every 30s
  setInterval(() => {
    console.log(`💓 [HEARTBEAT ${new Date().toLocaleTimeString()}] Live on Unicity Testnet2. Listening for DMs to @${config.nametag}...`);
  }, 30000);

  console.log('✅ Real Unicity DM Listener is active and listening on Nostr relays.');
}
