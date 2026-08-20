import express from 'express';
import cors from 'cors';

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
  network: 'testnet',
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
    console.log(`🌐 Status API Server listening at http://localhost:${port}/api/status`);
  });
}
