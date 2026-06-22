// Type definitions for patternfetch (hand-written, no build step).

export interface PatternfetchOptions {
  apiKey?: string;
  baseUrl?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

export interface Query {
  ticker: string;
  timeframe: '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';
  limit?: number;
  fields?: Array<'candles' | 'patterns' | 'levels' | 'regime' | 'indicators' | 'nl'>;
}

export interface PatternHit { name: string; confidence: number; at: number; span: number; }
export interface Level { price: number; strength: number; }
export interface Brief {
  header: { sym: string; tf: string; src: string; n: number; t0: number; t1: number };
  codec: { rows: string; sax: string; precision: number };
  analysis: {
    patterns: PatternHit[];
    levels: { support: Level[]; resistance: Level[] };
    regime: { trend: 'up' | 'down' | 'range'; strength: number; volPct: number };
    indicators: Record<string, { v: number; state: string }>;
    nl: string;
  };
  disclaimer: string;
  methodologyUrl: string;
}

export class PatternfetchError extends Error {
  status?: number;
  code?: string;
  hint?: string;
}

export class Patternfetch {
  constructor(opts?: PatternfetchOptions);
  apiKey?: string;
  baseUrl: string;
  brief(q: Query): Promise<Brief>;
  delta(q: Omit<Query, 'fields'>): Promise<{ delta: { changed: boolean; notes: string[] }; brief?: Brief }>;
  candles(q: Omit<Query, 'fields'>): Promise<{ header: object; codec: object; disclaimer: string }>;
  analogs(q: { ticker: string; timeframe: Query['timeframe']; window?: number; horizon?: number }): Promise<unknown>;
  platforms(): Promise<unknown>;
  createKey(email: string): Promise<{ key: string }>;
}

export default Patternfetch;
