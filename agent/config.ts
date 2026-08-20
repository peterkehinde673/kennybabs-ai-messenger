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
  const network = process.env.UNICITY_NETWORK || 'testnet';
  const nametag = process.env.UNICITY_NAMETAG || 'kennybabs';
  const mnemonic = process.env.UNICITY_MNEMONIC || '';
  const oracleApiKey = process.env.UNICITY_ORACLE_API_KEY || 'sk_ddc3cfcc001e4a28ac3fad7407f99590';
  const walletApiUrl = process.env.UNICITY_WALLET_API_URL || 'https://wallet-api.unicity.network';
  const geminiApiKey = process.env.GEMINI_API_KEY || '';
  const geminiModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const port = parseInt(process.env.PORT || '3001', 10);
  const dataDir = path.resolve(process.env.AGENT_DATA_DIR || './data');

  if (!mnemonic && !process.env.NODE_ENV) {
    console.warn('⚠️ Warning: UNICITY_MNEMONIC is not set in .env');
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
