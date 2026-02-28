FROM node:22-slim

LABEL org.opencontainers.image.title="S2T Accelerators MCP Server"
LABEL org.opencontainers.image.description="36 enterprise tools for AWS, security, AI, and governance"
LABEL org.opencontainers.image.source="https://github.com/S2TConsulting/accelerators-mcp"
LABEL org.opencontainers.image.licenses="MIT"

WORKDIR /app

RUN npm install -g s2t-mcp-accelerators@1.4.2

ENV NODE_ENV=production

ENTRYPOINT ["s2t-mcp-accelerators"]
