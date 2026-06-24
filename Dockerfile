# Minimal image so Glama (and anyone) can build, start, and introspect the
# stdio MCP server. Zero runtime dependencies — no install step required.
FROM node:20-alpine
WORKDIR /app
COPY mcp.js mcp-tools.json ./
# Speaks the Model Context Protocol over stdio (stdin/stdout).
ENTRYPOINT ["node", "mcp.js"]
