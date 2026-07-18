<!-- mcp-name: io.github.MarvinRey7879/patternfetch -->

# patternfetch

**patternfetch is a market-data API for AI agents covering US stocks, ETFs and crypto spot.** One
call with a ticker and a timeframe returns a token-compact market-state report: compact candles,
detected chart and candlestick patterns, support and resistance levels, market regime, and
interpreted indicators (RSI, EMA). Every detected pattern carries its backtested historical hit rate
**and** its lift against the pattern-free baseline of the same market, so an agent can tell a
pattern that carries information from one that does not. Six tools — `brief`, `multi`, `delta`,
`analogs`, `scan`, `capabilities` — reachable over REST and MCP, with one-click OAuth, credit
billing via Stripe or x402 USDC on Base, a keyless demo endpoint, and $3 starter credit on signup.
Impersonal market data, not investment advice.

[![npm](https://img.shields.io/npm/v/patternfetch)](https://www.npmjs.com/package/patternfetch)
[![patternfetch MCP server](https://glama.ai/mcp/servers/MarvinRey7879/patternfetch-client/badges/score.svg)](https://glama.ai/mcp/servers/MarvinRey7879/patternfetch-client)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

> **Why it's smaller:** for BTC/USDT 4h (120 candles), a raw OHLCV dump is ~3,260 tokens of just numbers the model still has to analyze; patternfetch's interpreted analysis is ~1,323 tokens, already decided. [Reproduce it](https://gist.github.com/MarvinRey7879/cf149d4b57db78fb9cba104c8805d556) (no account needed).

- **Coverage:** US stocks and ETFs (split- and dividend-adjusted, delayed/EOD, via Yahoo), crypto
  spot (realtime, via Binance).
- **Timeframes:** `1m`, `5m`, `15m`, `30m`, `1h`, `4h`, `1d`, `1w`.
- **Access:** REST at `patternfetch.com/v1/*`, MCP at `patternfetch.com/mcp` (Streamable HTTP),
  plus a local stdio bridge (`patternfetch-mcp`).

## Why base rates and lift

A detector that only reports `double_top, confidence 0.92` tells an agent nothing about whether that
pattern has ever meant anything. patternfetch attaches an `evidence` block to each detected pattern:

```json
{
  "name": "double_top",
  "confidence": 0.92,
  "evidence": {
    "scope": "US stocks & ETFs",
    "tf": "1d",
    "band": "0.75-1.00",
    "horizon": 10,
    "n": 7508,
    "hitRate": 0.431,
    "ci95": 0.011,
    "lift": {
      "baseline": 0.419979,
      "baselineN": 46038,
      "lift": 0.011021,
      "ci95": 0.012075,
      "informative": false,
      "reading": "indistinguishable-from-baseline"
    }
  }
}
```

`hitRate` is the realizable gross directional base rate: the fraction of non-overlapping historical
occurrences of that pattern, in that timeframe and confidence band, whose close-to-close return over
the next `horizon` bars went the expected direction. The forward window starts at detection, so
there is no lookahead. No stops, fees or slippage are modelled.

`lift` compares that hit rate against the baseline of the same market with no pattern present. Many
patterns come back `indistinguishable-from-baseline` — that is the honest result, and reporting it
is the point. An agent can filter on `informative` instead of trusting a geometric confidence score.

**Calibration.** Across 105 audited categories, 3 fall outside their confidence interval — fewer
than the ~5.3 that chance alone predicts across 105 comparisons. For US stocks it is 0 of 60. Method
and full tables:
[patternfetch.com/pattern-base-rates-study](https://patternfetch.com/pattern-base-rates-study). The
measurement is reproducible with the open-source
[honest-signals](https://github.com/MarvinRey7879/honest-signals) tool.

## Quickstart

No key required — the demo endpoint is public:

```bash
curl -X POST https://patternfetch.com/v1/demo \
  -H 'content-type: application/json' \
  -d '{"ticker":"AAPL","timeframe":"1d"}'
```

With a key (self-serve, $3 starter credit):

```bash
curl -X POST https://patternfetch.com/v1/keys -d '{"email":"you@example.com"}'

curl -X POST https://patternfetch.com/v1/brief \
  -H 'authorization: Bearer pf_...' \
  -H 'content-type: application/json' \
  -d '{"ticker":"BTC/USDT","timeframe":"4h"}'
```

JavaScript client:

```bash
npm install patternfetch
```

```js
import { Patternfetch } from 'patternfetch';

const { key } = await new Patternfetch().createKey('you@example.com');
const pf = new Patternfetch({ apiKey: key });

const brief = await pf.brief({ ticker: 'AAPL', timeframe: '1d' });

console.log(brief.analysis.nl);
// "AAPL: uptrend (strong), +0.14% last 1d, RSI 71.66 (overbought),
//  bearish_engulfing (conf 1, hist 41% over 10b, lift -0.7pp vs 42% base (within noise))."

for (const p of brief.analysis.patterns) {
  if (p.evidence?.lift.informative) console.log(p.name, p.evidence.hitRate, p.evidence.lift.lift);
}
```

## Tools

Six tools, the same set over MCP (`patternfetch_*`) and REST (`POST /v1/*`).

| Tool | What it returns | When an agent calls it |
|---|---|---|
| `brief` | Market-state report for one ticker + timeframe: compact candles, patterns with base rate and lift, support/resistance, regime, RSI/EMA, one-line summary. | The default. It needs the current technical picture of one market without dumping raw OHLCV into context. |
| `multi` | One brief per timeframe (default `1h`, `4h`, `1d`) plus a cross-timeframe alignment read that spells out agreement or divergence, e.g. `1h up / 4h up / 1d down`. | It wants to know whether a setup is confirmed or contradicted across horizons, without three separate `brief` calls. |
| `delta` | Only what changed since the last brief for that ticker + timeframe — trend flips, new patterns, RSI-state changes. Returns `changed: false` when nothing material moved. | It polls the same market repeatedly. Call `brief` once, then `delta` on every later poll to keep token cost near zero. |
| `analogs` | Historical windows whose shape resembles current price action, with the full distribution of what followed: win rate, median, mean, min, max and n over a fixed forward horizon. | It wants the historical outcome spread for a setup rather than a point estimate. Not a prediction, not a strategy backtest. |
| `scan` | Screener over a curated universe of liquid US large-caps, core and sector ETFs and major crypto pairs. Filter by asset class, regime, pattern and minimum base rate; rows return ranked by base rate with 95% CI. Precomputed daily. | It needs to *find* candidates across the market rather than analyse a ticker it already named. Feed the shortlist into `brief`. |
| `capabilities` | Supported assets, timeframes, endpoints, limits and pricing. No input. | First, before relying on any assumption about coverage. |

### Client methods

| Method | Endpoint |
|---|---|
| `brief({ticker, timeframe, limit?, fields?, market?})` | `POST /v1/brief` |
| `multi({ticker, timeframes?, limit?, market?})` | `POST /v1/multi` |
| `delta({ticker, timeframe, limit?})` | `POST /v1/delta` |
| `analogs({ticker, timeframe, window?, horizon?})` | `POST /v1/analogs` |
| `scan({assetClass?, regime?, pattern?, tf?, minBaseRate?, limit?})` | `POST /v1/scan` |
| `candles({ticker, timeframe})` | `POST /v1/candles` |
| `platforms()` | `GET /v1/platforms` |
| `createKey(email)` | `POST /v1/keys` |

## MCP

patternfetch is a **remote MCP server** (Streamable HTTP) at `https://patternfetch.com/mcp`.
Tools: `patternfetch_brief`, `patternfetch_multi`, `patternfetch_delta`, `patternfetch_analogs`,
`patternfetch_scan`, `patternfetch_capabilities`.
Discovery (`initialize`, `tools/list`) is free — no key. Only `tools/call` needs auth.

**One-click OAuth (nothing to paste)** — in Claude Code, Claude Desktop, Cursor or Smithery, add the
URL and authorize once; a free-tier key is minted for you:

```bash
claude mcp add --transport http patternfetch https://patternfetch.com/mcp
```

In **claude.ai**: Customize → Connectors → Add custom connector → `https://patternfetch.com/mcp` → Authorize.

**Or with a Bearer key** — add to your MCP config:

```json
{
  "mcpServers": {
    "patternfetch": {
      "url": "https://patternfetch.com/mcp",
      "headers": { "Authorization": "Bearer pf_..." }
    }
  }
}
```

Get a free key (small starter credit) at `https://patternfetch.com/v1/keys`.

### Local stdio bridge

Prefer a local stdio server (Claude Desktop, sandboxes, no inbound HTTP)? This package
ships `patternfetch-mcp`, a zero-dependency stdio↔HTTP bridge that exposes the same tools
and forwards calls to `patternfetch.com`:

```json
{
  "mcpServers": {
    "patternfetch": {
      "command": "npx",
      "args": ["-y", "patternfetch-mcp"],
      "env": { "PATTERNFETCH_API_KEY": "pf_..." }
    }
  }
}
```

`tools/list` works with no key and falls back to the embedded snapshot
([`mcp-tools.json`](./mcp-tools.json)) when the remote is unreachable, so introspection always
succeeds. Tool calls use `PATTERNFETCH_API_KEY`, OAuth or x402. Override the endpoint with
`PATTERNFETCH_MCP_URL`.

Refresh the snapshot from the live server:

```bash
curl -s -X POST https://patternfetch.com/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Pricing

$3 starter credit on signup, at least $0.50 of it usable immediately without a card. After that, pay
per call from credit, topped up via Stripe or x402 USDC on Base. Studio plan: $19/month including
$25 of usage.

| Call | Price |
|---|---|
| `/v1/brief` | $0.010 |
| `/v1/multi` | $0.025 |
| `/v1/delta` | $0.008 ($0.001 when nothing changed) |
| `/v1/candles` | $0.005 |
| `/v1/analogs` | $0.050 |
| `/v1/scan` | $0.020 |

Live figures: `GET /v1/platforms`.

## Legal

patternfetch provides **impersonal market data and algorithmic signals for informational purposes
only**. NOT investment, financial, legal or tax advice, and not a recommendation to buy, sell or
hold any security or crypto-asset. Outputs are not personalized to you. Base rates are gross
directional frequencies without stops, fees or slippage; past performance and historical analogs do
not guarantee future results. Markets are volatile — you may lose all capital. Do your own research.
See [patternfetch.com/disclaimer](https://patternfetch.com/disclaimer),
[/methodology](https://patternfetch.com/methodology) and
[/terms](https://patternfetch.com/terms).
