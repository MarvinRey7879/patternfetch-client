// Run: PATTERNFETCH_API_KEY=pf_... node examples/brief.mjs BTC/USDT 4h
import { Patternfetch } from '../index.js';

const [, , ticker = 'BTC/USDT', timeframe = '4h'] = process.argv;
const pf = new Patternfetch(); // reads PATTERNFETCH_API_KEY

const brief = await pf.brief({ ticker, timeframe });
console.log(brief.analysis.nl);
console.log('regime  :', brief.analysis.regime);
console.log('patterns:', brief.analysis.patterns.slice(0, 5));
console.log('levels  :', brief.analysis.levels);
console.log('sax     :', brief.codec.sax);
