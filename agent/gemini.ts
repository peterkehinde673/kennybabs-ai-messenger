import { AgentConfig } from './config.js';

interface MessageHistory {
  role: 'user' | 'model';
  parts: { text: string }[];
}

const senderHistories = new Map<string, MessageHistory[]>();
const senderRateLimits = new Map<string, number[]>();

const SYSTEM_PROMPT = `You are Kennybabs, an autonomous AI Agent operating on the Unicity Sphere Network.
Instructions:
- Provide direct, factual, concise, and helpful answers to any question the user asks.
- When asked who you are, identify yourself as @kennybabs AI Messenger on Unicity Sphere.
- Never invent fake financial transactions.`;

export async function generateAgentResponse(
  sender: string,
  userMessage: string,
  config: AgentConfig
): Promise<string> {
  const now = Date.now();
  const timestamps = (senderRateLimits.get(sender) || []).filter(t => now - t < 60000);
  if (timestamps.length >= 8) {
    return "⚠️ Rate limit reached. Please wait a moment before sending another message.";
  }
  timestamps.push(now);
  senderRateLimits.set(sender, timestamps);

  let history = senderHistories.get(sender) || [];
  if (history.length > 20) history = history.slice(-20);

  const rawKey = config.geminiApiKey || process.env.GEMINI_API_KEY || '';
  const apiKey = rawKey.replace(/['"\s]/g, '');

  if (!apiKey) {
    console.warn('⚠️ No Gemini API key found in .env');
    return `Hello! I am @${config.nametag} AI Messenger. I received your message: "${userMessage}". How can I help you on the network today?`;
  }

  const models = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.7-flash', 'gemini-2.5-flash'];

  for (const model of models) {
    try {
      console.log(`🤖 Requesting Gemini API (${model})...`);
      
      const payload = {
        contents: [
          ...history,
          {
            role: 'user',
            parts: [{ text: `${SYSTEM_PROMPT}\n\nUser Question: ${userMessage}` }]
          }
        ]
      };

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();

      if (response.ok) {
        const data = JSON.parse(responseText);
        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (replyText) {
          console.log(`✨ Gemini (${model}) generated answer!`);
          history.push({ role: 'user', parts: [{ text: userMessage }] });
          history.push({ role: 'model', parts: [{ text: replyText }] });
          senderHistories.set(sender, history);
          return replyText.trim();
        }
      } else {
        console.warn(`⚠️ Google API Error (${model}) HTTP ${response.status}: ${responseText}`);
      }
    } catch (err: any) {
      console.warn(`⚠️ Network error calling ${model}:`, err.message);
    }
  }

  return `Hello! I am @${config.nametag} AI Messenger. I received: "${userMessage}". How can I help you on Unicity today?`;
}
