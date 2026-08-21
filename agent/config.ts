import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export interface AgentConfig {
  network: string;
  nametag: string;
  mnemonic: string;
  oracleApiKey: string;
  walletApiUrl: string;
  geminiApiKey: string;
  geminiModel: string;
  port: number;
  dataDir: string;
}

export function loadConfig(): AgentConfig {
  const network = process.env.UNICITY_NETWORK || 'testnet2';
  const nametag = process.env.UNICITY_NAMETAG || 'kennybabs';
  const mnemonic = (process.env.UNICITY_MNEMONIC || '').trim().replace(/^["']|["']$/g, '');
  const oracleApiKey = (process.env.UNICITY_ORACLE_API_KEY || 'sk_ddc3cfcc001e4a28ac3fad7407f99590').trim();
  const walletApiUrl = (process.env.UNICITY_WALLET_API_URL || 'https://wallet-api.unicity.network').trim();
  const geminiApiKey = (process.env.GEMINI_API_KEY || '').trim().replace(/['"\s]/g, '');
  const geminiModel = (process.env.GEMINI_MODEL || 'gemini-2.0-flash').trim();
  const port = parseInt(process.env.PORT || '3001', 10);
  const dataDir = path.resolve(process.env.AGENT_DATA_DIR || './data');

  if (!mnemonic) {
    throw new Error('FATAL: UNICITY_MNEMONIC is missing from .env. A valid recovery mnemonic is required.');
  }

  return {
    network,
    nametag,
    mnemonic,
    oracleApiKey,
    walletApiUrl,
    geminiApiKey,
    geminiModel,
    port,
    dataDir
  };
}
