import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export type NetworkType = 'testnet2' | 'mainnet' | 'testnet' | 'dev';

export interface AgentConfig {
  network: NetworkType;
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
  const rawNetwork = (process.env.UNICITY_NETWORK || 'testnet2').trim();
  const network: NetworkType = (['testnet2', 'mainnet', 'testnet', 'dev'].includes(rawNetwork)
    ? rawNetwork
    : 'testnet2') as NetworkType;

  const nametag = (process.env.UNICITY_NAMETAG || 'kennybabs').trim();
  const mnemonic = (process.env.UNICITY_MNEMONIC || '').trim().replace(/^["']|["']$/g, '');
  const oracleApiKey = (process.env.UNICITY_ORACLE_API_KEY || '').trim().replace(/^["']|["']$/g, '');
  const walletApiUrl = (process.env.UNICITY_WALLET_API_URL || 'https://wallet-api.unicity.network').trim();
  const geminiApiKey = (process.env.GEMINI_API_KEY || '').trim().replace(/['"\s]/g, '');
  const geminiModel = (process.env.GEMINI_MODEL || 'gemini-3.6-flash').trim();
  const port = parseInt(process.env.PORT || '3001', 10);
  const dataDir = path.resolve(process.env.AGENT_DATA_DIR || './data');

  if (!mnemonic) {
    throw new Error('FATAL: UNICITY_MNEMONIC is missing from .env. A valid recovery mnemonic is required.');
  }

  if (!oracleApiKey) {
    throw new Error('FATAL: UNICITY_ORACLE_API_KEY is missing from .env.');
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
