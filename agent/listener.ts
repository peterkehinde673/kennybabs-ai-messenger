import { AgentConfig } from './config.js';
import { generateAgentResponse } from './gemini.js';
import { updateDMStats, pushEvent } from './server.js';

const processedMessageIds = new Set<string>();

export function setupDMListener(sphere: any, config: AgentConfig, directAddress: string): void {
  console.log('📡 Subscribing to Unicity Nostr P2P relays...');

  const handleIncomingMessage = async (msg: any, rawData?: any) => {
    try {
      const payload = msg || rawData;
      if (!payload) return;

      console.log('🔍 [RAW NOSTR EVENT DETECTED]:', typeof payload === 'object' ? JSON.stringify(payload).substring(0, 150) : payload);

      // Extract sender and content across all SDK formats
      let sender = payload.sender || payload.from || payload.pubkey || payload.author || 'unknown';
      let senderText = payload.text || payload.content || payload.message || payload.memo || '';

      if (typeof payload === 'string') {
        senderText = payload;
      } else if (payload.data && typeof payload.data === 'object') {
        sender = payload.data.sender || payload.data.from || sender;
        senderText = payload.data.text || payload.data.content || payload.data.memo || senderText;
      }

      if (!senderText) {
        console.log('⚠️ Event received but no text payload found.');
        return;
      }

      const msgId = payload.id || `${sender}-${senderText.substring(0, 10)}-${Date.now()}`;
      if (processedMessageIds.has(msgId)) return;
      processedMessageIds.add(msgId);
      if (processedMessageIds.size > 1000) {
        const first = processedMessageIds.values().next().value;
        if (first) processedMessageIds.delete(first);
      }

      console.log(`\n======================================================`);
      console.log(`📩 [INCOMING DM RECEIVED]`);
      console.log(`- From:    ${sender}`);
      console.log(`- Content: "${senderText}"`);
      console.log(`- Time:    ${new Date().toLocaleTimeString()}`);
      console.log(`======================================================`);

      pushEvent({
        type: 'incoming_dm',
        sender: sender,
        text: senderText,
        timestamp: new Date().toISOString()
      });

      updateDMStats(true);

      // Generate AI response
      console.log('🧠 Generating Gemini AI response...');
      const replyText = await generateAgentResponse(sender, senderText, config);
      console.log(`💬 AI Reply: "${replyText.substring(0, 90)}..."`);

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

  // Register listeners on all available event layers in Sphere SDK
  const targets = [sphere, sphere.communications, sphere.transport, sphere.wallet].filter(Boolean);
  const eventNames = [
    'message:incoming',
    'message',
    'dm',
    'direct-message',
    'communications:message',
    'transfer:incoming',
    'event',
    'data'
  ];

  for (const target of targets) {
    for (const ev of eventNames) {
      if (typeof target.on === 'function') {
        target.on(ev, (data: any, extra: any) => handleIncomingMessage(data, extra));
      }
    }
    if (typeof target.onDirectMessage === 'function') {
      target.onDirectMessage((data: any) => handleIncomingMessage(data));
    }
    if (typeof target.onMessage === 'function') {
      target.onMessage((data: any) => handleIncomingMessage(data));
    }
  }

  // Live Heartbeat every 30s
  setInterval(() => {
    console.log(`💓 [HEARTBEAT ${new Date().toLocaleTimeString()}] Live on Unicity Nostr relay. Listening for DMs to @${config.nametag}...`);
  }, 30000);

  console.log('✅ Real Unicity DM Listener is active on all relay channels.');
}
