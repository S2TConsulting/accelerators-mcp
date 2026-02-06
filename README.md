# S2T Accelerators MCP Server

[![npm version](https://img.shields.io/npm/v/s2t-mcp-accelerators.svg)](https://www.npmjs.com/package/s2t-mcp-accelerators)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io)

MCP server providing Claude with access to S2T's battle-tested enterprise accelerators:

- **Vector Embeddings** (ACC-AI-001) - Generate embeddings for RAG, semantic search
- **CloudFormation Generator** (ACC-AWS-001) - Generate production-ready SAM/CFN templates
- **OAuth Validator** (ACC-INT-001) - Validate OAuth configurations before deployment

## Quick Start

### 1. Install

```bash
npm install -g s2t-mcp-accelerators
```

### 2. Get an API Key

Visit https://dev.s2tconsulting.com/ai-sales/purchase.html to create an account and get your API key.

### 3. Configure Claude Desktop

Add to your Claude Desktop config file:

**macOS/Linux:** `~/.config/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "s2t-accelerators": {
      "command": "npx",
      "args": ["s2t-mcp-accelerators"],
      "env": {
        "S2T_API_KEY": "sk_live_your_api_key_here"
      }
    }
  }
}
```

Restart Claude Desktop to activate the tools.

## Available Tools

### s2t_embed

Generate vector embeddings for text. Supports automatic chunking for long documents.

```
Input:
- text: string (required) - Text to embed (max 100,000 characters)
- model: "amazon.titan-embed-text-v2:0" | "amazon.titan-embed-text-v1"
- chunk_size: number (100-2000, default: 512)
- chunk_overlap: number (0-500, default: 50)

Output: Embedding vectors with metadata
```

**Use cases:** RAG systems, semantic search, document similarity, knowledge base indexing

### s2t_generate_cloudformation

Generate CloudFormation/SAM templates from natural language descriptions.

```
Input:
- description: string (required) - What infrastructure you need (max 5000 chars)
- format: "sam" | "cloudformation" (default: sam)
- include_parameters: boolean (default: true)
- include_outputs: boolean (default: true)

Output: Complete YAML template with best practices
```

**Supported resources:** Lambda, API Gateway, DynamoDB, S3, SQS, SNS, EventBridge, IAM

### s2t_validate_oauth

Validate OAuth 2.0 configuration and detect common misconfigurations.

```
Input:
- provider: "google" | "microsoft" | "github" | "quickbooks" | "generic"
- client_id: string (required)
- redirect_uris: string[] (required)
- scopes: string[] (required)
- token_endpoint: string (optional, for generic)
- authorization_endpoint: string (optional, for generic)

Output: Validation results, warnings, recommendations
```

**Detects:** Invalid client IDs, insecure redirect URIs, missing scopes, deprecated endpoints

### s2t_catalog

List all available S2T accelerators with their capabilities and pricing.

### s2t_usage

Check your API usage statistics and remaining quota.

## Pricing

| Tier | Price | Rate Limit | Monthly Limit |
|------|-------|------------|---------------|
| Free | $0 | 10/min | 100 |
| Developer | $29/mo | 60/min | 5,000 |
| Business | $99/mo | 300/min | 50,000 |
| Enterprise | $299/mo | 1,000/min | Unlimited |

## Local Development

```bash
git clone https://github.com/S2TConsulting/accelerators-mcp.git
cd accelerators-mcp
npm install
npm run build
npm test
```

### MCP Inspector

Test the server interactively with the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

### Running Locally

```bash
# Set API key
export S2T_API_KEY="sk_live_your_api_key"

# Run server
npm start
```

### Testing

```bash
npm test              # Run tests once
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## Configuration Options

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `S2T_API_KEY` | Your S2T API key (required) | - |
| `S2T_API_URL` | Custom API endpoint | Production API |

### Claude Code

For Claude Code projects, add to `~/.mcp.json` (or project-level `.mcp.json`):

```json
{
  "mcpServers": {
    "s2t-accelerators": {
      "command": "npx",
      "args": ["s2t-mcp-accelerators"],
      "env": {
        "S2T_API_KEY": "sk_live_your_api_key_here"
      }
    }
  }
}
```

## Support

- **Website:** https://www.s2tconsulting.com
- **Email:** sales@s2tconsulting.com
- **Issues:** https://github.com/S2TConsulting/accelerators-mcp/issues

## License

MIT - See [LICENSE](LICENSE) file for details.
