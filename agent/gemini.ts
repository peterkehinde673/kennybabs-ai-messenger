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
- Keep your answers concise and suitable for direct messaging (1-3 sentences).
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

  // Check if API key is provided
  if (!config.geminiApiKey || config.geminiApiKey === 'your_gemini_api_key_here' || config.geminiApiKey.trim() === '') {
    console.warn('⚠️ [GEMINI] No GEMINI_API_KEY set in .env. Using intelligent fallback response.');
    return `Hello! I am @${config.nametag}, an autonomous AI Agent on Unicity Sphere. I received your message: "${userMessage}". My P2P messaging listener is fully active! How can I assist you with Unicity today? 🚀`;
  }

  try {
    console.log(`🧠 [GEMINI] Querying Gemini AI (${config.geminiModel})...`);

    // Clean conversation history ensuring alternating roles
    const history = senderHistories.get(sender) || [];
    const validHistory: MessageHistory[] = [];
    
    // Only keep last 6 turns
    const recentHistory = history.slice(-6);
    for (const item of recentHistory) {
      if (validHistory.length === 0 || validHistory[validHistory.length - 1].role !== item.role) {
        validHistory.push(item);
      }
    }

    // Build standard Gemini payload using system_instruction
    const payload = {
      system_instruction: {
        parts: [{ text: SYSTEM_PROMPT }]
      },
      contents: [
        ...validHistory,
        { role: 'user', parts: [{ text: userMessage }] }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 300
      }
    };

    const modelName = config.geminiModel || 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${config.geminiApiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!replyText) {
      throw new Error('Empty text in Gemini response');
    }

    console.log(`✨ [GEMINI SUCCESS] Response generated: "${replyText.substring(0, 60)}..."`);

    // Store in history
    history.push({ role: 'user', parts: [{ text: userMessage }] });
    history.push({ role: 'model', parts: [{ text: replyText }] });
    senderHistories.set(sender, history.slice(-10));

    return replyText.trim();
  } catch (error: any) {
    console.error('❌ [GEMINI ERROR]:', error.message || error);
    return `Hello! I am @${config.nametag}. I received your message "${userMessage}". My P2P connection on Unicity is active! How can I help you explore the machine economy today? 🚀`;
  }
}
