#!/usr/bin/env node
// patternfetch — zero-dependency stdio MCP bridge.
// Proxies Model Context Protocol calls to the hosted patternfetch MCP server.
// tools/list is served from an embedded snapshot (mcp-tools.json) so introspection
// always succeeds, even before the first network round-trip; tool calls are
// forwarded to the remote endpoint.
//
// Env:
//   PATTERNFETCH_MCP_URL   override the remote MCP endpoint (default https://patternfetch.com/mcp)
//   PATTERNFETCH_API_KEY   optional bearer key for authenticated (non-x402) calls
import { stdin, stdout, env, exit } from "node:process";
import { readFileSync } from "node:fs";

const REMOTE = env.PATTERNFETCH_MCP_URL || "https://patternfetch.com/mcp";
const API_KEY = env.PATTERNFETCH_API_KEY || "";
const PROTOCOL = "2025-06-18";
const SERVER_INFO = { name: "patternfetch", version: "0.1.0" };

let STATIC_TOOLS = [];
try {
  STATIC_TOOLS = JSON.parse(readFileSync(new URL("./mcp-tools.json", import.meta.url), "utf8"));
} catch { /* snapshot optional; remote tools/list still works */ }

stdout.on("error", () => {}); // ignore EPIPE if the client closes the pipe early

function send(msg) {
  stdout.write(JSON.stringify(msg) + "\n");
}

// Remote may answer with plain JSON or an SSE frame ("event: message\ndata: {...}").
function parseRpc(text) {
  const s = text.trim();
  if (s.startsWith("{")) {
    try { return JSON.parse(s); } catch { /* fall through to SSE parse */ }
  }
  for (const line of s.split(/\r?\n/)) {
    const m = line.match(/^data:\s*(.*)$/);
    if (m) {
      try { return JSON.parse(m[1]); } catch { /* ignore non-JSON data lines */ }
    }
  }
  return null;
}

async function remoteRpc(method, params) {
  const res = await fetch(REMOTE, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "accept": "application/json, text/event-stream",
      ...(API_KEY ? { authorization: `Bearer ${API_KEY}` } : {}),
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const j = parseRpc(await res.text());
  if (!j) throw new Error("invalid response from remote MCP");
  if (j.error) throw new Error(j.error.message || "remote MCP error");
  return j.result;
}

async function listTools() {
  try {
    const r = await remoteRpc("tools/list", {});
    if (r && Array.isArray(r.tools) && r.tools.length) return r.tools;
  } catch { /* remote unreachable — fall back to embedded snapshot */ }
  return STATIC_TOOLS;
}

async function handle(msg) {
  const { id, method, params } = msg;
  if (method === "initialize")
    return send({ jsonrpc: "2.0", id, result: { protocolVersion: PROTOCOL, capabilities: { tools: {} }, serverInfo: SERVER_INFO } });
  if (method === "ping")
    return send({ jsonrpc: "2.0", id, result: {} });
  if (typeof method === "string" && method.startsWith("notifications/"))
    return; // notifications carry no id and need no reply
  if (method === "tools/list")
    return send({ jsonrpc: "2.0", id, result: { tools: await listTools() } });
  if (method === "tools/call") {
    try {
      return send({ jsonrpc: "2.0", id, result: await remoteRpc("tools/call", params) });
    } catch (e) {
      return send({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true } });
    }
  }
  if (id !== undefined)
    return send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } });
}

let buf = "";
let pending = 0;
let ended = false;
const tryExit = () => { if (ended && pending === 0) setImmediate(() => exit(0)); };
stdin.setEncoding("utf8");
stdin.on("data", (chunk) => {
  buf += chunk;
  let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    pending++;
    Promise.resolve(handle(msg)).catch(() => {}).finally(() => { pending--; tryExit(); });
  }
});
// Exit only once stdin is closed AND every in-flight response has been flushed.
stdin.on("end", () => { ended = true; tryExit(); });
