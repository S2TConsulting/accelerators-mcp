#!/usr/bin/env node
/**
 * S2T Accelerators MCP Server
 *
 * Provides Claude with access to S2T's battle-tested accelerators:
 * - Vector Embeddings (ACC-AI-001)
 * - CloudFormation Generator (ACC-AWS-001)
 * - OAuth Configuration Validator (ACC-INT-001)
 */
import { Tool } from "@modelcontextprotocol/sdk/types.js";
export declare const TOOLS: Tool[];
