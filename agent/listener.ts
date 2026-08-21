import { AgentConfig } from './config.js';
import { generateAgentResponse } from './gemini.js';
import { updateDMStats, pushEvent } from './server.js';

const processedMessageIds = new Set<string>();

export function setupDMListener(sphere: any, config: AgentConfig, directAddress: string): void {
  console.log('📡 Subscribing to Unicity Nostr P2P relays...');

  const handleIncomingMessage = async (msg: any, extra?: any) => {
    try {
      const payload = msg || extra;
      if (!payload) return;

      // Extract sender across all possible fields
      let rawSender = payload.senderNametag || payload.sender || payload.from || payload.pubkey || payload.author || (payload.data && (payload.data.senderNametag || payload.data.sender || payload.data.from)) || '';
      if (typeof rawSender !== 'string') rawSender = String(rawSender || '');
      rawSender = rawSender.trim();

      // Extract message text
      let senderText = payload.text || payload.content || payload.message || payload.memo || (payload.data && payload.data.text) || '';
      if (typeof payload === 'string') senderText = payload;
      if (!senderText || typeof senderText !== 'string' || senderText.trim().length === 0) return;

      // Skip invalid senders
      if (!rawSender || rawSender === '@' || rawSender === 'unknown' || rawSender === directAddress) {
        return;
      }

      // Format recipient correctly
      let replyTarget = rawSender;
      if (!replyTarget.startsWith('@') && !replyTarget.startsWith('DIRECT://') && !replyTarget.startsWith('0x') && !replyTarget.startsWith('un1')) {
        replyTarget = `@${replyTarget}`;
      }

      if (replyTarget === '@') return;

      const msgId = payload.id || `${replyTarget}-${senderText.substring(0, 15)}-${payload.timestamp || Date.now()}`;
      if (processedMessageIds.has(msgId)) return;
      processedMessageIds.add(msgId);
      if (processedMessageIds.size > 1000) {
        const first = processedMessageIds.values().next().value;
        if (first) processedMessageIds.delete(first);
      }

      console.log(`\n======================================================`);
      console.log(`📩 [INCOMING DM RECEIVED]`);
      console.log(`- From:    ${replyTarget}`);
      console.log(`- Content: "${senderText}"`);
      console.log(`- Time:    ${new Date().toLocaleTimeString()}`);
      console.log(`======================================================`);

      pushEvent({
        type: 'incoming_dm',
        sender: replyTarget,
        text: senderText,
        timestamp: new Date().toISOString()
      });

      updateDMStats(true);

      // Generate AI response
      const replyText = await generateAgentResponse(replyTarget, senderText, config);
      console.log(`💬 AI Reply to deliver:\n"${replyText}"\n`);

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
      console.error('❌ Error handling incoming message:', err.message || err);
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

  // Periodic Mailbox & Transport sync every 15s
  setInterval(async () => {
    try {
      if (sphere.receive && typeof sphere.receive === 'function') {
        await sphere.receive();
      }
    } catch {}
  }, 15000);

  // Heartbeat every 30s
  setInterval(() => {
    console.log(`💓 [HEARTBEAT ${new Date().toLocaleTimeString()}] Live on Unicity Testnet2. Listening for DMs to @${config.nametag}...`);
  }, 30000);

  console.log('✅ Real Unicity DM Listener active on all channels.');
}
