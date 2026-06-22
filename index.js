// patternfetch — tiny zero-dependency client for the agent-first market-state brief API.
// ticker + timeframe in -> token-compact brief (candles, patterns, S/R, regime, indicators) out.
// Impersonal market data, NOT investment advice. Docs: https://patternfetch.com

const DEFAULT_BASE = 'https://patternfetch.com';

export class PatternfetchError extends Error {
  constructor(message, { status, code, hint } = {}) {
    super(message);
    this.name = 'PatternfetchError';
    this.status = status;
    this.code = code;
    this.hint = hint;
  }
}

export class Patternfetch {
  /**
   * @param {{ apiKey?: string, baseUrl?: string, fetch?: typeof fetch, timeoutMs?: number }} [opts]
   */
  constructor(opts = {}) {
    this.apiKey = opts.apiKey ?? process?.env?.PATTERNFETCH_API_KEY;
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE).replace(/\/+$/, '');
    this._fetch = opts.fetch ?? globalThis.fetch;
    this.timeoutMs = opts.timeoutMs ?? 60_000;
    if (typeof this._fetch !== 'function') {
      throw new PatternfetchError('global fetch is unavailable; pass opts.fetch (Node 18+ has it built in)');
    }
  }

  async _post(path, payload, { auth = true } = {}) {
    const headers = { 'content-type': 'application/json' };
    if (auth) {
      if (!this.apiKey) throw new PatternfetchError('missing API key — set PATTERNFETCH_API_KEY or pass { apiKey } (free key: https://patternfetch.com)');
      headers.authorization = `Bearer ${this.apiKey}`;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    let res;
    try {
      res = await this._fetch(`${this.baseUrl}${path}`, {
        method: 'POST', headers, body: JSON.stringify(payload), signal: ctrl.signal,
      });
    } catch (e) {
      throw new PatternfetchError(`request to ${path} failed: ${e?.message ?? e}`);
    } finally {
      clearTimeout(timer);
    }
    return this._parse(res, path);
  }

  async _get(path) {
    const res = await this._fetch(`${this.baseUrl}${path}`);
    return this._parse(res, path);
  }

  async _parse(res, path) {
    let json = null;
    try { json = await res.json(); } catch { /* non-JSON */ }
    if (!res.ok) {
      throw new PatternfetchError(json?.message ?? `HTTP ${res.status} from ${path}`, {
        status: res.status, code: json?.error,
      });
    }
    return json;
  }

  /** Token-compact market-state brief: candles + patterns + S/R + regime + indicators + summary. */
  brief({ ticker, timeframe, limit, fields } = {}) {
    return this._post('/v1/brief', { ticker, timeframe, ...(limit ? { limit } : {}), ...(fields ? { fields } : {}) });
  }

  /** Only what changed since your last brief for this ticker+timeframe (token-minimal polling). */
  delta({ ticker, timeframe, limit } = {}) {
    return this._post('/v1/delta', { ticker, timeframe, ...(limit ? { limit } : {}) });
  }

  /** Compact candle codec only (rows + SAX shape signature). */
  candles({ ticker, timeframe, limit } = {}) {
    return this._post('/v1/candles', { ticker, timeframe, ...(limit ? { limit } : {}) });
  }

  /** Historical analogs as a FULL outcome distribution (not a prediction). */
  analogs({ ticker, timeframe, window, horizon } = {}) {
    return this._post('/v1/analogs', { ticker, timeframe, ...(window ? { window } : {}), ...(horizon ? { horizon } : {}) });
  }

  /** Capability matrix (no auth). */
  platforms() { return this._get('/v1/platforms'); }

  /** Create a self-serve API key with a small free credit. Returns { key }. */
  createKey(email) { return this._post('/v1/keys', { email }, { auth: false }); }
}

export default Patternfetch;
