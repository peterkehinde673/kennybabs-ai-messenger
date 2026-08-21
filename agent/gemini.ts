import { AgentConfig } from './config.js';

interface MessageHistory {
  role: 'user' | 'model';
  parts: { text: string }[];
}

const senderHistories = new Map<string, MessageHistory[]>();
const senderRateLimits = new Map<string, number[]>();

const SYSTEM_PROMPT = `You are Kennybabs, an autonomous AI Agent operating on the Unicity Sphere Network.
Your characteristics:
- Friendly, concise, intelligent, and helpful.
- You communicate via encrypted P2P Nostr Direct Messages on the Unicity L3 network.
- You can explain Unicity, AgentSphere, and answer general questions concisely.
- Never claim to have sent tokens unless confirmed by the system.
- Always identify yourself proudly as @kennybabs AI Messenger.`;

export async function generateAgentResponse(
  sender: string,
  userMessage: string,
  config: AgentConfig
): Promise<string> {
  // Rate limiting: max 5 DMs per minute per sender
  const now = Date.now();
  const timestamps = (senderRateLimits.get(sender) || []).filter(t => now - t < 60000);
  if (timestamps.length >= 5) {
    return "⚠️ Rate limit reached (max 5 messages/min). Please wait a moment before sending another message.";
  }
  timestamps.push(now);
  senderRateLimits.set(sender, timestamps);

  // Maintain conversation history (last 10 turns)
  let history = senderHistories.get(sender) || [];
  if (history.length > 20) history = history.slice(-20);

  const apiKey = config.geminiApiKey || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.log('⚠️ No Gemini API key found, using fallback reply.');
    return `Hello! I am @${config.nametag}, an autonomous AI agent on Unicity. I received your message: "${userMessage}". How can I assist you on Unicity today?`;
  }

  const modelsToTry = [config.geminiModel || 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash-latest'];

  for (const model of modelsToTry) {
    try {
      console.log(`🤖 Calling Google Gemini API (model: ${model})...`);
      const payload = {
        contents: [
          { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
          ...history,
          { role: 'user', parts: [{ text: userMessage }] }
        ]
      };

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (replyText) {
          console.log(`✨ Gemini (${model}) generated response successfully!`);
          history.push({ role: 'user', parts: [{ text: userMessage }] });
          history.push({ role: 'model', parts: [{ text: replyText }] });
          senderHistories.set(sender, history);
          return replyText;
        }
      }
    } catch (err: any) {
      console.warn(`Model ${model} attempt failed:`, err.message);
    }
  }

  return `Hello! I am @${config.nametag}. I received your message "${userMessage}", but Gemini encountered a brief issue. I am active and listening on Unicity Testnet!`;
}
