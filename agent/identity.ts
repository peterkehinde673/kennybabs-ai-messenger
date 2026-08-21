import { Sphere } from '@unicitylabs/sphere-sdk';
import { createNodeProviders, FileStorageProvider } from '@unicitylabs/sphere-sdk/impl/nodejs';
import { createWalletApiProviders } from '@unicitylabs/sphere-sdk/impl/shared/wallet-api';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { AgentConfig } from './config.js';

export interface WalletIdentity {
  sphere: any;
  directAddress: string;
  chainPublicKey: string;
  transportPublicKey: string;
  nametag: string;
  isExisting: boolean;
}

export async function initializePersistentIdentity(config: AgentConfig): Promise<WalletIdentity> {
  const walletDataDir = path.join(config.dataDir, 'wallet-store');
  if (!fs.existsSync(walletDataDir)) {
    fs.mkdirSync(walletDataDir, { recursive: true });
  }

  // Persistent Device ID for Wallet API session stability
  const deviceIdFile = path.join(config.dataDir, 'device-id.json');
  let deviceId: string;
  if (fs.existsSync(deviceIdFile)) {
    try {
      deviceId = JSON.parse(fs.readFileSync(deviceIdFile, 'utf8')).deviceId;
    } catch {
      deviceId = crypto.randomUUID();
      fs.writeFileSync(deviceIdFile, JSON.stringify({ deviceId }, null, 2));
    }
  } else {
    deviceId = crypto.randomUUID();
    fs.writeFileSync(deviceIdFile, JSON.stringify({ deviceId }, null, 2));
  }

  // Safe dmSince lookback handling
  const lastTimestampFile = path.join(config.dataDir, 'last_dm_timestamp.json');
  let dmSince = Math.floor(Date.now() / 1000) - 10;
  if (fs.existsSync(lastTimestampFile)) {
    try {
      const saved = JSON.parse(fs.readFileSync(lastTimestampFile, 'utf8')).timestamp;
      if (typeof saved === 'number' && saved > 0) {
        dmSince = Math.max(saved - 15, Math.floor(Date.now() / 1000) - 3600);
      }
    } catch {}
  }

  const storage = new FileStorageProvider(walletDataDir);
  const isExisting = fs.existsSync(path.join(walletDataDir, 'tokens.json')) || 
                     fs.existsSync(path.join(walletDataDir, 'identity.json'));

  const baseProviders = createNodeProviders({
    network: config.network,
    storage
  } as any);

  const providers = createWalletApiProviders(baseProviders, {
    network: config.network,
    baseUrl: config.walletApiUrl,
    oracleApiKey: config.oracleApiKey,
    deviceId
  } as any);

  console.log(`⏳ ${isExisting ? 'Loading persistent wallet' : 'Initializing persistent wallet'} from ${walletDataDir}...`);

  const initResult = await Sphere.init({
    network: config.network,
    oracle: { apiKey: config.oracleApiKey },
    ...providers,
    autoGenerate: false,
    mnemonic: config.mnemonic,
    dmSince
  });

  const sphere = (initResult as any).sphere || initResult;

  // Extract real runtime identity from Sphere
  let directAddress = '';
  let chainPublicKey = '';
  let transportPublicKey = '';

  if (sphere.identity) {
    directAddress = sphere.identity.directAddress || '';
    chainPublicKey = sphere.identity.chainPubkey || sphere.identity.chainPublicKey || '';
    transportPublicKey = sphere.identity.transportPubkey || sphere.identity.transportPublicKey || '';
  }

  if (!directAddress && typeof sphere.getAddress === 'function') {
    directAddress = await sphere.getAddress();
  }

  if (!chainPublicKey && sphere.wallet && typeof sphere.wallet.getPublicKey === 'function') {
    chainPublicKey = await sphere.wallet.getPublicKey();
  }

  if (!directAddress) {
    throw new Error('FATAL: Direct Address could not be resolved from the initialized Sphere instance.');
  }

  if (!chainPublicKey) {
    throw new Error('FATAL: Chain Public Key could not be resolved from the initialized Sphere instance.');
  }

  let currentNametag = config.nametag;
  try {
    if (sphere.wallet && typeof sphere.wallet.getNametag === 'function') {
      const registered = await sphere.wallet.getNametag();
      if (registered) currentNametag = registered;
    } else if (sphere.identity?.nametag) {
      currentNametag = sphere.identity.nametag;
    }
  } catch {}

  return {
    sphere,
    directAddress,
    chainPublicKey,
    transportPublicKey,
    nametag: currentNametag,
    isExisting
  };
}
