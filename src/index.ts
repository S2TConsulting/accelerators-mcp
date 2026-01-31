#!/usr/bin/env node
/**
 * S2T Accelerators MCP Server
 *
 * Provides Claude with access to S2T's battle-tested accelerators:
 * - Vector Embeddings (ACC-AI-001)
 * - CloudFormation Generator (ACC-AWS-001)
 * - OAuth Configuration Validator (ACC-INT-001)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import {
  handleEmbed,
  handleCloudFormation,
  handleOAuthValidate,
  handleCatalog,
  handleUsage,
  ApiClient,
} from "./handlers.js";

// Configuration
const API_BASE_URL =
  process.env.S2T_API_URL ||
  "https://mh873houvh.execute-api.us-east-1.amazonaws.com/v1";
const API_KEY = process.env.S2T_API_KEY;

if (!API_KEY) {
  console.error("Error: S2T_API_KEY environment variable is required");
  console.error(
    "Get your API key at: https://dev.s2tconsulting.com/ai-sales/purchase.html"
  );
  process.exit(1);
}

// Tool definitions
export const TOOLS: Tool[] = [
  {
    name: "s2t_embed",
    description:
      "Generate vector embeddings for text using S2T's embedding pipeline. Supports chunking for long documents. Use for RAG, semantic search, and document indexing.",
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description:
            "The text to generate embeddings for (max 100,000 characters)",
        },
        model: {
          type: "string",
          enum: ["amazon.titan-embed-text-v2:0", "amazon.titan-embed-text-v1"],
          default: "amazon.titan-embed-text-v2:0",
          description: "Embedding model to use",
        },
        chunk_size: {
          type: "integer",
          default: 512,
          description: "Tokens per chunk when chunking is needed (100-2000)",
        },
        chunk_overlap: {
          type: "integer",
          default: 50,
          description: "Token overlap between chunks (0-500)",
        },
      },
      required: ["text"],
    },
  },
  {
    name: "s2t_generate_cloudformation",
    description:
      "Generate production-ready SAM/CloudFormation templates from natural language descriptions. Creates Lambda functions, API Gateway, DynamoDB tables, S3 buckets with security best practices.",
    inputSchema: {
      type: "object",
      properties: {
        description: {
          type: "string",
          description:
            "Natural language description of the infrastructure needed (max 5000 chars)",
        },
        format: {
          type: "string",
          enum: ["sam", "cloudformation"],
          default: "sam",
          description: "Output format",
        },
        include_parameters: {
          type: "boolean",
          default: true,
          description: "Include CloudFormation parameters section",
        },
        include_outputs: {
          type: "boolean",
          default: true,
          description: "Include CloudFormation outputs section",
        },
      },
      required: ["description"],
    },
  },
  {
    name: "s2t_validate_oauth",
    description:
      "Validate OAuth 2.0 configuration and detect common misconfigurations. Supports Google, Microsoft, GitHub, QuickBooks, and generic providers.",
    inputSchema: {
      type: "object",
      properties: {
        provider: {
          type: "string",
          enum: ["google", "microsoft", "github", "quickbooks", "generic"],
          description: "OAuth provider to validate against",
        },
        client_id: {
          type: "string",
          description: "OAuth client ID",
        },
        redirect_uris: {
          type: "array",
          items: { type: "string" },
          description: "Authorized redirect URIs",
        },
        scopes: {
          type: "array",
          items: { type: "string" },
          description: "Requested OAuth scopes",
        },
        token_endpoint: {
          type: "string",
          description:
            "Custom token endpoint URL (optional, for generic provider)",
        },
        authorization_endpoint: {
          type: "string",
          description:
            "Custom authorization endpoint URL (optional, for generic provider)",
        },
      },
      required: ["provider", "client_id", "redirect_uris", "scopes"],
    },
  },
  {
    name: "s2t_catalog",
    description:
      "List all available S2T accelerators with their capabilities, pricing, and usage information.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "s2t_usage",
    description: "Get your current API usage statistics and remaining quota.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];

// API client implementation
function createApiClient(baseUrl: string, apiKey: string): ApiClient {
  return {
    async callApi(
      endpoint: string,
      method: string = "GET",
      body?: object
    ): Promise<unknown> {
      const url = `${baseUrl}${endpoint}`;

      const options: RequestInit = {
        method,
        headers: {
          "X-S2T-API-Key": apiKey,
          "Content-Type": "application/json",
        },
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          (data as { error?: { message?: string } }).error?.message ||
            `API error: ${response.status}`
        );
      }

      return data;
    },
  };
}

// Server setup
const server = new Server(
  {
    name: "s2t-accelerators",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const apiClient = createApiClient(API_BASE_URL, API_KEY);

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: string;

    switch (name) {
      case "s2t_embed":
        result = await handleEmbed(args as Record<string, unknown>, apiClient);
        break;
      case "s2t_generate_cloudformation":
        result = await handleCloudFormation(
          args as Record<string, unknown>,
          apiClient
        );
        break;
      case "s2t_validate_oauth":
        result = await handleOAuthValidate(
          args as Record<string, unknown>,
          apiClient
        );
        break;
      case "s2t_catalog":
        result = await handleCatalog(apiClient);
        break;
      case "s2t_usage":
        result = await handleUsage(apiClient);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{ type: "text", text: result }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("S2T Accelerators MCP server running");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
