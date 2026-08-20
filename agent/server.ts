import express from 'express';
import cors from 'cors';
import path from 'path';

export interface AgentRuntimeStats {
  status: string;
  network: string;
  nametag: string;
  directAddress: string;
  chainPublicKey: string;
  dmListenerActive: boolean;
  geminiActive: boolean;
  uptimeSeconds: number;
  totalIncomingDms: number;
  totalOutgoingDms: number;
  lastIncomingTimestamp: string | null;
  lastOutgoingTimestamp: string | null;
  recentEvents: any[];
}

let startTime = Date.now();
const events: any[] = [];
let incomingCount = 0;
let outgoingCount = 0;
let lastIncomingTime: string | null = null;
let lastOutgoingTime: string | null = null;

let currentStats: AgentRuntimeStats = {
  status: 'initializing',
  network: 'testnet2',
  nametag: 'kennybabs',
  directAddress: '',
  chainPublicKey: '',
  dmListenerActive: false,
  geminiActive: false,
  uptimeSeconds: 0,
  totalIncomingDms: 0,
  totalOutgoingDms: 0,
  lastIncomingTimestamp: null,
  lastOutgoingTimestamp: null,
  recentEvents: []
};

export function updateRuntimeStats(partial: Partial<AgentRuntimeStats>) {
  currentStats = { ...currentStats, ...partial };
}

export function updateDMStats(isIncoming: boolean) {
  const now = new Date().toISOString();
  if (isIncoming) {
    incomingCount++;
    lastIncomingTime = now;
  } else {
    outgoingCount++;
    lastOutgoingTime = now;
  }
}

export function pushEvent(event: any) {
  events.unshift(event);
  if (events.length > 20) events.pop();
}

export function startStatusServer(port: number) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Serve static visual dashboard files
  app.use(express.static(path.resolve('frontend')));

  app.get('/', (req, res) => {
    res.sendFile(path.resolve('frontend/index.html'));
  });

  app.get('/api/status', (req, res) => {
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    res.json({
      ...currentStats,
      uptimeSeconds: uptime,
      totalIncomingDms: incomingCount,
      totalOutgoingDms: outgoingCount,
      lastIncomingTimestamp: lastIncomingTime,
      lastOutgoingTimestamp: lastOutgoingTime,
      recentEvents: events
    });
  });

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.listen(port, () => {
    console.log(`🌐 Control Center UI running at http://localhost:${port}`);
    console.log(`🌐 Status API running at http://localhost:${port}/api/status`);
  });
}
