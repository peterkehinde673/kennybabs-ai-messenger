import { AgentConfig } from './config.js';
import { matchLocalResponder, getContextualFallback } from './localResponder.js';
import { generateGeminiResponse } from './gemini.js';

export interface RouteResult {
  source: 'local_responder' | 'gemini' | 'contextual_fallback';
  text: string;
}

export async function resolveAgentMessage(
  sender: string,
  userMessage: string,
  config: AgentConfig,
  fetchFn: typeof fetch = fetch
): Promise<RouteResult> {
  // Step 1: Check Deterministic Local Responder (Instant, 0 API calls)
  const localMatch = matchLocalResponder(userMessage, config.nametag);
  if (localMatch.matched && localMatch.text) {
    console.log(`[AI ROUTER] Local responder matched: ${localMatch.category}`);
    return {
      source: 'local_responder',
      text: localMatch.text
    };
  }

  // Step 2: Query Gemini AI (with cooldown circuit breaker)
  console.log(`[AI ROUTER] No local match. Routing to Gemini (model: ${config.geminiModel})...`);
  const geminiResult = await generateGeminiResponse(sender, userMessage, config, fetchFn);

  if (geminiResult.success && geminiResult.text) {
    return {
      source: 'gemini',
      text: geminiResult.text
    };
  }

  // Step 3: Contextual Fallback (Guarantees no dropped DMs)
  console.log(`[AI ROUTER] Gemini unavailable (${geminiResult.error}). Generating contextual fallback response.`);
  return {
    source: 'contextual_fallback',
    text: getContextualFallback(userMessage, config.nametag)
  };
}
