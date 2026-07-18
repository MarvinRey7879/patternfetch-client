// Type definitions for patternfetch (hand-written, no build step).

export interface PatternfetchOptions {
  apiKey?: string;
  baseUrl?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';
export type AssetClass = 'stock' | 'crypto' | 'all';
export type Regime = 'up' | 'down' | 'range';

export interface Query {
  ticker: string;
  timeframe: Timeframe;
  limit?: number;
  fields?: Array<'candles' | 'patterns' | 'levels' | 'regime' | 'indicators' | 'nl'>;
  market?: 'crypto' | 'stock';
}

/** Backtested evidence attached to a detected pattern. */
export interface PatternEvidence {
  scope: string;
  tf: string;
  band: string;
  horizon: number;
  n: number;
  /** Realizable gross directional base rate: no lookahead, no stops/fees/slippage. */
  hitRate: number;
  ci95: number;
  dist: { n: number; horizon: number; winRate: number; median: number; mean: number; min: number; max: number };
  lift: {
    baseline: number;
    baselineN: number;
    lift: number;
    ci95: number;
    ci95Clustered?: number;
    /** False when the pattern is indistinguishable from the pattern-free baseline. */
    informative: boolean;
    reading: string;
  };
  definition: string;
}

export interface PatternHit {
  name: string;
  confidence: number;
  at: number;
  span: number;
  evidence?: PatternEvidence;
}

export interface ScanRow {
  sym: string;
  assetClass: 'stock' | 'crypto';
  regime: Regime;
  pattern: string;
  baseRate: number;
  ci95: number;
  n: number;
  scope: string;
  confidence: number;
}
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
  multi(q: { ticker: string; timeframes?: Timeframe[]; limit?: number; market?: 'crypto' | 'stock' }): Promise<{
    briefs: Record<string, Brief>;
    alignment: { aligned: boolean; note: string };
    disclaimer: string;
  }>;
  scan(q?: {
    assetClass?: AssetClass;
    regime?: Regime;
    pattern?: string;
    tf?: Timeframe;
    minBaseRate?: number;
    limit?: number;
  }): Promise<{ rows: ScanRow[]; disclaimer: string }>;
  delta(q: Omit<Query, 'fields'>): Promise<{ delta: { changed: boolean; notes: string[] }; brief?: Brief }>;
  candles(q: Omit<Query, 'fields'>): Promise<{ header: object; codec: object; disclaimer: string }>;
  analogs(q: { ticker: string; timeframe: Timeframe; window?: number; horizon?: number }): Promise<unknown>;
  platforms(): Promise<unknown>;
  createKey(email: string): Promise<{ key: string }>;
}

export default Patternfetch;
