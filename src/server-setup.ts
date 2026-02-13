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
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import {
  handleEmbed,
  handleCloudFormation,
  handleOAuthValidate,
  handleIamPolicyValidate,
  handleMfaCompliance,
  handleDynamoDbDesign,
  handleErrorPatterns,
  handleDataLakeReadiness,
  handleCatalog,
  handleUsage,
  handleRiskClassify,
  handleTaskRouting,
  handlePredictIssues,
  handleAutoRecovery,
  handleResilienceExecute,
  handleAgentMemory,
  handleAgentTask,
  handleTraceContext,
  handleFileLock,
  handleCliReadiness,
  // ACI Governance handlers
  handleAciClassify,
  handleAciFinancialGate,
  handleAciComplianceCheck,
  handleAciRouteDomain,
  handleAciParallelReview,
  handleAciSynthesizeReviews,
  handleAciLogDecision,
  handleAciRecallPrecedent,
  handleAciRecordOutcome,
  handleAciBlastRadius,
  handleAciRollback,
  handleAciGovernanceHealth,
  ApiClient,
} from "./handlers.js";
import {
  handleInterviewCreate,
  handleInterviewMessage,
  handleInterviewSummary,
  handleInterviewList,
} from './local-handlers.js';

export type { ApiClient };

export const SERVER_NAME = "s2t-accelerators";
export const SERVER_VERSION = "1.4.2";

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

export const TOOLS: Tool[] = [
  // =========================================================================
  // AI & EMBEDDINGS (2 tools)
  // =========================================================================
  {
    name: "s2t_embed",
    title: "Generate Vector Embeddings",
    description:
      "Generate vector embeddings for text using Amazon Bedrock Titan models. Supports automatic chunking for long documents. Use when building RAG pipelines, semantic search, document similarity, or knowledge base indexing. Returns embedding vectors with chunk metadata. No side effects -- read-only computation.",
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          minLength: 1,
          maxLength: 100000,
          description: "The text to generate embeddings for",
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
          minimum: 100,
          maximum: 2000,
          description: "Tokens per chunk when chunking is needed",
        },
        chunk_overlap: {
          type: "integer",
          default: 50,
          minimum: 0,
          maximum: 500,
          description: "Token overlap between chunks",
        },
      },
      required: ["text"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "s2t_analyze_error_patterns",
    title: "Analyze Error Patterns",
    description:
      "Analyze application error logs to identify recurring patterns, root causes, and trends. Use when debugging production issues, performing post-mortems, or monitoring error spikes. Returns categorized patterns with severity and remediation suggestions. No side effects -- read-only analysis.",
    inputSchema: {
      type: "object",
      properties: {
        errors: {
          type: "array",
          items: {
            type: "object",
            properties: {
              message: { type: "string", minLength: 1, description: "Error message text" },
              timestamp: { type: "string", minLength: 1, maxLength: 50, description: "ISO 8601 timestamp of the error" },
              source: { type: "string", minLength: 1, maxLength: 500, description: "Source service or function name" },
              stack_trace: { type: "string", maxLength: 50000, description: "Stack trace for deeper analysis" },
            },
            required: ["message"],
            additionalProperties: false,
          },
          minItems: 1,
          maxItems: 1000,
          description: "Array of error objects to analyze",
        },
        include_ai_analysis: {
          type: "boolean",
          default: true,
          description: "Include AI-powered deep analysis with root-cause inference",
        },
      },
      required: ["errors"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },

  // =========================================================================
  // INFRASTRUCTURE & CLOUD (4 tools)
  // =========================================================================
  {
    name: "s2t_generate_cloudformation",
    title: "Generate CloudFormation Template",
    description:
      "Generate production-ready SAM or CloudFormation templates from natural language descriptions. Creates Lambda functions, API Gateway, DynamoDB tables, and S3 buckets with security best practices. Use when scaffolding new AWS infrastructure. Returns YAML template with resource definitions. No side effects -- generates template text only.",
    inputSchema: {
      type: "object",
      properties: {
        description: {
          type: "string",
          minLength: 10,
          maxLength: 5000,
          description: "Natural language description of the infrastructure needed",
        },
        format: {
          type: "string",
          enum: ["sam", "cloudformation"],
          default: "sam",
          description: "Output template format: SAM (serverless) or plain CloudFormation",
        },
        include_parameters: {
          type: "boolean",
          default: true,
          description: "Include CloudFormation Parameters section for configurable values",
        },
        include_outputs: {
          type: "boolean",
          default: true,
          description: "Include CloudFormation Outputs section for stack exports",
        },
      },
      required: ["description"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "s2t_validate_oauth",
    title: "Validate OAuth Configuration",
    description:
      "Validate an OAuth 2.0 configuration and detect common misconfigurations before deployment. Supports Google, Microsoft, GitHub, QuickBooks, and generic OpenID Connect providers. Use when setting up or troubleshooting OAuth integrations. Returns validation errors, warnings, and provider-specific recommendations. No side effects -- read-only validation.",
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
          minLength: 1,
          description: "OAuth client ID from the provider's developer console",
        },
        redirect_uris: {
          type: "array",
          items: { type: "string", minLength: 1 },
          minItems: 1,
          description: "Authorized redirect URIs registered with the provider",
        },
        scopes: {
          type: "array",
          items: { type: "string", minLength: 1 },
          minItems: 1,
          description: "Requested OAuth scopes (e.g., 'openid', 'email', 'profile')",
        },
        token_endpoint: {
          type: "string",
          minLength: 1,
          maxLength: 2048,
          description: "Custom token endpoint URL (required for generic provider)",
        },
        authorization_endpoint: {
          type: "string",
          minLength: 1,
          maxLength: 2048,
          description: "Custom authorization endpoint URL (required for generic provider)",
        },
      },
      required: ["provider", "client_id", "redirect_uris", "scopes"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "s2t_generate_dynamodb_design",
    title: "Design DynamoDB Table",
    description:
      "Generate optimal DynamoDB single-table designs from entity and access pattern descriptions. Use when designing NoSQL data models or migrating from relational databases. Returns key schema, GSI recommendations, entity mappings, and deployable CloudFormation template. No side effects -- generates design document only.",
    inputSchema: {
      type: "object",
      properties: {
        entities: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string", minLength: 1, description: "Entity name (e.g., User, Order)" },
              description: { type: "string", maxLength: 500, description: "What this entity represents" },
              attributes: {
                type: "array",
                items: { type: "string" },
                minItems: 1,
                maxItems: 100,
                description: "Key attributes of the entity",
              },
            },
            required: ["name"],
            additionalProperties: false,
          },
          minItems: 1,
          maxItems: 50,
          description: "Entities to model in the single-table design",
        },
        access_patterns: {
          type: "array",
          items: { type: "string", minLength: 1 },
          minItems: 1,
          maxItems: 100,
          description: "Access patterns to support (e.g., 'Get user by ID', 'List orders by user')",
        },
        options: {
          type: "object",
          properties: {
            table_name: { type: "string", minLength: 1, description: "Desired DynamoDB table name" },
            billing_mode: { type: "string", enum: ["PAY_PER_REQUEST", "PROVISIONED"], description: "DynamoDB billing mode" },
          },
          additionalProperties: false,
        },
      },
      required: ["entities", "access_patterns"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "s2t_check_data_lake_readiness",
    title: "Assess Data Lake Readiness",
    description:
      "Assess data lake architecture readiness for production deployment. Evaluates five dimensions: S3 storage configuration, Glue catalog setup, security controls, query performance, and operational tooling. Use before promoting a data lake to production. Returns readiness score (0-100) and prioritized recommendations. No side effects -- read-only assessment.",
    inputSchema: {
      type: "object",
      properties: {
        storage: {
          type: "object",
          description: "S3 storage configuration flags (e.g., versioning, lifecycle, encryption, replication, partitioning)",
          additionalProperties: true,
        },
        catalog: {
          type: "object",
          description: "Glue catalog configuration flags (e.g., databases, crawlers, schemas, classifiers)",
          additionalProperties: true,
        },
        security: {
          type: "object",
          description: "Security configuration flags (e.g., IAM, encryption, VPC, audit logging, lake formation)",
          additionalProperties: true,
        },
        performance: {
          type: "object",
          description: "Performance configuration flags (e.g., partitioning, compression, caching, query engine)",
          additionalProperties: true,
        },
        operations: {
          type: "object",
          description: "Operations configuration flags (e.g., monitoring, alerting, backup, disaster recovery)",
          additionalProperties: true,
        },
      },
      required: [],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },

  // =========================================================================
  // SECURITY & COMPLIANCE (3 tools)
  // =========================================================================
  {
    name: "s2t_validate_iam_policy",
    title: "Validate IAM Policy",
    description:
      "Validate an AWS IAM policy document for security best practices. Detects overly permissive permissions, dangerous action wildcards, and missing resource scoping. Use when reviewing IAM policies before deployment or during security audits. Returns security score (0-100) with categorized findings (CRITICAL/HIGH/MEDIUM/LOW) and least-privilege alternatives. No side effects -- read-only validation.",
    inputSchema: {
      type: "object",
      properties: {
        policy_document: {
          type: ["string", "object"],
          description: "The IAM policy document to validate (JSON string or parsed object)",
        },
        resource_type: {
          type: "string",
          enum: ["s3", "dynamodb", "lambda", "sns", "sqs", "iam", "general"],
          default: "general",
          description: "Focus validation on a specific AWS resource type for deeper checks",
        },
        suggest_improvements: {
          type: "boolean",
          default: true,
          description: "Include least-privilege permission alternatives in the response",
        },
      },
      required: ["policy_document"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "s2t_validate_mfa_compliance",
    title: "Check MFA Compliance",
    description:
      "Validate IAM users and root account for MFA compliance. Checks console access, programmatic access, hardware vs virtual MFA, and policy-level MFA conditions. Use during security audits or compliance reviews (SOC2, CIS Benchmarks). Returns compliance score and user-level remediation recommendations. No side effects -- read-only check.",
    inputSchema: {
      type: "object",
      properties: {
        users: {
          type: "array",
          items: {
            type: "object",
            properties: {
              username: { type: "string", minLength: 1, description: "IAM username" },
              has_console_access: { type: "boolean", description: "Whether user has AWS Console access" },
              has_access_keys: { type: "boolean", description: "Whether user has active access keys" },
              mfa_enabled: { type: "boolean", description: "Whether MFA is currently enabled" },
              mfa_type: { type: "string", enum: ["virtual", "hardware"], description: "Type of MFA device" },
              is_privileged: { type: "boolean", description: "Whether user has elevated privileges" },
              is_admin: { type: "boolean", description: "Whether user has admin-level access" },
            },
            additionalProperties: false,
          },
          minItems: 1,
          maxItems: 500,
          description: "List of IAM users to check for MFA compliance",
        },
        root_account: {
          type: "object",
          properties: {
            mfa_enabled: { type: "boolean", description: "Whether root account has MFA enabled" },
            mfa_type: { type: "string", enum: ["virtual", "hardware"], description: "Root MFA device type" },
          },
          additionalProperties: false,
          description: "Root account MFA configuration",
        },
        policies: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string", minLength: 1, description: "Policy name" },
              document: { type: ["string", "object"], description: "Policy document (JSON string or object)" },
            },
            additionalProperties: false,
          },
          minItems: 1,
          maxItems: 200,
          description: "IAM policies to check for MFA condition requirements",
        },
      },
      required: [],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "s2t_validate_cli_readiness",
    title: "Validate CLI Readiness",
    description:
      "Validate CLI tool availability and API key health on the current system. Use before running agent workflows that depend on external CLIs (codex, claude, git). Returns readiness status per tool with degradation mode recommendations if tools are missing. No side effects -- read-only system check.",
    inputSchema: {
      type: "object",
      properties: {
        cli_tools: {
          type: "array",
          items: { type: "string", minLength: 1 },
          default: ["codex"],
          minItems: 1,
          maxItems: 20,
          description: "CLI tools to validate (e.g., ['codex', 'claude', 'git', 'aws'])",
        },
        validate_api_keys: {
          type: "boolean",
          default: true,
          description: "Also validate API key health for tools that require authentication",
        },
      },
      required: [],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },

  // =========================================================================
  // PLATFORM (2 tools)
  // =========================================================================
  {
    name: "s2t_catalog",
    title: "List Accelerators",
    description:
      "List all available S2T accelerators with their capabilities, pricing tiers, and current usage information. Use to discover available tools, check tier access, or review pricing. Returns the full accelerator catalog with metadata. No side effects -- read-only query.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "s2t_usage",
    title: "Get API Usage",
    description:
      "Get your current API usage statistics and remaining quota for the billing period. Use to monitor consumption, check rate limits, or verify tier status. Returns requests made, tokens used, remaining quota, and current tier. No side effects -- read-only query.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },

  // =========================================================================
  // AGENT ORCHESTRATION (7 tools)
  // =========================================================================
  {
    name: "s2t_classify_action_risk",
    title: "Classify Action Risk",
    description:
      "Classify an action's risk level as LOW, MEDIUM, HIGH, or CRITICAL based on blast radius, reversibility, and target environment. Use for AI agent safety guardrails and graduated autonomy decisions. Returns risk classification with scoring breakdown. No side effects -- read-only classification.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          minLength: 1,
          maxLength: 2000,
          description: "The action or command to classify (e.g., 'rm -rf /tmp', 'aws s3 sync', 'DROP TABLE users')",
        },
        environment: {
          type: "string",
          enum: ["local", "development", "staging", "production"],
          default: "local",
          description: "Target environment where the action will execute",
        },
        context: {
          type: "string",
          default: "development",
          maxLength: 2000,
          description: "Additional context about the action purpose or surrounding workflow",
        },
      },
      required: ["action"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "s2t_route_task_to_agent",
    title: "Route Task to Agent",
    description:
      "Route a task to the optimal AI agent using semantic similarity matching against 54 specialized agent domains. Use when delegating work across a multi-agent system. Returns ranked agent candidates with confidence scores and capability summaries. No side effects -- read-only routing decision.",
    inputSchema: {
      type: "object",
      properties: {
        task_description: {
          type: "string",
          minLength: 5,
          maxLength: 5000,
          description: "Natural language description of the task to route to an agent",
        },
        top_k: {
          type: "integer",
          default: 5,
          minimum: 1,
          maximum: 20,
          description: "Number of candidate agents to return, ranked by match score",
        },
        include_capabilities: {
          type: "boolean",
          default: true,
          description: "Include detailed capability descriptions for each candidate agent",
        },
      },
      required: ["task_description"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "s2t_predict_system_issues",
    title: "Predict System Issues",
    description:
      "Predict upcoming system issues by analyzing budget trends, error rates, dependency health, and certificate expiry. Use for proactive operations monitoring. Returns prioritized predictions with severity, projected impact dates, and recommended preventive actions. No side effects -- read-only analysis.",
    inputSchema: {
      type: "object",
      properties: {
        system_state: {
          type: "object",
          description: "Current system state with budget, error counts, dependency versions, certificate dates",
          additionalProperties: true,
        },
        analysis_window_days: {
          type: "integer",
          default: 30,
          minimum: 7,
          maximum: 90,
          description: "Number of days to project into the future",
        },
      },
      required: [],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "s2t_attempt_auto_recovery",
    title: "Auto-Recovery Lookup",
    description:
      "Match an error against known patterns and suggest automated recovery steps. Use when handling errors programmatically or building self-healing systems. Returns matched patterns with historical success rates and step-by-step recovery instructions. Side effects only when auto_execute=true (disabled by default).",
    inputSchema: {
      type: "object",
      properties: {
        error_message: {
          type: "string",
          minLength: 1,
          maxLength: 5000,
          description: "The error message to analyze and match against known patterns",
        },
        error_source: {
          type: "string",
          maxLength: 500,
          description: "Source service or function that generated the error",
        },
        stack_trace: {
          type: "string",
          maxLength: 10000,
          description: "Stack trace for deeper root-cause analysis",
        },
        auto_execute: {
          type: "boolean",
          default: false,
          description: "Auto-execute the recovery steps (requires elevated permissions; default: false for safety)",
        },
      },
      required: ["error_message"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: "s2t_execute_with_resilience",
    title: "Configure Resilience Pattern",
    description:
      "Configure resilience patterns (retry with exponential backoff, circuit breaker) for an operation. Use when protecting critical operations against transient failures. Returns execution configuration with retry metrics and circuit breaker state. Records resilience configuration as a side effect.",
    inputSchema: {
      type: "object",
      properties: {
        operation_id: {
          type: "string",
          minLength: 1,
          maxLength: 200,
          description: "Unique identifier for the operation to protect with resilience patterns",
        },
        max_retries: {
          type: "integer",
          default: 3,
          minimum: 1,
          maximum: 10,
          description: "Maximum number of retry attempts before giving up",
        },
        base_delay_ms: {
          type: "integer",
          default: 1000,
          minimum: 100,
          maximum: 30000,
          description: "Base delay between retries in milliseconds (doubles with exponential backoff)",
        },
        circuit_breaker_threshold: {
          type: "integer",
          default: 5,
          minimum: 1,
          maximum: 50,
          description: "Number of consecutive failures before the circuit breaker opens",
        },
      },
      required: ["operation_id"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "s2t_manage_agent_memory",
    title: "Manage Agent Memory",
    description:
      "Store, retrieve, search, or delete persistent agent memory with namespace isolation. Use for maintaining agent state across sessions, caching intermediate results, or sharing context between agents. Side effects depend on operation: store/delete modify state; retrieve/search are read-only.",
    inputSchema: {
      type: "object",
      properties: {
        operation: {
          type: "string",
          enum: ["store", "retrieve", "search", "delete"],
          description: "Memory operation: store (write), retrieve (read), search (query), delete (remove)",
        },
        agent_id: {
          type: "string",
          minLength: 1,
          maxLength: 200,
          description: "Agent identifier for memory namespace isolation",
        },
        key: {
          type: "string",
          minLength: 1,
          maxLength: 500,
          description: "Memory key (required for store, retrieve, and delete operations)",
        },
        value: {
          type: ["string", "object", "array", "number", "boolean"],
          description: "Value to store (required for store operation; accepts any JSON type)",
        },
        namespace: {
          type: "string",
          default: "default",
          maxLength: 200,
          description: "Memory namespace for additional isolation between workflows",
        },
        search_query: {
          type: "string",
          maxLength: 1000,
          description: "Search query text (required for search operation)",
        },
      },
      required: ["operation", "agent_id"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: "s2t_submit_agent_task",
    title: "Submit Agent Task",
    description:
      "Submit a task to the SQS FIFO queue for asynchronous multi-agent execution. Use when delegating work to background agents or building agent pipelines. Returns task ID and queue position for tracking. Side effect: enqueues a message to SQS.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: {
          type: "string",
          minLength: 1,
          maxLength: 200,
          description: "Target agent ID from the agent registry",
        },
        prompt: {
          type: "string",
          minLength: 1,
          maxLength: 10000,
          description: "Task prompt for the agent to execute",
        },
        priority: {
          type: "string",
          enum: ["low", "normal", "high", "critical"],
          default: "normal",
          description: "Task priority level (affects queue ordering)",
        },
        trace_id: {
          type: "string",
          maxLength: 200,
          description: "W3C traceparent header for distributed tracing correlation",
        },
      },
      required: ["agent_id", "prompt"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },

  // =========================================================================
  // DISTRIBUTED SYSTEMS (2 tools)
  // =========================================================================
  {
    name: "s2t_create_trace_context",
    title: "Create Trace Context",
    description:
      "Generate W3C Trace Context identifiers (traceparent + tracestate) for distributed tracing across multi-agent workflows. Use when starting new traces or creating child spans within existing traces. Returns W3C-compliant trace headers. No side effects -- generates identifiers only.",
    inputSchema: {
      type: "object",
      properties: {
        parent_traceparent: {
          type: "string",
          maxLength: 200,
          description: "Parent traceparent header to create a child span from (omit to start a new trace)",
        },
        service_name: {
          type: "string",
          default: "s2t-agent",
          minLength: 1,
          maxLength: 200,
          description: "Service name to record in the trace span",
        },
      },
      required: [],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "s2t_acquire_file_lock",
    title: "File Lock Manager",
    description:
      "Acquire, release, or check file-based mutex locks with stale lock detection. Use to prevent concurrent file access conflicts in multi-agent environments. Side effects: acquire creates a lock file; release removes it; check is read-only.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          minLength: 1,
          maxLength: 1000,
          description: "Absolute or relative path to the file to lock",
        },
        operation: {
          type: "string",
          enum: ["acquire", "release", "check"],
          default: "acquire",
          description: "Lock operation: acquire (create lock), release (remove lock), check (read lock status)",
        },
        lock_token: {
          type: "string",
          maxLength: 200,
          description: "Lock token returned from acquire (required for release operation)",
        },
        timeout_ms: {
          type: "integer",
          default: 5000,
          minimum: 100,
          maximum: 60000,
          description: "Maximum wait time for lock acquisition in milliseconds",
        },
      },
      required: ["file_path"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },

  // =========================================================================
  // ACI GOVERNANCE TOOLS (12 tools)
  // =========================================================================
  {
    name: "aci_classify_decision",
    title: "Classify Agent Decision",
    description:
      "Classify an AI agent action as APPROVE, ESCALATE, or BLOCK using rule-based analysis, domain scoring, and optional LLM evaluation. Use before any agent action that could affect production systems, finances, or compliance -- this is the primary governance gate. Records an immutable audit entry as a side effect. Returns classification with confidence score and reasoning.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          minLength: 1,
          maxLength: 5000,
          description: "The action to classify (e.g., 'aws s3 rm s3://prod-bucket --recursive')",
        },
        environment: {
          type: "string",
          enum: ["local", "development", "staging", "production"],
          default: "development",
          description: "Target environment where the action will execute",
        },
        context: {
          type: "object",
          description: "Additional context for classification",
          properties: {
            source_agent: { type: "string", minLength: 1, maxLength: 200, description: "ID of the agent requesting the action" },
            domain: { type: "string", enum: ["security", "financial", "legal", "ops", "compliance", "data"], description: "Governance domain" },
            metadata: { type: "object", description: "Arbitrary metadata for audit trail" },
          },
          additionalProperties: false,
        },
        org_config: {
          type: "object",
          description: "Organization-level governance overrides",
          properties: {
            risk_tolerance: { type: "string", enum: ["conservative", "moderate", "aggressive"], description: "Organization risk tolerance" },
            require_human_approval_above: { type: "number", minimum: 0, maximum: 1, description: "Confidence threshold above which human approval is required" },
          },
          additionalProperties: false,
        },
      },
      required: ["action"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: "aci_financial_gate",
    title: "Financial Impact Gate",
    description:
      "Estimate the financial impact of an action and determine if it passes budget gates. Use before any action with cost implications (provisioning resources, purchasing services, scaling infrastructure). Returns cost breakdown, budget impact analysis, and APPROVE/ESCALATE/BLOCK decision. Records audit entry as side effect.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          minLength: 1,
          maxLength: 5000,
          description: "The action to evaluate for financial impact",
        },
        duration_hours: {
          type: "number",
          minimum: 0,
          maximum: 8760,
          description: "Expected duration in hours for recurring cost estimation",
        },
        context: {
          type: "object",
          description: "Financial context for budget gate evaluation",
          properties: {
            current_monthly_spend: { type: "number", minimum: 0, description: "Current monthly spend in USD" },
            budget_remaining: { type: "number", minimum: 0, maximum: 100000000, description: "Budget remaining for the period in USD" },
            cost_center: { type: "string", minLength: 1, maxLength: 100, description: "Cost center code for allocation" },
          },
          additionalProperties: false,
        },
      },
      required: ["action"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: "aci_compliance_check",
    title: "Compliance Framework Check",
    description:
      "Evaluate an action against compliance frameworks (SOC2, GDPR, HIPAA, PCI-DSS). Use before actions that handle sensitive data or affect auditable systems. Returns framework-specific violations, warnings, and remediation steps. No side effects beyond audit logging.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          minLength: 1,
          maxLength: 5000,
          description: "The action to evaluate for compliance",
        },
        frameworks: {
          type: "array",
          items: { type: "string", enum: ["soc2", "gdpr", "hipaa", "pci-dss"] },
          minItems: 1,
          description: "Compliance frameworks to check the action against",
        },
        data_classification: {
          type: "string",
          enum: ["public", "internal", "confidential", "PII", "PHI", "PCI"],
          description: "Data classification level that the action touches",
        },
        context: {
          type: "object",
          description: "Additional compliance context (data residency, retention, etc.)",
          additionalProperties: true,
        },
      },
      required: ["action"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "aci_route_domain",
    title: "Route to Domain Expert",
    description:
      "Route a governance task to the appropriate domain expert agent(s) with sensitivity tagging. Extends s2t_route_task_to_agent with governance awareness and parallel review recommendations. Use when a governance decision needs domain-specific expertise. Returns routing recommendations. No side effects.",
    inputSchema: {
      type: "object",
      properties: {
        task_description: {
          type: "string",
          minLength: 5,
          maxLength: 5000,
          description: "Description of the governance task to route",
        },
        governance_context: {
          type: "object",
          description: "Governance-specific routing context",
          properties: {
            requires_approval: { type: "boolean", description: "Whether the task requires human approval" },
            sensitivity_level: { type: "string", enum: ["low", "medium", "high", "critical"], description: "Data/action sensitivity level" },
          },
          additionalProperties: false,
        },
      },
      required: ["task_description"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "aci_parallel_review",
    title: "Initiate Parallel Review",
    description:
      "Initiate parallel governance review across multiple domain agents (security, financial, legal, ops, compliance, data). Dispatches review tasks via SQS FIFO queue. Use for high-impact decisions that need multi-domain sign-off. Returns a session ID for tracking. Use aci_synthesize_reviews to collect and unify results. Side effect: enqueues review tasks.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          minLength: 1,
          maxLength: 5000,
          description: "The action under governance review",
        },
        reviewers: {
          type: "array",
          items: { type: "string", enum: ["security", "financial", "legal", "ops", "compliance", "data"] },
          minItems: 1,
          maxItems: 6,
          description: "Domain expert reviewers to dispatch",
        },
        timeout_seconds: {
          type: "number",
          default: 300,
          minimum: 60,
          maximum: 600,
          description: "Maximum wait time for all reviews to complete",
        },
        require_unanimity: {
          type: "boolean",
          default: false,
          description: "Require all reviewers to APPROVE (otherwise uses minimum_approvals threshold)",
        },
        minimum_approvals: {
          type: "number",
          default: 2,
          minimum: 1,
          maximum: 6,
          description: "Minimum number of APPROVE votes needed for overall approval",
        },
      },
      required: ["action", "reviewers"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: "aci_synthesize_reviews",
    title: "Synthesize Review Results",
    description:
      "Collect and synthesize results from a parallel governance review session. Produces a unified APPROVE/ESCALATE/BLOCK decision from individual reviewer assessments. Use after aci_parallel_review to aggregate domain expert opinions. Returns unified decision with confidence and dissent analysis.",
    inputSchema: {
      type: "object",
      properties: {
        review_session_id: {
          type: "string",
          minLength: 1,
          description: "Session ID returned by aci_parallel_review",
        },
        reviews: {
          type: "array",
          items: {
            type: "object",
            properties: {
              domain: { type: "string", minLength: 1, description: "Reviewer domain (security, financial, etc.)" },
              classification: { type: "string", enum: ["APPROVE", "ESCALATE", "BLOCK"], description: "Reviewer's decision" },
              confidence: { type: "number", minimum: 0, maximum: 1, description: "Confidence score (0.0-1.0)" },
              reasoning: { type: "string", minLength: 1, description: "Explanation for the decision" },
            },
            required: ["domain", "classification", "confidence", "reasoning"],
            additionalProperties: false,
          },
          minItems: 1,
          description: "Individual reviewer assessments to synthesize",
        },
      },
      required: ["review_session_id", "reviews"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "aci_log_decision",
    title: "Log Governance Decision",
    description:
      "Explicitly record a governance decision in the append-only audit log. Use when decisions are made outside the classify pipeline (e.g., manual human approvals, out-of-band escalations). Returns decision ID and timestamp. Side effect: writes to immutable audit log.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          minLength: 1,
          maxLength: 5000,
          description: "The action that was decided upon",
        },
        classification: {
          type: "string",
          enum: ["APPROVE", "ESCALATE", "BLOCK"],
          description: "The governance decision",
        },
        confidence: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description: "Confidence score for the decision (0.0-1.0)",
        },
        reasoning: {
          type: "string",
          minLength: 1,
          maxLength: 5000,
          description: "Explanation for the decision (required for audit trail)",
        },
        approved_by: {
          type: "string",
          maxLength: 500,
          description: "Who approved: 'human:email@example.com' or 'auto:rule_id'",
        },
        context: {
          type: "object",
          description: "Additional context to attach to the audit record",
          additionalProperties: true,
        },
      },
      required: ["action", "classification", "reasoning"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: "aci_recall_precedent",
    title: "Search Decision Precedents",
    description:
      "Semantic search over past governance decisions to find similar precedents. Use when making governance decisions to check how similar actions were classified historically. Returns top-K precedents with similarity scores and outcomes. No side effects -- read-only search.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          minLength: 3,
          maxLength: 2000,
          description: "Natural language description of the action to search for precedents",
        },
        filters: {
          type: "object",
          description: "Optional filters to narrow precedent search",
          properties: {
            classification: { type: "string", enum: ["APPROVE", "ESCALATE", "BLOCK"], description: "Filter by past classification" },
            domain: { type: "string", minLength: 1, maxLength: 100, description: "Filter by governance domain" },
            time_range: {
              type: "object",
              properties: {
                start: { type: "string", minLength: 1, maxLength: 50, description: "ISO 8601 start date" },
                end: { type: "string", minLength: 1, maxLength: 50, description: "ISO 8601 end date" },
              },
              additionalProperties: false,
            },
          },
          additionalProperties: false,
        },
        top_k: {
          type: "number",
          default: 5,
          minimum: 1,
          maximum: 20,
          description: "Number of precedents to return, ranked by similarity",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "aci_record_outcome",
    title: "Record Decision Outcome",
    description:
      "Record the actual outcome of a previously classified governance decision. Feeds the calibration loop to improve future classification accuracy. Use after an approved action completes (or fails) to close the feedback loop. Side effect: updates the decision record in the audit log.",
    inputSchema: {
      type: "object",
      properties: {
        decision_id: {
          type: "string",
          minLength: 1,
          maxLength: 200,
          description: "The decision ID (from aci_classify_decision or aci_log_decision) to record outcome for",
        },
        outcome: {
          type: "string",
          enum: ["SUCCESS", "FAILURE", "REVERTED", "PARTIAL"],
          description: "Actual outcome of the action",
        },
        outcome_details: {
          type: "string",
          maxLength: 5000,
          description: "Details about what happened (error messages, metrics, etc.)",
        },
      },
      required: ["decision_id", "outcome"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "aci_estimate_blast_radius",
    title: "Estimate Blast Radius",
    description:
      "Estimate the blast radius of a proposed action -- affected systems, users, data records, cascade depth, and recovery time. Use before approving high-risk actions to understand potential impact. Returns quantitative impact metrics and affected dependency graph. No side effects -- read-only analysis.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          minLength: 1,
          maxLength: 5000,
          description: "The action to analyze for blast radius",
        },
        environment: {
          type: "string",
          enum: ["local", "development", "staging", "production"],
          default: "development",
          description: "Target environment (production amplifies blast radius)",
        },
        context: {
          type: "object",
          description: "Infrastructure context for more accurate estimation",
          properties: {
            dependent_services: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 100, description: "Services that depend on the affected resource" },
            downstream_consumers: { type: "number", minimum: 0, description: "Number of downstream consumers" },
            data_volume: { type: "string", minLength: 1, maxLength: 200, description: "Estimated data volume affected (e.g., '50GB', '1M records')" },
          },
          additionalProperties: false,
        },
      },
      required: ["action"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "aci_generate_rollback",
    title: "Generate Rollback Plan",
    description:
      "Generate a step-by-step rollback plan for a proposed action. Includes commands, expected durations, prerequisites, and warnings. Use before approving high-risk operations to ensure reversibility. Returns structured rollback plan. No side effects -- generates plan document only.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          minLength: 1,
          maxLength: 5000,
          description: "The action to generate a rollback plan for",
        },
        environment: {
          type: "string",
          enum: ["local", "development", "staging", "production"],
          default: "development",
          description: "Target environment for environment-specific rollback steps",
        },
        context: {
          type: "object",
          description: "State context for accurate rollback planning",
          properties: {
            current_state: { type: "string", minLength: 1, maxLength: 5000, description: "Description of current state before action" },
            target_state: { type: "string", minLength: 1, maxLength: 5000, description: "Description of intended state after action" },
          },
          additionalProperties: false,
        },
      },
      required: ["action"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "aci_governance_health",
    title: "Governance Health Metrics",
    description:
      "Get aggregate governance health metrics for the organization. Use for governance dashboards, compliance reporting, and calibration monitoring. Returns classification distribution, calibration accuracy, false positive/negative rates, and overall health score. No side effects -- read-only metrics query.",
    inputSchema: {
      type: "object",
      properties: {
        time_range: {
          type: "string",
          enum: ["7d", "30d", "90d", "365d"],
          default: "30d",
          description: "Time range for aggregated metrics",
        },
        domain: {
          type: "string",
          enum: ["security", "financial", "legal", "ops", "compliance", "data"],
          description: "Filter metrics to a specific governance domain",
        },
      },
      required: [],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },

  // =========================================================================
  // LOCAL TOOLS (powered by @s2t/core - no API key required)
  // =========================================================================
  {
    name: "s2t_interview_create",
    title: "Create Interview Session",
    description:
      "Create a stakeholder interview session for S2T process discovery. Returns a session token for conducting the interview via s2t_interview_message. Use when beginning a new stakeholder engagement or process assessment. Local tool -- no API key charges, runs entirely on the client. Side effect: creates an in-memory session (expires after 24 hours).",
    inputSchema: {
      type: "object",
      properties: {
        customer_name: {
          type: "string",
          minLength: 1,
          maxLength: 200,
          description: "Name of the customer organization",
        },
        stakeholder_name: {
          type: "string",
          minLength: 1,
          maxLength: 200,
          description: "Name of the stakeholder being interviewed",
        },
        stakeholder_title: {
          type: "string",
          maxLength: 200,
          description: "Job title of the stakeholder (e.g., 'VP of Operations')",
        },
        stakeholder_email: {
          type: "string",
          maxLength: 254,
          description: "Email address of the stakeholder",
        },
        process_area: {
          type: "string",
          maxLength: 200,
          description: "Business process area to focus on (e.g., 'finance', 'hr', 'operations', 'supply chain')",
        },
      },
      required: ["customer_name", "stakeholder_name"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: "s2t_interview_message",
    title: "Send Interview Message",
    description:
      "Send a message in an active interview session and receive the next adaptive question. Use to conduct stakeholder interviews step by step. Returns the AI-generated follow-up question and session progress. Local tool -- no API key charges.",
    inputSchema: {
      type: "object",
      properties: {
        token: {
          type: "string",
          minLength: 1,
          maxLength: 500,
          description: "Interview session token from s2t_interview_create",
        },
        message: {
          type: "string",
          minLength: 1,
          maxLength: 10000,
          description: "The stakeholder's response or message",
        },
      },
      required: ["token", "message"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: "s2t_interview_summary",
    title: "Generate Interview Summary",
    description:
      "Generate an AI summary from an interview session's transcript. Includes key findings, pain points, time/cost estimates, and prioritized recommendations. Use after completing an interview to produce a structured deliverable. Local tool -- no API key charges. No side effects beyond reading the session.",
    inputSchema: {
      type: "object",
      properties: {
        token: {
          type: "string",
          minLength: 1,
          maxLength: 500,
          description: "Interview session token from s2t_interview_create",
        },
      },
      required: ["token"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "s2t_interview_list",
    title: "List Interview Sessions",
    description:
      "List all interview sessions with optional status filter. Use to find active, completed, or expired sessions. Returns session metadata including customer name, stakeholder, and creation time. Local tool -- no API key charges. No side effects -- read-only query.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["active", "completed", "expired"],
          description: "Filter sessions by status: active (in-progress), completed (summary generated), expired (>24h inactive)",
        },
      },
      required: [],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
];

// ---------------------------------------------------------------------------
// API client factory
// ---------------------------------------------------------------------------

export function createApiClient(baseUrl: string, apiKey: string): ApiClient {
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

// ---------------------------------------------------------------------------
// Server factory
// ---------------------------------------------------------------------------

/**
 * Create a fully configured MCP Server instance with all S2T tools and
 * handlers registered. The returned server is transport-agnostic -- callers
 * connect it to whichever transport they need (stdio, HTTP, etc.).
 */
export function createMcpServer(apiClient: ApiClient): Server {
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } }
  );

  // -- List tools ----------------------------------------------------------
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  // -- Call tool -----------------------------------------------------------
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result: string;

      switch (name) {
        case "s2t_embed":
          result = await handleEmbed(
            args as Record<string, unknown>,
            apiClient
          );
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
        case "s2t_validate_iam_policy":
          result = await handleIamPolicyValidate(
            args as Record<string, unknown>,
            apiClient
          );
          break;
        case "s2t_validate_mfa_compliance":
          result = await handleMfaCompliance(
            args as Record<string, unknown>,
            apiClient
          );
          break;
        case "s2t_generate_dynamodb_design":
          result = await handleDynamoDbDesign(
            args as Record<string, unknown>,
            apiClient
          );
          break;
        case "s2t_analyze_error_patterns":
          result = await handleErrorPatterns(
            args as Record<string, unknown>,
            apiClient
          );
          break;
        case "s2t_check_data_lake_readiness":
          result = await handleDataLakeReadiness(
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
        case "s2t_classify_action_risk":
          result = await handleRiskClassify(
            args as Record<string, unknown>,
            apiClient
          );
          break;
        case "s2t_route_task_to_agent":
          result = await handleTaskRouting(
            args as Record<string, unknown>,
            apiClient
          );
          break;
        case "s2t_predict_system_issues":
          result = await handlePredictIssues(
            args as Record<string, unknown>,
            apiClient
          );
          break;
        case "s2t_attempt_auto_recovery":
          result = await handleAutoRecovery(
            args as Record<string, unknown>,
            apiClient
          );
          break;
        case "s2t_execute_with_resilience":
          result = await handleResilienceExecute(
            args as Record<string, unknown>,
            apiClient
          );
          break;
        case "s2t_manage_agent_memory":
          result = await handleAgentMemory(
            args as Record<string, unknown>,
            apiClient
          );
          break;
        case "s2t_submit_agent_task":
          result = await handleAgentTask(
            args as Record<string, unknown>,
            apiClient
          );
          break;
        case "s2t_create_trace_context":
          result = await handleTraceContext(
            args as Record<string, unknown>,
            apiClient
          );
          break;
        case "s2t_acquire_file_lock":
          result = await handleFileLock(
            args as Record<string, unknown>,
            apiClient
          );
          break;
        case "s2t_validate_cli_readiness":
          result = await handleCliReadiness(
            args as Record<string, unknown>,
            apiClient
          );
          break;

        // ACI Governance Tools
        case "aci_classify_decision":
          result = await handleAciClassify(
            args as Record<string, unknown>,
            apiClient
          );
          break;
        case "aci_financial_gate":
          result = await handleAciFinancialGate(
            args as Record<string, unknown>,
            apiClient
          );
          break;
        case "aci_compliance_check":
          result = await handleAciComplianceCheck(
            args as Record<string, unknown>,
            apiClient
          );
          break;
        case "aci_route_domain":
          result = await handleAciRouteDomain(
            args as Record<string, unknown>,
            apiClient
          );
          break;
        case "aci_parallel_review":
          result = await handleAciParallelReview(
            args as Record<string, unknown>,
            apiClient
          );
          break;
        case "aci_synthesize_reviews":
          result = await handleAciSynthesizeReviews(
            args as Record<string, unknown>,
            apiClient
          );
          break;
        case "aci_log_decision":
          result = await handleAciLogDecision(
            args as Record<string, unknown>,
            apiClient
          );
          break;
        case "aci_recall_precedent":
          result = await handleAciRecallPrecedent(
            args as Record<string, unknown>,
            apiClient
          );
          break;
        case "aci_record_outcome":
          result = await handleAciRecordOutcome(
            args as Record<string, unknown>,
            apiClient
          );
          break;
        case "aci_estimate_blast_radius":
          result = await handleAciBlastRadius(
            args as Record<string, unknown>,
            apiClient
          );
          break;
        case "aci_generate_rollback":
          result = await handleAciRollback(
            args as Record<string, unknown>,
            apiClient
          );
          break;
        case "aci_governance_health":
          result = await handleAciGovernanceHealth(
            args as Record<string, unknown>,
            apiClient
          );
          break;

        // Local tools (powered by @s2t/core)
        case "s2t_interview_create":
          result = await handleInterviewCreate(
            args as Record<string, unknown>
          );
          break;
        case "s2t_interview_message":
          result = await handleInterviewMessage(
            args as Record<string, unknown>
          );
          break;
        case "s2t_interview_summary":
          result = await handleInterviewSummary(
            args as Record<string, unknown>
          );
          break;
        case "s2t_interview_list":
          result = await handleInterviewList(
            args as Record<string, unknown>
          );
          break;
        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        content: [{ type: "text", text: result }],
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Error: ${errorMessage}` }],
        isError: true,
      };
    }
  });

  return server;
}
