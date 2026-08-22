import { AgentConfig } from './config.js';

interface MessageHistory {
  role: 'user' | 'model';
  parts: { text: string }[];
}

const senderHistories = new Map<string, MessageHistory[]>();
const senderRateLimits = new Map<string, number[]>();

const SYSTEM_PROMPT = `You are Kennybabs, an autonomous AI Agent operating on the Unicity Sphere Network.
Instructions:
- Provide direct, concise, factual, and helpful answers to any question the user asks.
- Keep responses friendly, natural, and suitable for P2P direct messages.
- When asked who you are, identify yourself as @kennybabs AI Messenger on Unicity Sphere.
- Never invent fake financial transactions.
- Do NOT output prompt templates, persona prefixes, or internal metadata.`;

export interface GeminiResponseResult {
  text: string | null;
  success: boolean;
  modelUsed?: string;
  error?: string;
}

export async function generateAgentResponse(
  sender: string,
  userMessage: string,
  config: AgentConfig,
  fetchFn: typeof fetch = fetch
): Promise<GeminiResponseResult> {
  const now = Date.now();
  const timestamps = (senderRateLimits.get(sender) || []).filter(t => now - t < 60000);
  if (timestamps.length >= 10) {
    console.warn(`[RATE LIMIT] Sender ${sender} exceeded limit (max 10 DMs/min).`);
    return {
      text: null,
      success: false,
      error: 'RATE_LIMIT_EXCEEDED'
    };
  }
  timestamps.push(now);
  senderRateLimits.set(sender, timestamps);

  let history = senderHistories.get(sender) || [];
  if (history.length > 20) history = history.slice(-20);

  const apiKey = config.geminiApiKey || process.env.GEMINI_API_KEY || '';

  if (!apiKey) {
    console.warn(`[GEMINI] No API key configured. Cannot process request for ${sender}.`);
    return {
      text: null,
      success: false,
      error: 'NO_API_KEY'
    };
  }

  // Exactly ONE configured model - ZERO fallback array, ZERO model switching
  const model = config.geminiModel || 'gemini-3.6-flash';
  const maxRetries = Math.max(1, config.geminiMaxRetries || 3);
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    console.log(`[GEMINI REQUEST] Model: ${model} | Target: ${sender} | Attempt: ${attempt}/${maxRetries}`);

    try {
      const payload = {
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }]
        },
        contents: [
          ...history,
          {
            role: 'user',
            parts: [{ text: userMessage }]
          }
        ]
      };

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetchFn(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.status === 429) {
        const retryAfterHeader = response.headers.get('retry-after');
        const waitSec = retryAfterHeader ? parseInt(retryAfterHeader, 10) || 2 : Math.min(Math.pow(2, attempt), 8);
        console.warn(`[GEMINI] Rate limited (429) on ${model}. Retrying in ${waitSec}s... (Attempt ${attempt}/${maxRetries})`);
        
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, waitSec * 1000));
          continue; // Retries the SAME model only
        } else {
          console.warn(`[GEMINI] Rate limit retries exhausted for ${model} (${maxRetries}/${maxRetries}). Stopping.`);
          return {
            text: null,
            success: false,
            error: 'HTTP_429_QUOTA_EXHAUSTED'
          };
        }
      }

      if (response.status === 404) {
        console.warn(`[GEMINI FAILED] Model ${model} returned HTTP 404 (Not Found). Stopping.`);
        return {
          text: null,
          success: false,
          error: `MODEL_NOT_FOUND: ${model}`
        };
      }

      if (response.ok) {
        const data = await response.json();
        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (replyText) {
          const cleanText = replyText.trim();
          console.log(`[GEMINI SUCCESS] Model: ${model}`);
          history.push({ role: 'user', parts: [{ text: userMessage }] });
          history.push({ role: 'model', parts: [{ text: cleanText }] });
          senderHistories.set(sender, history);
          return {
            text: cleanText,
            success: true,
            modelUsed: model
          };
        }
      } else {
        const errBody = await response.text();
        console.warn(`[GEMINI FAILED] Model ${model} returned HTTP ${response.status}: ${errBody.substring(0, 150)}`);
        return {
          text: null,
          success: false,
          error: `HTTP_${response.status}`
        };
      }
    } catch (err: any) {
      console.warn(`[GEMINI FAILED] Network error on ${model} (Attempt ${attempt}/${maxRetries}):`, err.message);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1500 * attempt));
      } else {
        return {
          text: null,
          success: false,
          error: err.message
        };
      }
    }
  }

  return {
    text: null,
    success: false,
    error: 'MAX_RETRIES_EXCEEDED'
  };
}
