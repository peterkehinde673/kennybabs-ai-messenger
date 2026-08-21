import { AgentConfig } from './config.js';

interface MessageHistory {
  role: 'user' | 'model';
  parts: { text: string }[];
}

const senderHistories = new Map<string, MessageHistory[]>();
const senderRateLimits = new Map<string, number[]>();
let selectedModel = '';

const SYSTEM_PROMPT = `You are Kennybabs, an autonomous AI Agent operating on the Unicity Sphere Network.
Instructions:
- Provide direct, concise, and helpful answers to any question the user asks.
- When asked who you are, identify yourself as @kennybabs AI Messenger on Unicity Sphere.
- Never invent fake financial transactions.`;

async function getAvailableModel(apiKey: string): Promise<string> {
  if (selectedModel) return selectedModel;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (res.ok) {
      const data = await res.json();
      const models = (data.models || [])
        .map((m: any) => m.name.replace('models/', ''))
        .filter((name: string) => name.includes('flash') || name.includes('pro'));
      
      const preferred = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.7-flash', 'gemini-2.5-flash'];
      for (const p of preferred) {
        if (models.includes(p)) {
          selectedModel = p;
          return selectedModel;
        }
      }
      if (models.length > 0) {
        selectedModel = models[0];
        return selectedModel;
      }
    }
  } catch (e) {}

  return 'gemini-3.6-flash';
}

export async function generateAgentResponse(
  sender: string,
  userMessage: string,
  config: AgentConfig
): Promise<string> {
  const now = Date.now();
  const timestamps = (senderRateLimits.get(sender) || []).filter(t => now - t < 60000);
  if (timestamps.length >= 15) {
    return "⚠️ High traffic rate limit active. Please wait a moment before sending another message.";
  }
  timestamps.push(now);
  senderRateLimits.set(sender, timestamps);

  let history = senderHistories.get(sender) || [];
  if (history.length > 20) history = history.slice(-20);

  const rawKey = config.geminiApiKey || process.env.GEMINI_API_KEY || '';
  const apiKey = rawKey.replace(/['"\s]/g, '');

  if (!apiKey) {
    return `Hello! I am @${config.nametag} AI Messenger. I received your message: "${userMessage}". How can I help you on the network today?`;
  }

  const primaryModel = await getAvailableModel(apiKey);
  const modelsToTry = [primaryModel, 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.7-flash'];

  for (const model of Array.from(new Set(modelsToTry))) {
    try {
      console.log(`🤖 Querying Gemini model: ${model}...`);
      
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

      if (response.ok) {
        const data = await response.json();
        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (replyText) {
          selectedModel = model;
          console.log(`✨ Gemini (${model}) generated answer!`);
          history.push({ role: 'user', parts: [{ text: userMessage }] });
          history.push({ role: 'model', parts: [{ text: replyText }] });
          senderHistories.set(sender, history);
          return replyText.trim();
        }
      }
    } catch (err: any) {}
  }

  return `Hello! I am @${config.nametag} AI Messenger on Unicity. I received your message: "${userMessage}". How can I help you on the network today?`;
}
