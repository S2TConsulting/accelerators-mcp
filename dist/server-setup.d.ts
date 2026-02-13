/**
 * S2T Accelerators MCP Server - Shared Setup
 *
 * Contains tool definitions, API client factory, and request handler
 * registration logic shared between the stdio (index.ts) and HTTP
 * (http-server.ts) entry points.
 *
 * @module server-setup
 * @version 1.4.0
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { ApiClient } from "./handlers.js";
export type { ApiClient };
export declare const SERVER_NAME = "s2t-accelerators";
export declare const SERVER_VERSION = "1.4.0";
export declare const TOOLS: Tool[];
export declare function createApiClient(baseUrl: string, apiKey: string): ApiClient;
/**
 * Create a fully configured MCP Server instance with all S2T tools and
 * handlers registered. The returned server is transport-agnostic -- callers
 * connect it to whichever transport they need (stdio, HTTP, etc.).
 */
export declare function createMcpServer(apiClient: ApiClient): Server;
