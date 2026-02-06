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
    name: "s2t_validate_iam_policy",
    description:
      "Validate IAM policies for security best practices. Detects overly permissive permissions, dangerous actions, and suggests least-privilege alternatives. Returns a security score (0-100) and detailed findings.",
    inputSchema: {
      type: "object",
      properties: {
        policy_document: {
          type: ["string", "object"],
          description:
            "The IAM policy document to validate (JSON string or object)",
        },
        resource_type: {
          type: "string",
          enum: ["s3", "dynamodb", "lambda", "sns", "sqs", "iam", "general"],
          default: "general",
          description: "Optional: Focus validation on specific resource type",
        },
        suggest_improvements: {
          type: "boolean",
          default: true,
          description: "Include scoped permission alternatives in response",
        },
      },
      required: ["policy_document"],
    },
  },
  {
    name: "s2t_validate_mfa_compliance",
    description:
      "Validate IAM users and roles for MFA compliance. Checks console access, programmatic access, root account, and policy conditions. Returns compliance score and remediation recommendations.",
    inputSchema: {
      type: "object",
      properties: {
        users: {
          type: "array",
          items: {
            type: "object",
            properties: {
              username: { type: "string" },
              has_console_access: { type: "boolean" },
              has_access_keys: { type: "boolean" },
              mfa_enabled: { type: "boolean" },
              mfa_type: { type: "string", enum: ["virtual", "hardware"] },
              is_privileged: { type: "boolean" },
              is_admin: { type: "boolean" },
            },
          },
          description: "List of IAM users to check",
        },
        root_account: {
          type: "object",
          properties: {
            mfa_enabled: { type: "boolean" },
            mfa_type: { type: "string", enum: ["virtual", "hardware"] },
          },
          description: "Root account MFA configuration",
        },
        policies: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              document: { type: ["string", "object"] },
            },
          },
          description: "Policies to check for MFA conditions",
        },
      },
      required: [],
    },
  },
  {
    name: "s2t_generate_dynamodb_design",
    description:
      "Generate optimal DynamoDB single-table designs from entity and access pattern descriptions. Returns key schema, GSI recommendations, entity mappings, and CloudFormation template.",
    inputSchema: {
      type: "object",
      properties: {
        entities: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Entity name (e.g., User, Order)" },
              description: { type: "string", description: "What this entity represents" },
              attributes: {
                type: "array",
                items: { type: "string" },
                description: "Key attributes of the entity",
              },
            },
            required: ["name"],
          },
          description: "Entities to model in the table",
        },
        access_patterns: {
          type: "array",
          items: { type: "string" },
          description: "Access patterns to support (e.g., 'Get user by ID', 'List orders by user')",
        },
        options: {
          type: "object",
          properties: {
            table_name: { type: "string", description: "Desired table name" },
            billing_mode: { type: "string", enum: ["PAY_PER_REQUEST", "PROVISIONED"] },
          },
        },
      },
      required: ["entities", "access_patterns"],
    },
  },
  {
    name: "s2t_analyze_error_patterns",
    description:
      "Analyze application error logs to identify patterns, root causes, and trends. Categorizes errors by type and severity, suggests remediation actions.",
    inputSchema: {
      type: "object",
      properties: {
        errors: {
          type: "array",
          items: {
            type: "object",
            properties: {
              message: { type: "string", description: "Error message" },
              timestamp: { type: "string", description: "ISO timestamp" },
              source: { type: "string", description: "Source service/function" },
              stack_trace: { type: "string", description: "Optional stack trace" },
            },
            required: ["message"],
          },
          description: "Array of error objects to analyze (max 1000)",
        },
        include_ai_analysis: {
          type: "boolean",
          default: true,
          description: "Include AI-powered deep analysis",
        },
      },
      required: ["errors"],
    },
  },
  {
    name: "s2t_check_data_lake_readiness",
    description:
      "Assess data lake architecture readiness for production. Evaluates storage, catalog, security, performance, and operations. Returns readiness score and recommendations.",
    inputSchema: {
      type: "object",
      properties: {
        storage: {
          type: "object",
          description: "S3 storage configuration (s3_001 through s3_005 booleans)",
        },
        catalog: {
          type: "object",
          description: "Glue catalog configuration (cat_001 through cat_004 booleans)",
        },
        security: {
          type: "object",
          description: "Security configuration (sec_001 through sec_005 booleans)",
        },
        performance: {
          type: "object",
          description: "Performance configuration (perf_001 through perf_004 booleans)",
        },
        operations: {
          type: "object",
          description: "Operations configuration (ops_001 through ops_004 booleans)",
        },
      },
      required: [],
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
  {
    name: "s2t_classify_action_risk",
    description:
      "Classify an action's risk level (LOW/MEDIUM/HIGH/CRITICAL) based on blast radius, reversibility, and environment. Use for AI agent safety guardrails and graduated autonomy.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          description: "The action or command to classify (e.g., 'rm -rf /tmp', 'aws s3 sync')",
        },
        environment: {
          type: "string",
          enum: ["local", "development", "staging", "production"],
          default: "local",
          description: "Target environment for the action",
        },
        context: {
          type: "string",
          default: "development",
          description: "Additional context about the action purpose",
        },
      },
      required: ["action"],
    },
  },
  {
    name: "s2t_route_task_to_agent",
    description:
      "Route a task to the optimal AI agent using semantic similarity matching against 54 specialized agent domains. Returns ranked candidates with confidence scores.",
    inputSchema: {
      type: "object",
      properties: {
        task_description: {
          type: "string",
          description: "Natural language description of the task to route",
        },
        top_k: {
          type: "integer",
          default: 5,
          description: "Number of candidate agents to return (1-20)",
        },
        include_capabilities: {
          type: "boolean",
          default: true,
          description: "Include agent capability details in response",
        },
      },
      required: ["task_description"],
    },
  },
  {
    name: "s2t_predict_system_issues",
    description:
      "Predict upcoming system issues by analyzing budget trends, error rates, dependency health, and certificate expiry. Returns prioritized predictions with recommended actions.",
    inputSchema: {
      type: "object",
      properties: {
        system_state: {
          type: "object",
          description: "Current system state including budget, error counts, dependency versions",
        },
        analysis_window_days: {
          type: "integer",
          default: 30,
          description: "Number of days to project into the future (7-90)",
        },
      },
      required: [],
    },
  },
  {
    name: "s2t_attempt_auto_recovery",
    description:
      "Match an error against known patterns and suggest automated recovery steps. Includes historical success rates and confidence scores for each recovery strategy.",
    inputSchema: {
      type: "object",
      properties: {
        error_message: {
          type: "string",
          description: "The error message to analyze",
        },
        error_source: {
          type: "string",
          description: "Source service or function that generated the error",
        },
        stack_trace: {
          type: "string",
          description: "Optional stack trace for deeper analysis",
        },
        auto_execute: {
          type: "boolean",
          default: false,
          description: "Whether to auto-execute recovery (requires elevated permissions)",
        },
      },
      required: ["error_message"],
    },
  },
  {
    name: "s2t_execute_with_resilience",
    description:
      "Configure resilience patterns (retry with exponential backoff, circuit breaker) for an operation. Returns execution metrics and circuit breaker state.",
    inputSchema: {
      type: "object",
      properties: {
        operation_id: {
          type: "string",
          description: "Unique identifier for the operation to protect",
        },
        max_retries: {
          type: "integer",
          default: 3,
          description: "Maximum retry attempts (1-10)",
        },
        base_delay_ms: {
          type: "integer",
          default: 1000,
          description: "Base delay between retries in milliseconds (100-30000)",
        },
        circuit_breaker_threshold: {
          type: "integer",
          default: 5,
          description: "Number of failures before circuit opens (1-50)",
        },
      },
      required: ["operation_id"],
    },
  },
  {
    name: "s2t_manage_agent_memory",
    description:
      "Store, retrieve, search, or delete persistent agent memory with namespace isolation. Use for maintaining agent state across sessions.",
    inputSchema: {
      type: "object",
      properties: {
        operation: {
          type: "string",
          enum: ["store", "retrieve", "search", "delete"],
          description: "Memory operation to perform",
        },
        agent_id: {
          type: "string",
          description: "The agent ID for memory isolation",
        },
        key: {
          type: "string",
          description: "Memory key (required for store/retrieve/delete)",
        },
        value: {
          type: ["string", "object", "array", "number", "boolean"],
          description: "Value to store (required for store operation)",
        },
        namespace: {
          type: "string",
          default: "default",
          description: "Memory namespace for additional isolation",
        },
        search_query: {
          type: "string",
          description: "Search query (required for search operation)",
        },
      },
      required: ["operation", "agent_id"],
    },
  },
  {
    name: "s2t_submit_agent_task",
    description:
      "Submit a task to the SQS FIFO queue for asynchronous multi-agent execution. Returns task ID and queue position for tracking.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: {
          type: "string",
          description: "Target agent ID from the agent registry",
        },
        prompt: {
          type: "string",
          description: "Task prompt for the agent to execute",
        },
        priority: {
          type: "string",
          enum: ["low", "normal", "high", "critical"],
          default: "normal",
          description: "Task priority level",
        },
        trace_id: {
          type: "string",
          description: "Optional W3C trace ID for distributed tracing",
        },
      },
      required: ["agent_id", "prompt"],
    },
  },
  {
    name: "s2t_create_trace_context",
    description:
      "Generate W3C Trace Context identifiers for distributed tracing across multi-agent workflows. Supports parent-child span relationships.",
    inputSchema: {
      type: "object",
      properties: {
        parent_traceparent: {
          type: "string",
          description: "Parent traceparent header to create child span from",
        },
        service_name: {
          type: "string",
          default: "s2t-agent",
          description: "Service name for the trace",
        },
      },
      required: [],
    },
  },
  {
    name: "s2t_acquire_file_lock",
    description:
      "Acquire or release file-based mutex locks with stale lock detection. Prevents concurrent file access conflicts in multi-agent environments.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Path to the file to lock",
        },
        operation: {
          type: "string",
          enum: ["acquire", "release", "check"],
          default: "acquire",
          description: "Lock operation to perform",
        },
        lock_token: {
          type: "string",
          description: "Lock token (required for release operation)",
        },
        timeout_ms: {
          type: "integer",
          default: 5000,
          description: "Maximum wait time for lock acquisition in milliseconds",
        },
      },
      required: ["file_path"],
    },
  },
  {
    name: "s2t_validate_cli_readiness",
    description:
      "Validate CLI tool availability and API key health. Returns readiness status with degradation recommendations if tools are unavailable.",
    inputSchema: {
      type: "object",
      properties: {
        cli_tools: {
          type: "array",
          items: { type: "string" },
          default: ["codex"],
          description: "CLI tools to validate (e.g., ['codex', 'claude', 'git'])",
        },
        validate_api_keys: {
          type: "boolean",
          default: true,
          description: "Whether to validate API key health in addition to tool presence",
        },
      },
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
    version: "1.2.0",
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
