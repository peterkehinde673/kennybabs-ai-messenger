import { AgentConfig } from './config.js';
import { generateAgentResponse } from './gemini.js';
import { updateDMStats, pushEvent } from './server.js';

const processedMessageIds = new Set<string>();

export function setupDMListener(sphere: any, config: AgentConfig, directAddress: string): void {
  console.log('📡 Subscribing to Unicity Nostr P2P relays and Mailbox queue...');

  const handleIncomingMessage = async (msg: any, extra?: any) => {
    try {
      const payload = msg || extra;
      if (!payload) return;

      // Extract sender & text across all event structures
      let sender = payload.sender || payload.from || payload.pubkey || payload.author || (payload.data && payload.data.sender) || '';
      let senderText = payload.text || payload.content || payload.message || payload.memo || (payload.data && payload.data.text) || '';

      if (typeof payload === 'string') {
        senderText = payload;
      }

      if (!senderText || typeof senderText !== 'string' || senderText.trim().length === 0) {
        return;
      }

      const msgId = payload.id || `${sender}-${senderText.substring(0, 15)}-${payload.timestamp || Date.now()}`;
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

      // Generate AI response with Gemini
      const replyTarget = sender || directAddress;
      const replyText = await generateAgentResponse(replyTarget, senderText, config);
      console.log(`💬 Gemini AI Reply:\n"${replyText}"\n`);

      // Deliver response back via P2P DM
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
          console.log(`✅ [DM SENT] Auto-reply delivered to ${replyTarget}!`);

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
      console.error('❌ Error handling incoming message:', err.message || err);
    }
  };

  // 1. Wire all event hooks on sphere and communications
  const eventTargets = [sphere, sphere.communications, sphere.transport, sphere.wallet].filter(Boolean);
  const eventNames = ['message:incoming', 'message', 'dm', 'direct-message', 'communications:message', 'transfer:incoming'];

  for (const target of eventTargets) {
    for (const ev of eventNames) {
      if (typeof target.on === 'function') {
        target.on(ev, (data: any, extra: any) => handleIncomingMessage(data, extra));
      }
    }
    if (typeof target.onDirectMessage === 'function') {
      target.onDirectMessage((data: any) => handleIncomingMessage(data));
    }
  }

  // 2. Active Mailbox Polling & Sync Loop (Drains web wallet messages every 3s)
  setInterval(async () => {
    try {
      if (sphere.receive && typeof sphere.receive === 'function') {
        await sphere.receive();
      } else if (sphere.sync && typeof sphere.sync === 'function') {
        await sphere.sync();
      }
      if (sphere.communications && typeof sphere.communications.sync === 'function') {
        await sphere.communications.sync();
      }
    } catch (e) {
      // Background sync tick
    }
  }, 3000);

  // 3. Heartbeat every 30s
  setInterval(() => {
    console.log(`💓 [HEARTBEAT ${new Date().toLocaleTimeString()}] Live on Unicity Testnet2. Listening for DMs to @${config.nametag}...`);
  }, 30000);

  console.log('✅ Real Unicity DM & Mailbox listener active on all channels.');
}
