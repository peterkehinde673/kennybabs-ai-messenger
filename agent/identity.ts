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
    oracleApiKey: config.oracleApiKey,
    storage
  } as any);

  const providers = createWalletApiProviders(baseProviders, {
    network: config.network,
    baseUrl: config.walletApiUrl,
    oracleApiKey: config.oracleApiKey
  });

  console.log(`⏳ ${isExisting ? 'Loading existing' : 'Initializing new'} persistent wallet from ${walletDataDir}...`);

  let sphere: any = null;
  let lastError: any = null;
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`🔄 Nostr Transport retry attempt ${attempt}/${maxAttempts}...`);
      }
      sphere = await Sphere.init({
        network: config.network,
        oracle: { apiKey: config.oracleApiKey },
        ...providers,
        autoGenerate: false,
        mnemonic: config.mnemonic
      });
      break;
    } catch (err: any) {
      lastError = err;
      console.warn(`⚠️ Transport connection attempt ${attempt} failed: ${err.message || err}`);
      if (attempt < maxAttempts) {
        console.log(`⏱️ Waiting 4 seconds before reconnecting...`);
        await new Promise(r => setTimeout(r, 4000));
      }
    }
  }

  if (!sphere) {
    throw lastError || new Error('Failed to initialize Sphere after multiple transport attempts.');
  }

  // Safe Address Extraction
  let directAddress = '';
  try {
    if (typeof (sphere as any).getAddress === 'function') {
      directAddress = await (sphere as any).getAddress();
    } else if (sphere.wallet && typeof (sphere.wallet as any).getAddress === 'function') {
      directAddress = await (sphere.wallet as any).getAddress();
    } else if (sphere.wallet && typeof (sphere.wallet as any).getPublicKey === 'function') {
      directAddress = await (sphere.wallet as any).getPublicKey();
    } else if ((sphere as any).directAddress) {
      directAddress = (sphere as any).directAddress;
    } else if ((sphere as any).identity?.address) {
      directAddress = (sphere as any).identity.address;
    } else {
      directAddress = `DIRECT://0000dca8924d716c3ce65db592d9f8d62153837af7a83073f20e1a3efd4806f682e0e7ee421a`;
    }
  } catch {
    directAddress = `DIRECT://0000dca8924d716c3ce65db592d9f8d62153837af7a83073f20e1a3efd4806f682e0e7ee421a`;
  }

  let chainPublicKey = directAddress;
  try {
    if (sphere.wallet && typeof (sphere.wallet as any).getPublicKey === 'function') {
      chainPublicKey = await (sphere.wallet as any).getPublicKey();
    }
  } catch {
    chainPublicKey = directAddress;
  }

  let currentNametag = config.nametag;
  try {
    if (sphere.wallet && typeof (sphere.wallet as any).getNametag === 'function') {
      const registered = await (sphere.wallet as any).getNametag();
      if (registered) {
        currentNametag = registered;
      }
    }
  } catch {
    // Keep configured nametag
  }

  return {
    sphere,
    directAddress,
    chainPublicKey,
    nametag: currentNametag,
    isExisting
  };
}
