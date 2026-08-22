import { AgentConfig } from './config.js';
import { generateAgentResponse } from './gemini.js';
import { updateDMStats, pushEvent } from './server.js';

const processedMessageIds = new Set<string>();
const inFlightMessageIds = new Set<string>();

interface DMQueueItem {
  msgId: string;
  replyTarget: string;
  senderText: string;
  timestamp: string;
}

class DMQueue {
  private queue: DMQueueItem[] = [];
  private activeWorkers = 0;
  private maxConcurrency: number;
  private processor: (item: DMQueueItem) => Promise<void>;

  constructor(maxConcurrency: number, processor: (item: DMQueueItem) => Promise<void>) {
    this.maxConcurrency = Math.max(1, maxConcurrency);
    this.processor = processor;
  }

  push(item: DMQueueItem) {
    this.queue.push(item);
    this.drain();
  }

  private drain() {
    while (this.activeWorkers < this.maxConcurrency && this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) break;
      this.activeWorkers++;
      this.processor(item).finally(() => {
        this.activeWorkers--;
        this.drain();
      });
    }
  }
}

export function setupDMListener(sphere: any, config: AgentConfig, directAddress: string): void {
  console.log(`📡 Registering official Sphere DM listener (Concurrency: ${config.dmConcurrency})...`);

  if (!sphere.communications || typeof sphere.communications.onDirectMessage !== 'function') {
    throw new Error('FATAL: sphere.communications.onDirectMessage is not supported by installed Sphere SDK.');
  }

  const dmProcessor = async (item: DMQueueItem) => {
    const { msgId, replyTarget, senderText, timestamp } = item;

    console.log(`\n========================================`);
    console.log(`[INCOMING DM]`);
    console.log(`Sender:     ${replyTarget}`);
    console.log(`Timestamp:  ${timestamp}`);
    console.log(`Message ID: ${msgId}`);
    console.log(`Content:    "${senderText}"`);
    console.log(`========================================`);

    try {
      pushEvent({
        type: 'incoming_dm',
        sender: replyTarget,
        text: senderText,
        timestamp: new Date().toISOString()
      });
      updateDMStats(true);

      // Controlled Gemini invocation
      const aiResult = await generateAgentResponse(replyTarget, senderText, config);
      const replyText = aiResult.text;

      // Sequential bounded retry loop (max 3 attempts)
      let delivered = false;
      let attempt = 0;
      const maxAttempts = 3;

      while (!delivered && attempt < maxAttempts) {
        attempt++;
        console.log(`[SENDING DM] Attempt ${attempt}/${maxAttempts} to ${replyTarget}...`);
        try {
          await sphere.communications.sendDM(replyTarget, replyText);
          delivered = true;
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
          console.warn(`⚠️ Delivery attempt ${attempt} warning: ${err.message || err}`);
          if (attempt < maxAttempts) {
            await new Promise(r => setTimeout(r, 2000 * attempt));
          }
        }
      }

      if (delivered) {
        processedMessageIds.add(msgId);
        if (processedMessageIds.size > 2000) {
          const first = processedMessageIds.values().next().value;
          if (first) processedMessageIds.delete(first);
        }
      } else {
        console.error(`\n[DM DELIVERY FAILED]`);
        console.error(`Message ID: ${msgId}`);
        console.error(`Attempts:   ${attempt}/${maxAttempts}`);
      }
    } catch (err: any) {
      console.error('❌ Unhandled exception in DM pipeline:', err.message || err);
    } finally {
      inFlightMessageIds.delete(msgId);
    }
  };

  const queue = new DMQueue(config.dmConcurrency, dmProcessor);

  // Exactly ONE production incoming DM listener
  sphere.communications.onDirectMessage((msg: any) => {
    if (!msg) return;

    const rawSender = msg.senderNametag || msg.sender || msg.from || '';
    const senderText = msg.content || msg.text || msg.message || '';

    if (!senderText || typeof senderText !== 'string' || senderText.trim().length === 0) return;

    let replyTarget = (rawSender || '').trim();
    if (!replyTarget || replyTarget === '@' || replyTarget === 'unknown') return;

    if (!replyTarget.startsWith('@') && !replyTarget.startsWith('DIRECT://') && !replyTarget.startsWith('0x') && !replyTarget.startsWith('un1')) {
      replyTarget = `@${replyTarget}`;
    }

    if (replyTarget === `@${config.nametag}` || replyTarget === directAddress) {
      return;
    }

    const msgId = msg.id || `${replyTarget}:${msg.timestamp || ''}:${senderText.trim()}`;

    // Deduplication check before enqueuing
    if (processedMessageIds.has(msgId) || inFlightMessageIds.has(msgId)) {
      console.log(`[DUPLICATE DM IGNORED] Message ID: ${msgId}`);
      return;
    }

    inFlightMessageIds.add(msgId);

    // Enqueue for controlled sequential processing
    queue.push({
      msgId,
      replyTarget,
      senderText,
      timestamp: new Date().toLocaleTimeString()
    });
  });

  // Heartbeat every 30s
  setInterval(() => {
    console.log(`💓 [HEARTBEAT ${new Date().toLocaleTimeString()}] Connected to Unicity Testnet2 relay. Listening for DMs to @${config.nametag}...`);
  }, 30000);

  console.log('✅ Official Sphere DM listener registered with controlled concurrency queue.');
}
