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
  const now = Date.now();
  const timestamps = (senderRateLimits.get(sender) || []).filter(t => now - t < 60000);
  if (timestamps.length >= 5) {
    return "⚠️ Rate limit reached (max 5 messages/min). Please wait a moment before sending another message.";
  }
  timestamps.push(now);
  senderRateLimits.set(sender, timestamps);

  let history = senderHistories.get(sender) || [];
  if (history.length > 20) history = history.slice(-20);

  const apiKey = config.geminiApiKey || process.env.GEMINI_API_KEY || 'AIzaSyAZRXacfEuMenkU1tmWfiKdDNF_k4s-GMs';

  const modelsToTry = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-pro'];

  for (const model of modelsToTry) {
    try {
      console.log(`🤖 Calling Google Gemini API (model: ${model})...`);
      
      const payload: any = {
        contents: [
          ...history,
          { role: 'user', parts: [{ text: userMessage }] }
        ]
      };

      // Add system instruction if supported
      if (model.includes('1.5') || model.includes('2.0')) {
        payload.systemInstruction = {
          parts: [{ text: SYSTEM_PROMPT }]
        };
      }

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
      } else {
        const errText = await response.text();
        console.warn(`⚠️ Model ${model} returned HTTP ${response.status}: ${errText.substring(0, 100)}`);
      }
    } catch (err: any) {
      console.warn(`Model ${model} network error:`, err.message);
    }
  }

  // Graceful conversational fallback if all model endpoints are unreachable
  return `Hello! I am @${config.nametag} AI Messenger on Unicity. I received your message: "${userMessage}". How can I help you on the network today?`;
}
