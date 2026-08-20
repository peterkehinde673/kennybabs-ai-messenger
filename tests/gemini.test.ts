import { describe, it, expect } from 'vitest';
import { generateAgentResponse } from '../agent/gemini.js';

describe('Gemini AI Fallback & Rate Limiter', () => {
  it('returns informative fallback message when API key is not configured', async () => {
    const config = {
      network: 'testnet',
      nametag: 'kennybabs',
      mnemonic: 'test',
      oracleApiKey: 'test',
      walletApiUrl: 'https://wallet-api.unicity.network',
      geminiApiKey: '',
      geminiModel: 'gemini-1.5-flash',
      port: 3001,
      dataDir: './data'
    };

    const reply = await generateAgentResponse('DIRECT://test-sender', 'Hello bot', config);
    expect(reply).toContain('Kennybabs');
    expect(reply).toContain('Hello bot');
  });
});
