import { Sphere } from '@unicitylabs/sphere-sdk';
import { createNodeProviders, FileStorageProvider } from '@unicitylabs/sphere-sdk/impl/nodejs';
import { createWalletApiProviders } from '@unicitylabs/sphere-sdk/impl/shared/wallet-api';
import path from 'path';
import fs from 'fs';
import { AgentConfig } from './config.js';

export interface WalletIdentity {
  sphere: any;
  directAddress: string;
  chainPublicKey: string;
  nametag: string;
  isExisting: boolean;
}

export async function initializePersistentIdentity(config: AgentConfig): Promise<WalletIdentity> {
  const walletDataDir = path.join(config.dataDir, 'wallet-store');
  if (!fs.existsSync(walletDataDir)) {
    fs.mkdirSync(walletDataDir, { recursive: true });
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
    oracleApiKey: config.oracleApiKey
  });

  console.log(`⏳ ${isExisting ? 'Loading existing' : 'Initializing new'} persistent wallet from ${walletDataDir}...`);

  const initResult = await Sphere.init({
    network: config.network,
    oracle: { apiKey: config.oracleApiKey },
    ...providers,
    autoGenerate: false,
    mnemonic: config.mnemonic,
    dmSince: Math.floor(Date.now() / 1000)
  });

  const sphere = (initResult as any).sphere || initResult;

  // Extract actual runtime identity from the Sphere instance (No hardcoded fallbacks)
  let directAddress = '';
  if (typeof (sphere as any).getAddress === 'function') {
    directAddress = await (sphere as any).getAddress();
  } else if (sphere.wallet && typeof (sphere.wallet as any).getAddress === 'function') {
    directAddress = await (sphere.wallet as any).getAddress();
  } else if ((sphere as any).identity?.directAddress) {
    directAddress = (sphere as any).identity.directAddress;
  } else if ((sphere as any).directAddress) {
    directAddress = (sphere as any).directAddress;
  }

  let chainPublicKey = '';
  if (sphere.wallet && typeof (sphere.wallet as any).getPublicKey === 'function') {
    chainPublicKey = await (sphere.wallet as any).getPublicKey();
  } else if ((sphere as any).identity?.chainPubkey) {
    chainPublicKey = (sphere as any).identity.chainPubkey;
  } else {
    chainPublicKey = directAddress;
  }

  if (!directAddress) {
    throw new Error('FATAL: Could not resolve Direct Address from initialized Sphere wallet.');
  }

  let currentNametag = config.nametag;
  try {
    if (sphere.wallet && typeof (sphere.wallet as any).getNametag === 'function') {
      const registered = await (sphere.wallet as any).getNametag();
      if (registered) currentNametag = registered;
    } else if ((sphere as any).identity?.nametag) {
      currentNametag = (sphere as any).identity.nametag;
    }
  } catch {}

  return {
    sphere,
    directAddress,
    chainPublicKey,
    nametag: currentNametag,
    isExisting
  };
}
