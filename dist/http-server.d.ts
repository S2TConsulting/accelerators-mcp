#!/usr/bin/env node
/**
 * S2T Accelerators MCP Server - Streamable HTTP + SSE Transport
 *
 * Exposes the same MCP tool surface as the stdio entry point (index.ts) over
 * HTTP, supporting both the current Streamable HTTP protocol (2025-11-25) and
 * the legacy SSE transport (2024-11-05).
 *
 * Endpoints:
 *   POST   /mcp       Streamable HTTP requests (JSON-RPC over HTTP)
 *   GET    /mcp       Streamable HTTP SSE stream (server-to-client)
 *   DELETE /mcp       Session termination
 *   GET    /sse       Legacy SSE transport connection
 *   POST   /messages  Legacy SSE message submission
 *   GET    /health    Health check
 *
 * Environment variables:
 *   S2T_API_KEY   (required)  API key for the S2T Accelerator Platform
 *   S2T_API_URL   (optional)  Override API base URL
 *   PORT          (optional)  HTTP listen port (default: 3001)
 *
 * @module http-server
 * @version 1.3.0
 */
export {};
