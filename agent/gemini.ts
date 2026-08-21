import { AgentConfig } from './config.js';

interface MessageHistory {
  role: 'user' | 'model';
  parts: { text: string }[];
}

const senderHistories = new Map<string, MessageHistory[]>();
const senderRateLimits = new Map<string, number[]>();
let verifiedModel = '';

const SYSTEM_PROMPT = `You are Kennybabs, an autonomous AI Agent operating on the Unicity Sphere Network.
Instructions:
- Provide direct, concise, factual, and helpful answers to any question the user asks.
- Keep responses friendly and suitable for P2P direct messages.
- When asked who you are, identify yourself as @kennybabs AI Messenger on Unicity Sphere.
- Never invent fake financial transactions.`;

async function getLatestWorkingModel(apiKey: string, preferredModel: string): Promise<string[]> {
  if (verifiedModel) return [verifiedModel, 'gemini-3.6-flash', 'gemini-3.5-flash'];

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (res.ok) {
      const data = await res.json();
      const available = (data.models || [])
        .filter((m: any) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
        .map((m: any) => m.name.replace('models/', ''));

      if (available.length > 0) {
        const top = available.find((m: string) => m === 'gemini-3.6-flash') ||
                    available.find((m: string) => m === 'gemini-3.5-flash') ||
                    available.find((m: string) => m === 'gemini-2.5-flash') ||
                    available.find((m: string) => m.includes('flash')) ||
                    available[0];
        verifiedModel = top;
        return Array.from(new Set([top, preferredModel, ...available]));
      }
    }
  } catch {}

  return [preferredModel || 'gemini-3.6-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-2.5-flash'];
}

export async function generateAgentResponse(
  sender: string,
  userMessage: string,
  config: AgentConfig
): Promise<string> {
  const now = Date.now();
  const timestamps = (senderRateLimits.get(sender) || []).filter(t => now - t < 60000);
  if (timestamps.length >= 10) {
    return "⚠️ Rate limit reached (max 10 messages/min). Please wait a moment before sending another message.";
  }
  timestamps.push(now);
  senderRateLimits.set(sender, timestamps);

  let history = senderHistories.get(sender) || [];
  if (history.length > 20) history = history.slice(-20);

  const rawKey = config.geminiApiKey || process.env.GEMINI_API_KEY || '';
  const apiKey = rawKey.replace(/['"\s]/g, '');

  if (!apiKey) {
    return `Hello! I am @${config.nametag} AI Messenger. I received your message: "${userMessage}". How can I help you on Unicity today?`;
  }

  const candidateModels = await getLatestWorkingModel(apiKey, config.geminiModel);

  for (const model of candidateModels) {
    try {
      console.log(`[GEMINI REQUEST] Model: ${model} | Target: ${sender}`);
      
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (replyText) {
          verifiedModel = model;
          console.log(`[GEMINI SUCCESS] Model: ${model}`);
          console.log(`[GEMINI RESPONSE] "${replyText.trim().substring(0, 80)}..."`);
          history.push({ role: 'user', parts: [{ text: userMessage }] });
          history.push({ role: 'model', parts: [{ text: replyText }] });
          senderHistories.set(sender, history);
          return replyText.trim();
        }
      } else {
        const errBody = await response.text();
        console.warn(`[GEMINI FAILED] Model ${model} HTTP ${response.status}: ${errBody.substring(0, 120)}`);
      }
    } catch (err: any) {
      console.warn(`[GEMINI FAILED] Connection error for ${model}:`, err.message);
    }
  }

  return "Sorry, my AI service is temporarily unavailable. Please try again shortly.";
}
