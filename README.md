<!-- mcp-name: io.github.MarvinRey7879/patternfetch -->

# patternfetch

**One call turns a crypto ticker + timeframe into a token-compact market-state brief** — compact
candles, detected chart/candlestick patterns, support/resistance, trend/regime, and interpreted
indicators (RSI/EMA state) plus a one-line summary. So your AI agent never has to dump raw OHLCV
into its context (saves tokens, avoids numeric hallucination).

Agent-first **API + MCP**. Crypto spot, minute-to-daily. Pay per call via **x402** (USDC on Base,
no account) or **Stripe**. **Impersonal market data — not investment advice.**

[![npm](https://img.shields.io/npm/v/patternfetch)](https://www.npmjs.com/package/patternfetch)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

## Install

```bash
npm install patternfetch
```

## Quickstart

```js
import { Patternfetch } from 'patternfetch';

// free key (small free credit included)
const { key } = await new Patternfetch().createKey('you@example.com');

const pf = new Patternfetch({ apiKey: key });
const brief = await pf.brief({ ticker: 'BTC/USDT', timeframe: '4h' });

console.log(brief.analysis.nl);
// "BTC/USDT: uptrend (strong), +2.1% last 4h, RSI 68 (neutral), bullish_engulfing (conf 1)."
console.log(brief.analysis.patterns, brief.analysis.levels, brief.analysis.regime);
```

Or with `curl`:

```bash
curl -X POST https://patternfetch.com/v1/keys -d '{"email":"you@example.com"}'
curl -X POST https://patternfetch.com/v1/brief \
  -H "authorization: Bearer pf_..." \
  -d '{"ticker":"BTC/USDT","timeframe":"4h"}'
```

## Methods

| Method | Endpoint | What |
|---|---|---|
| `brief({ticker, timeframe, limit?, fields?})` | `POST /v1/brief` | Full market-state brief |
| `delta({ticker, timeframe})` | `POST /v1/delta` | Only what changed since your last brief (token-minimal polling) |
| `candles({ticker, timeframe})` | `POST /v1/candles` | Compact candle codec (rows + SAX) |
| `analogs({ticker, timeframe, window?, horizon?})` | `POST /v1/analogs` | Historical analogs as a full outcome distribution |
| `platforms()` | `GET /v1/platforms` | Capabilities |
| `createKey(email)` | `POST /v1/keys` | Self-serve key + free credit |

## MCP

patternfetch is a **remote MCP server** (Streamable HTTP) at `https://patternfetch.com/mcp`.
Tools: `patternfetch_brief`, `patternfetch_delta`, `patternfetch_analogs`, `patternfetch_capabilities`.
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

`tools/list` works with no key; tool calls use `PATTERNFETCH_API_KEY` (or x402). Override the
endpoint with `PATTERNFETCH_MCP_URL`.

## Legal

patternfetch provides **impersonal market data and algorithmic signals for informational purposes
only**. NOT investment, financial, legal or tax advice and not a recommendation to buy, sell or hold
any crypto-asset. Outputs are not personalized to you. Past performance and historical analogs do
not guarantee future results. Crypto-assets are highly volatile — you may lose all capital. Do your
own research. See [patternfetch.com/disclaimer](https://patternfetch.com/disclaimer) and
[/terms](https://patternfetch.com/terms).
