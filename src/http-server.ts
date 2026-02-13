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

import express, { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import {
  createApiClient,
  createMcpServer,
  SERVER_NAME,
  SERVER_VERSION,
} from "./server-setup.js";
import { initializeLocalContext } from './local-context.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const API_BASE_URL =
  process.env.S2T_API_URL ||
  "https://mh873houvh.execute-api.us-east-1.amazonaws.com/v1";
const API_KEY = process.env.S2T_API_KEY as string | undefined;
const PORT = parseInt(process.env.PORT || "3001", 10);

if (!API_KEY) {
  console.error("Error: S2T_API_KEY environment variable is required");
  console.error(
    "Get your API key at: https://dev.s2tconsulting.com/ai-sales/purchase.html"
  );
  process.exit(1);
}

// TypeScript cannot narrow through process.exit; assert after the guard.
const apiKey: string = API_KEY;

// Initialize local context (free-tier tools powered by @s2t/core)
initializeLocalContext();

const apiClient = createApiClient(API_BASE_URL, apiKey);

// ---------------------------------------------------------------------------
// Logging helper
// ---------------------------------------------------------------------------

function log(level: "info" | "warn" | "error", message: string, meta?: Record<string, unknown>): void {
  const entry = {
    ts: new Date().toISOString(),
    level,
    server: SERVER_NAME,
    version: SERVER_VERSION,
    message,
    ...meta,
  };
  if (level === "error") {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

// ---------------------------------------------------------------------------
// Session stores
// ---------------------------------------------------------------------------

// Streamable HTTP: one transport per session
const streamableTransports = new Map<string, StreamableHTTPServerTransport>();

// Legacy SSE: one transport per connection
const sseTransports = new Map<string, SSEServerTransport>();

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------

const app = express();

// -- CORS ------------------------------------------------------------------
const ALLOWED_ORIGINS = new Set(
  (process.env.S2T_CORS_ORIGINS || "").split(",").filter(Boolean)
);

function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true; // Allow same-origin / non-browser requests
  if (ALLOWED_ORIGINS.size === 0) return true; // No restriction if env not set (local dev)
  if (ALLOWED_ORIGINS.has(origin)) return true;
  // Allow any *.s2tconsulting.com subdomain
  try {
    const url = new URL(origin);
    if (url.hostname === "s2tconsulting.com" || url.hostname.endsWith(".s2tconsulting.com")) {
      return true;
    }
  } catch { /* invalid origin */ }
  return false;
}

app.use((req: Request, res: Response, next) => {
  const origin = req.headers.origin as string | undefined;
  if (isOriginAllowed(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Accept, Mcp-Session-Id, Last-Event-ID, X-S2T-API-Key"
  );
  res.setHeader(
    "Access-Control-Expose-Headers",
    "Mcp-Session-Id"
  );
  res.setHeader("Vary", "Origin");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

// JSON body parsing (only for non-SSE routes)
app.use(express.json());

// ---------------------------------------------------------------------------
// Streamable HTTP transport (protocol version 2025-11-25)
// ---------------------------------------------------------------------------

/** POST /mcp - handle JSON-RPC requests */
app.post("/mcp", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  let transport: StreamableHTTPServerTransport;

  if (sessionId && streamableTransports.has(sessionId)) {
    // Existing session
    transport = streamableTransports.get(sessionId)!;
  } else if (!sessionId && isInitializeRequest(req.body)) {
    // New session
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (newSessionId) => {
        streamableTransports.set(newSessionId, transport);
        log("info", "Streamable HTTP session created", { sessionId: newSessionId });
      },
    });

    // Clean up on close
    transport.onclose = () => {
      const sid = Array.from(streamableTransports.entries()).find(
        ([, t]) => t === transport
      )?.[0];
      if (sid) {
        streamableTransports.delete(sid);
        log("info", "Streamable HTTP session closed", { sessionId: sid });
      }
    };

    // Wire up a fresh MCP server for this session
    const server = createMcpServer(apiClient);
    await server.connect(transport);
  } else {
    // No session header and not an initialize request
    res.status(400).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Bad request: no valid session. Send an initialize request first.",
      },
      id: null,
    });
    return;
  }

  await transport.handleRequest(req, res, req.body);
});

/** GET /mcp - open SSE stream for server-initiated messages */
app.get("/mcp", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (!sessionId || !streamableTransports.has(sessionId)) {
    res.status(400).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Bad request: invalid or missing session ID.",
      },
      id: null,
    });
    return;
  }

  const transport = streamableTransports.get(sessionId)!;
  await transport.handleRequest(req, res);
});

/** DELETE /mcp - terminate session */
app.delete("/mcp", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (!sessionId || !streamableTransports.has(sessionId)) {
    res.status(400).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Bad request: invalid or missing session ID.",
      },
      id: null,
    });
    return;
  }

  const transport = streamableTransports.get(sessionId)!;
  await transport.handleRequest(req, res);
  streamableTransports.delete(sessionId);
  log("info", "Streamable HTTP session terminated via DELETE", { sessionId });
});

// ---------------------------------------------------------------------------
// Legacy SSE transport (protocol version 2024-11-05)
// ---------------------------------------------------------------------------

/** GET /sse - establish SSE connection (legacy) */
app.get("/sse", async (req: Request, res: Response) => {
  const connectionId = randomUUID();
  log("info", "Legacy SSE connection opening", { connectionId });

  const transport = new SSEServerTransport("/messages", res);
  sseTransports.set(connectionId, transport);

  // Clean up on disconnect
  res.on("close", () => {
    sseTransports.delete(connectionId);
    log("info", "Legacy SSE connection closed", { connectionId });
  });

  const server = createMcpServer(apiClient);
  await server.connect(transport);
});

/** POST /messages - receive messages for legacy SSE session */
app.post("/messages", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string | undefined;

  if (!sessionId) {
    res.status(400).json({ error: "Missing sessionId query parameter" });
    return;
  }

  // Find the transport whose sessionId matches the query param. The
  // SSEServerTransport stores its sessionId after the GET /sse handshake.
  let matched: SSEServerTransport | undefined;
  for (const transport of sseTransports.values()) {
    // SSEServerTransport exposes sessionId after connection
    if ((transport as unknown as { _sessionId: string })._sessionId === sessionId) {
      matched = transport;
      break;
    }
  }

  if (!matched) {
    res.status(404).json({ error: "Session not found. Connect via GET /sse first." });
    return;
  }

  await matched.handlePostMessage(req, res, req.body);
});

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    server: SERVER_NAME,
    version: SERVER_VERSION,
    transport: {
      streamableHttp: true,
      legacySse: true,
    },
    sessions: {
      streamable: streamableTransports.size,
      sse: sseTransports.size,
    },
    uptime: Math.floor(process.uptime()),
  });
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

const httpServer = app.listen(PORT, () => {
  log("info", `S2T Accelerators MCP HTTP server listening`, {
    port: PORT,
    endpoints: {
      streamableHttp: `http://localhost:${PORT}/mcp`,
      legacySse: `http://localhost:${PORT}/sse`,
      health: `http://localhost:${PORT}/health`,
    },
  });
});

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

async function shutdown(signal: string): Promise<void> {
  log("info", `Received ${signal}, shutting down gracefully`);

  // Close all Streamable HTTP transports
  const streamableClosePromises: Promise<void>[] = [];
  for (const [sid, transport] of streamableTransports) {
    log("info", "Closing streamable session", { sessionId: sid });
    streamableClosePromises.push(
      transport.close().catch((err) => {
        log("error", "Error closing streamable transport", {
          sessionId: sid,
          error: String(err),
        });
      })
    );
  }
  await Promise.allSettled(streamableClosePromises);
  streamableTransports.clear();

  // Close all legacy SSE transports
  sseTransports.clear();

  // Shut down the HTTP listener
  httpServer.close((err) => {
    if (err) {
      log("error", "Error closing HTTP server", { error: String(err) });
      process.exit(1);
    }
    log("info", "HTTP server closed");
    process.exit(0);
  });

  // Force exit after timeout if graceful shutdown stalls
  setTimeout(() => {
    log("warn", "Graceful shutdown timed out, forcing exit");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
