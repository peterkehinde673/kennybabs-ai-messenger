import { AgentConfig } from './config.js';
import { generateAgentResponse } from './gemini.js';
import { updateDMStats, pushEvent } from './server.js';

const processedMessageIds = new Set<string>();

export function setupDMListener(sphere: any, config: AgentConfig, directAddress: string): void {
  console.log('📡 Subscribing to encrypted Unicity Nostr DMs...');

  const handleIncomingMessage = async (msg: any) => {
    try {
      const msgId = msg.id || `${msg.sender}-${msg.timestamp || Date.now()}`;
      
      // Deduplication
      if (processedMessageIds.has(msgId)) {
        return;
      }
      processedMessageIds.add(msgId);
      if (processedMessageIds.size > 1000) {
        const first = processedMessageIds.values().next().value;
        if (first) processedMessageIds.delete(first);
      }

      const senderText = msg.text || msg.content || '';
      console.log(`\n===========================================`);
      console.log(`📩 [DM RECEIVED IN TERMINAL]`);
      console.log(`From:    ${msg.sender}`);
      console.log(`Content: "${senderText}"`);
      console.log(`===========================================`);

      pushEvent({
        type: 'incoming_dm',
        sender: msg.sender,
        text: senderText,
        timestamp: new Date().toISOString()
      });

      updateDMStats(true);

      // Generate AI response
      const replyText = await generateAgentResponse(msg.sender, senderText, config);

      // Send response back using official Sphere communications API
      let sent = false;
      let attempts = 0;
      while (!sent && attempts < 3) {
        attempts++;
        try {
          console.log(`📤 [DM SENDING] Attempt ${attempts}/3 to ${msg.sender}...`);
          if (sphere.communications && typeof sphere.communications.sendDM === 'function') {
            await sphere.communications.sendDM(msg.sender, replyText);
          } else if (typeof sphere.sendDM === 'function') {
            await sphere.sendDM(msg.sender, replyText);
          }
          sent = true;
          console.log(`✅ [DM SENT] Auto-reply delivered to ${msg.sender}`);

          updateDMStats(false);

          pushEvent({
            type: 'outgoing_dm',
            recipient: msg.sender,
            text: replyText,
            timestamp: new Date().toISOString()
          });
        } catch (err: any) {
          console.error(`⚠️ Delivery attempt ${attempts} failed:`, err.message);
          if (attempts < 3) {
            await new Promise(r => setTimeout(r, 2000 * attempts));
          }
        }
      }
    } catch (err: any) {
      console.error('❌ Error handling incoming DM:', err.message || err);
    }
  };

  // Register on all available communication hooks
  if (sphere.communications && typeof sphere.communications.onDirectMessage === 'function') {
    sphere.communications.onDirectMessage(handleIncomingMessage);
  }
  if (sphere.communications && typeof sphere.communications.on === 'function') {
    sphere.communications.on('message:incoming', handleIncomingMessage);
    sphere.communications.on('direct-message', handleIncomingMessage);
    sphere.communications.on('message', handleIncomingMessage);
  }
  if (sphere.transport && typeof sphere.transport.on === 'function') {
    sphere.transport.on('message:incoming', handleIncomingMessage);
    sphere.transport.on('message', handleIncomingMessage);
  }
  if (typeof sphere.on === 'function') {
    sphere.on('message:incoming', handleIncomingMessage);
    sphere.on('direct-message', handleIncomingMessage);
  }

  console.log('✅ Real Unicity DM Listener active and listening.');
}
