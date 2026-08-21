import { AgentConfig } from './config.js';
import { generateAgentResponse } from './gemini.js';
import { updateDMStats, pushEvent } from './server.js';

const processedMessageIds = new Set<string>();
const inFlightMessageIds = new Set<string>();

export function setupDMListener(sphere: any, config: AgentConfig, directAddress: string): void {
  console.log('📡 Registering official Sphere direct-message listener...');

  if (!sphere.communications || typeof sphere.communications.onDirectMessage !== 'function') {
    throw new Error('FATAL: sphere.communications.onDirectMessage API is not available on this SDK instance.');
  }

  // Single official listener hook
  sphere.communications.onDirectMessage(async (msg: any) => {
    try {
      if (!msg) return;

      const rawSender = msg.senderNametag || msg.sender || msg.from || '';
      const senderText = msg.content || msg.text || msg.message || '';

      if (!senderText || typeof senderText !== 'string' || senderText.trim().length === 0) return;

      let replyTarget = (rawSender || '').trim();
      if (!replyTarget || replyTarget === '@' || replyTarget === 'unknown') return;

      // Ensure proper prefix
      if (!replyTarget.startsWith('@') && !replyTarget.startsWith('DIRECT://') && !replyTarget.startsWith('0x') && !replyTarget.startsWith('un1')) {
        replyTarget = `@${replyTarget}`;
      }

      // Ignore self-messages
      if (replyTarget === `@${config.nametag}` || replyTarget === directAddress) {
        return;
      }

      // Deduplication & in-flight locking
      const msgId = msg.id || `${replyTarget}:${senderText}`;
      if (processedMessageIds.has(msgId) || inFlightMessageIds.has(msgId)) {
        console.log(`[DUPLICATE DM IGNORED] Message ID: ${msgId}`);
        return;
      }

      inFlightMessageIds.add(msgId);

      console.log(`\n========================================`);
      console.log(`[INCOMING DM]`);
      console.log(`Sender:     ${replyTarget}`);
      console.log(`Timestamp:  ${new Date().toLocaleTimeString()}`);
      console.log(`Message ID: ${msgId}`);
      console.log(`Content:    "${senderText}"`);
      console.log(`========================================`);

      pushEvent({
        type: 'incoming_dm',
        sender: replyTarget,
        text: senderText,
        timestamp: new Date().toISOString()
      });
      updateDMStats(true);

      // Generate AI response
      const replyText = await generateAgentResponse(replyTarget, senderText, config);

      // Sequential retry loop (Attempt 1/3 -> 2/3 -> 3/3)
      let sent = false;
      let attempt = 0;
      const maxAttempts = 3;

      while (!sent && attempt < maxAttempts) {
        attempt++;
        console.log(`[SENDING DM] Attempt ${attempt}/${maxAttempts} to ${replyTarget}...`);
        try {
          await sphere.communications.sendDM(replyTarget, replyText);
          sent = true;
          console.log(`[DM SENT]`);
          console.log(`Recipient: ${replyTarget}`);
          console.log(`Timestamp: ${new Date().toLocaleTimeString()}`);
          console.log(`Success:   true`);

          updateDMStats(false);
          pushEvent({
            type: 'outgoing_dm',
            recipient: replyTarget,
            text: replyText,
            timestamp: new Date().toISOString()
          });
        } catch (err: any) {
          console.warn(`⚠️ Attempt ${attempt} failed: ${err.message || err}`);
          if (attempt < maxAttempts) {
            await new Promise(r => setTimeout(r, 2000 * attempt));
          }
        }
      }

      // Mark message as permanently processed and release in-flight lock
      processedMessageIds.add(msgId);
      inFlightMessageIds.delete(msgId);
      if (processedMessageIds.size > 2000) {
        const first = processedMessageIds.values().next().value;
        if (first) processedMessageIds.delete(first);
      }
    } catch (err: any) {
      console.error('❌ Unhandled error in DM handler:', err.message || err);
    }
  });

  // Heartbeat every 30s
  setInterval(() => {
    console.log(`💓 [HEARTBEAT ${new Date().toLocaleTimeString()}] Connected to Unicity Testnet2 relay. Listening for DMs to @${config.nametag}...`);
  }, 30000);

  console.log('✅ Official Unicity DM listener registered successfully.');
}
