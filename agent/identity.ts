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

  // Persistent Device ID for Wallet API session consistency across restarts
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
    mnemonic: config.mnemonic
  });

  const sphere = (initResult as any).sphere || initResult;

  // Canonical identity extraction directly from initialized Sphere instance
  const directAddress = sphere.identity?.directAddress;
  const chainPublicKey = sphere.identity?.chainPubkey;
  const transportPublicKey = sphere.identity?.transportPubkey || '';
  const nametag = sphere.identity?.nametag || config.nametag;

  if (!directAddress) {
    throw new Error('FATAL: sphere.identity.directAddress is undefined on initialized Sphere instance.');
  }

  if (!chainPublicKey) {
    throw new Error('FATAL: sphere.identity.chainPubkey is undefined on initialized Sphere instance.');
  }

  return {
    sphere,
    directAddress,
    chainPublicKey,
    transportPublicKey,
    nametag,
    isExisting
  };
}
