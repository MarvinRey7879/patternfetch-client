// patternfetch client — offline smoke (no network): construct + verify the surface.
import assert from 'node:assert/strict';
import { Patternfetch, PatternfetchError } from './index.js';

const pf = new Patternfetch({ apiKey: 'pf_test', baseUrl: 'https://patternfetch.com' });
assert.equal(pf.baseUrl, 'https://patternfetch.com');
for (const m of ['brief', 'delta', 'candles', 'analogs', 'platforms', 'createKey']) {
  assert.equal(typeof pf[m], 'function', `missing method ${m}`);
}
// error class carries status/code
const e0 = new PatternfetchError('x', { status: 402, code: 'PAYMENT_REQUIRED' });
assert.equal(e0.status, 402);
assert.equal(e0.code, 'PAYMENT_REQUIRED');
// auth required for brief without key
await new Patternfetch({ baseUrl: 'http://127.0.0.1:0' }).brief({ ticker: 'BTC/USDT', timeframe: '1h' })
  .then(() => { throw new Error('should have thrown (no key)'); })
  .catch((e) => assert.ok(e instanceof PatternfetchError));
console.log('ok — client surface verified');
