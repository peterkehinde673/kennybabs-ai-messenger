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

// Allowed pure text-generation models only - NEVER TTS, image, or multimodal output models
const ALLOWED_TEXT_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

export async function generateAgentResponse(
  sender: string,
  userMessage: string,
  config: AgentConfig
): Promise<{ text: string; success: boolean; modelUsed?: string }> {
  const now = Date.now();
  const timestamps = (senderRateLimits.get(sender) || []).filter(t => now - t < 60000);
  if (timestamps.length >= 10) {
    console.warn(`[RATE LIMIT] Sender ${sender} exceeded limit (max 10 DMs/min).`);
    return {
      text: "⚠️ Rate limit reached (max 10 messages/min). Please wait a moment before sending another message.",
      success: false
    };
  }
  timestamps.push(now);
  senderRateLimits.set(sender, timestamps);

  let history = senderHistories.get(sender) || [];
  if (history.length > 20) history = history.slice(-20);

  const apiKey = config.geminiApiKey || process.env.GEMINI_API_KEY || '';

  if (!apiKey) {
    console.log(`[GEMINI] No API key configured. Returning service fallback for ${sender}.`);
    return {
      text: `Hello! I am @${config.nametag} AI Messenger. I received your message: "${userMessage}". How can I help you on Unicity today?`,
      success: false
    };
  }

  // Small, explicit list of text models: configured model first, then safe text fallbacks
  const configuredModel = config.geminiModel || 'gemini-2.5-flash';
  const modelsToTry = Array.from(new Set([configuredModel, ...ALLOWED_TEXT_MODELS]));

  for (const model of modelsToTry) {
    let attempts = 0;
    const maxRetries = config.geminiMaxRetries || 3;

    while (attempts < maxRetries) {
      attempts++;
      try {
        console.log(`[GEMINI REQUEST] Model: ${model} | Target: ${sender} | Attempt: ${attempts}/${maxRetries}`);

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
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.status === 429) {
          const retryAfterHeader = response.headers.get('retry-after');
          const waitSec = retryAfterHeader ? parseInt(retryAfterHeader, 10) || 2 : Math.min(Math.pow(2, attempts), 8);
          console.warn(`[GEMINI] Rate limited (429) on ${model}. Retrying in ${waitSec}s... (Attempt ${attempts}/${maxRetries})`);
          if (attempts < maxRetries) {
            await new Promise(r => setTimeout(r, waitSec * 1000));
            continue;
          } else {
            console.warn(`[GEMINI] Rate limit retries exhausted for ${model}.`);
            break;
          }
        }

        if (response.status === 404) {
          console.warn(`[GEMINI FAILED] Model ${model} returned HTTP 404 (Not Found). Skipping to next configured text model.`);
          break;
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
          console.warn(`[GEMINI FAILED] Model ${model} HTTP ${response.status}: ${errBody.substring(0, 150)}`);
          break;
        }
      } catch (err: any) {
        console.warn(`[GEMINI FAILED] Network error on ${model} (attempt ${attempts}):`, err.message);
        if (attempts < maxRetries) {
          await new Promise(r => setTimeout(r, 1500 * attempts));
        }
      }
    }
  }

  console.warn(`[GEMINI] All configured text models exhausted for ${sender}.`);
  return {
    text: "Sorry, my AI service is temporarily unavailable. Please try again shortly.",
    success: false
  };
}
