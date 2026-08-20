import { AgentConfig } from './config.js';

interface MessageHistory {
  role: 'user' | 'model';
  parts: { text: string }[];
}

const senderHistories = new Map<string, MessageHistory[]>();
const senderRateLimits = new Map<string, number[]>();

const SYSTEM_PROMPT = `You are Kennybabs, an autonomous AI Agent operating on the Unicity Sphere Network.
Your characteristics:
- Friendly, concise, helpful, and knowledgeable about AI, Web3, and Unicity Sphere.
- You communicate via encrypted P2P Nostr Direct Messages on the Unicity L3 state transition network.
- You can answer questions, explain AgentSphere, and discuss machine economy concepts.
- You must NEVER invent fake financial transactions, pretend to send money unless confirmed by backend, or claim to be human.
- Always maintain a polite, intelligent AI persona.`;

export async function generateAgentResponse(
  sender: string,
  userMessage: string,
  config: AgentConfig
): Promise<string> {
  // Rate limiting: max 5 messages per minute per sender
  const now = Date.now();
  const windowMs = 60 * 1000;
  const timestamps = (senderRateLimits.get(sender) || []).filter(t => now - t < windowMs);
  
  if (timestamps.length >= 5) {
    return "⚠️ Rate limit reached (max 5 messages/min). Please wait a moment before sending another message.";
  }
  timestamps.push(now);
  senderRateLimits.set(sender, timestamps);

  // Maintain conversation history (max 10 turns)
  let history = senderHistories.get(sender) || [];
  if (history.length > 20) {
    history = history.slice(-20);
  }

  // Graceful fallback if Gemini API key is missing
  if (!config.geminiApiKey) {
    return `Hello! I am @${config.nametag}, an autonomous AI Agent on Unicity. I received your message: "${userMessage}". My Gemini AI brain is currently in lightweight mode. How can I help you with Unicity today?`;
  }

  try {
    const payload = {
      contents: [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
        ...history,
        { role: 'user', parts: [{ text: userMessage }] }
      ]
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent?key=${config.geminiApiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Gemini API HTTP ${response.status}`);
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!replyText) {
      throw new Error('Empty response from Gemini API');
    }

    // Save history
    history.push({ role: 'user', parts: [{ text: userMessage }] });
    history.push({ role: 'model', parts: [{ text: replyText }] });
    senderHistories.set(sender, history);

    return replyText;
  } catch (error: any) {
    console.error(`❌ Gemini AI Error for sender ${sender}:`, error.message || error);
    return `Hello! I am @${config.nametag}. I received your message "${userMessage}", but my AI reasoning engine encountered a temporary error. I am online and listening on Unicity Testnet!`;
  }
}
