/**
 * S2T Accelerators MCP Server - Unit Tests
 *
 * Tests all 5 tool handlers with mocked API responses
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
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
  EmbedResponse,
  CloudFormationResponse,
  OAuthResponse,
  IamPolicyResponse,
  MfaComplianceResponse,
  DynamoDbDesignResponse,
  ErrorPatternsResponse,
  DataLakeReadinessResponse,
  CatalogResponse,
  UsageResponse,
  RiskClassificationResponse,
  TaskRoutingResponse,
  SystemPredictionResponse,
  RecoveryResponse,
  ResilienceResult,
  AgentMemoryResponse,
  TaskSubmissionResponse,
  TraceContextResponse,
  FileLockResponse,
  CliReadinessResponse,
} from "./handlers.js";

// Mock API client factory
function createMockApiClient(
  mockResponse: unknown
): ApiClient & { callApi: ReturnType<typeof vi.fn> } {
  return {
    callApi: vi.fn().mockResolvedValue(mockResponse),
  };
}

describe("handleEmbed", () => {
  const mockEmbedResponse: EmbedResponse = {
    chunks: [
      {
        text: "This is a test sentence for embedding generation.",
        metadata: { word_count: 8 },
      },
    ],
    summary: {
      total_chunks: 1,
      model: "amazon.titan-embed-text-v2:0",
      dimensions: 1024,
      processing_time_ms: 150,
    },
    usage: {
      tokens_used: 12,
      estimated_cost: 0.0001,
    },
  };

  it("should generate embeddings with default parameters", async () => {
    const mockClient = createMockApiClient(mockEmbedResponse);

    const result = await handleEmbed({ text: "Test text" }, mockClient);
    const parsed = JSON.parse(result);

    expect(mockClient.callApi).toHaveBeenCalledWith("/embed", "POST", {
      text: "Test text",
      model: "amazon.titan-embed-text-v2:0",
      chunk_size: 512,
      chunk_overlap: 50,
    });

    expect(parsed.summary).toBe(
      "Generated 1 embedding(s) using amazon.titan-embed-text-v2:0"
    );
    expect(parsed.dimensions).toBe(1024);
    expect(parsed.chunks).toHaveLength(1);
    expect(parsed.chunks[0].has_embedding).toBe(true);
    expect(parsed.usage.tokens_used).toBe(12);
  });

  it("should use custom model when specified", async () => {
    const mockClient = createMockApiClient(mockEmbedResponse);

    await handleEmbed(
      { text: "Test", model: "amazon.titan-embed-text-v1" },
      mockClient
    );

    expect(mockClient.callApi).toHaveBeenCalledWith("/embed", "POST", {
      text: "Test",
      model: "amazon.titan-embed-text-v1",
      chunk_size: 512,
      chunk_overlap: 50,
    });
  });

  it("should use custom chunk settings when specified", async () => {
    const mockClient = createMockApiClient(mockEmbedResponse);

    await handleEmbed(
      { text: "Test", chunk_size: 256, chunk_overlap: 25 },
      mockClient
    );

    expect(mockClient.callApi).toHaveBeenCalledWith("/embed", "POST", {
      text: "Test",
      model: "amazon.titan-embed-text-v2:0",
      chunk_size: 256,
      chunk_overlap: 25,
    });
  });

  it("should truncate long text previews", async () => {
    const longText = "A".repeat(150);
    const responseWithLongText: EmbedResponse = {
      ...mockEmbedResponse,
      chunks: [{ text: longText, metadata: { word_count: 1 } }],
    };
    const mockClient = createMockApiClient(responseWithLongText);

    const result = await handleEmbed({ text: longText }, mockClient);
    const parsed = JSON.parse(result);

    expect(parsed.chunks[0].text_preview).toHaveLength(103); // 100 + "..."
    expect(parsed.chunks[0].text_preview.endsWith("...")).toBe(true);
  });

  it("should handle multiple chunks", async () => {
    const multiChunkResponse: EmbedResponse = {
      ...mockEmbedResponse,
      chunks: [
        { text: "Chunk 1", metadata: { word_count: 2 } },
        { text: "Chunk 2", metadata: { word_count: 2 } },
        { text: "Chunk 3", metadata: { word_count: 2 } },
      ],
      summary: { ...mockEmbedResponse.summary, total_chunks: 3 },
    };
    const mockClient = createMockApiClient(multiChunkResponse);

    const result = await handleEmbed({ text: "Long text" }, mockClient);
    const parsed = JSON.parse(result);

    expect(parsed.chunks).toHaveLength(3);
    expect(parsed.chunks[0].index).toBe(0);
    expect(parsed.chunks[1].index).toBe(1);
    expect(parsed.chunks[2].index).toBe(2);
  });
});

describe("handleCloudFormation", () => {
  const mockCfnResponse: CloudFormationResponse = {
    template: `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyFunction:
    Type: AWS::Lambda::Function`,
    metadata: {
      format: "sam",
      resource_count: 1,
      resources: [{ logical_id: "MyFunction", type: "AWS::Lambda::Function" }],
    },
    warnings: [],
    usage: { estimated_cost: 0.01 },
  };

  it("should generate CloudFormation template with default parameters", async () => {
    const mockClient = createMockApiClient(mockCfnResponse);

    const result = await handleCloudFormation(
      { description: "A Lambda function" },
      mockClient
    );

    expect(mockClient.callApi).toHaveBeenCalledWith(
      "/generate/cloudformation",
      "POST",
      {
        description: "A Lambda function",
        format: "sam",
        include_parameters: true,
        include_outputs: true,
      }
    );

    expect(result).toContain("# Generated SAM Template");
    expect(result).toContain("Resources created: 1");
    expect(result).toContain("MyFunction (AWS::Lambda::Function)");
    expect(result).toContain("```yaml");
  });

  it("should use cloudformation format when specified", async () => {
    const mockClient = createMockApiClient(mockCfnResponse);

    await handleCloudFormation(
      { description: "Test", format: "cloudformation" },
      mockClient
    );

    expect(mockClient.callApi).toHaveBeenCalledWith(
      "/generate/cloudformation",
      "POST",
      expect.objectContaining({ format: "cloudformation" })
    );
  });

  it("should exclude parameters when specified", async () => {
    const mockClient = createMockApiClient(mockCfnResponse);

    await handleCloudFormation(
      { description: "Test", include_parameters: false },
      mockClient
    );

    expect(mockClient.callApi).toHaveBeenCalledWith(
      "/generate/cloudformation",
      "POST",
      expect.objectContaining({ include_parameters: false })
    );
  });

  it("should include warnings when present", async () => {
    const responseWithWarnings: CloudFormationResponse = {
      ...mockCfnResponse,
      warnings: [
        {
          code: "DEPRECATED_RUNTIME",
          message: "nodejs12.x is deprecated",
          recommendation: "Use nodejs18.x or nodejs20.x",
        },
      ],
    };
    const mockClient = createMockApiClient(responseWithWarnings);

    const result = await handleCloudFormation(
      { description: "Test" },
      mockClient
    );

    expect(result).toContain("## Warnings");
    expect(result).toContain("nodejs12.x is deprecated");
    expect(result).toContain("Use nodejs18.x or nodejs20.x");
  });

  it("should handle multiple resources", async () => {
    const multiResourceResponse: CloudFormationResponse = {
      ...mockCfnResponse,
      metadata: {
        format: "sam",
        resource_count: 3,
        resources: [
          { logical_id: "MyFunction", type: "AWS::Lambda::Function" },
          { logical_id: "MyTable", type: "AWS::DynamoDB::Table" },
          { logical_id: "MyBucket", type: "AWS::S3::Bucket" },
        ],
      },
    };
    const mockClient = createMockApiClient(multiResourceResponse);

    const result = await handleCloudFormation(
      { description: "Test" },
      mockClient
    );

    expect(result).toContain("Resources created: 3");
    expect(result).toContain("MyFunction (AWS::Lambda::Function)");
    expect(result).toContain("MyTable (AWS::DynamoDB::Table)");
    expect(result).toContain("MyBucket (AWS::S3::Bucket)");
  });
});

describe("handleOAuthValidate", () => {
  const mockOAuthResponse: OAuthResponse = {
    valid: true,
    provider: "Google",
    configuration: {
      authorization_endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
      token_endpoint: "https://oauth2.googleapis.com/token",
    },
    validation: {
      errors: [],
      warnings: [],
    },
    recommendations: [],
  };

  it("should validate OAuth configuration", async () => {
    const mockClient = createMockApiClient(mockOAuthResponse);

    const result = await handleOAuthValidate(
      {
        provider: "google",
        client_id: "123.apps.googleusercontent.com",
        redirect_uris: ["https://example.com/callback"],
        scopes: ["openid", "email"],
      },
      mockClient
    );

    expect(mockClient.callApi).toHaveBeenCalledWith("/validate/oauth", "POST", {
      provider: "google",
      client_id: "123.apps.googleusercontent.com",
      redirect_uris: ["https://example.com/callback"],
      scopes: ["openid", "email"],
      token_endpoint: undefined,
      authorization_endpoint: undefined,
    });

    expect(result).toContain("# OAuth Configuration Validation: Google");
    expect(result).toContain("**Status:** VALID");
    expect(result).toContain("## Endpoints");
  });

  it("should show errors when validation fails", async () => {
    const invalidResponse: OAuthResponse = {
      ...mockOAuthResponse,
      valid: false,
      validation: {
        errors: [
          {
            code: "INVALID_CLIENT_ID",
            message: "Client ID format is invalid",
          },
        ],
        warnings: [],
      },
    };
    const mockClient = createMockApiClient(invalidResponse);

    const result = await handleOAuthValidate(
      {
        provider: "google",
        client_id: "invalid",
        redirect_uris: ["https://example.com/callback"],
        scopes: ["openid"],
      },
      mockClient
    );

    expect(result).toContain("**Status:** INVALID");
    expect(result).toContain("## Errors");
    expect(result).toContain("[INVALID_CLIENT_ID] Client ID format is invalid");
  });

  it("should show warnings", async () => {
    const responseWithWarnings: OAuthResponse = {
      ...mockOAuthResponse,
      validation: {
        errors: [],
        warnings: [
          {
            code: "LOCALHOST_ONLY",
            message: "Only localhost redirect URI configured",
          },
        ],
      },
    };
    const mockClient = createMockApiClient(responseWithWarnings);

    const result = await handleOAuthValidate(
      {
        provider: "google",
        client_id: "123.apps.googleusercontent.com",
        redirect_uris: ["http://localhost:3000/callback"],
        scopes: ["openid"],
      },
      mockClient
    );

    expect(result).toContain("## Warnings");
    expect(result).toContain("[LOCALHOST_ONLY]");
  });

  it("should show recommendations", async () => {
    const responseWithRecommendations: OAuthResponse = {
      ...mockOAuthResponse,
      recommendations: [
        {
          field: "scopes",
          value: "profile",
          reason: "Add profile scope for user name access",
        },
      ],
    };
    const mockClient = createMockApiClient(responseWithRecommendations);

    const result = await handleOAuthValidate(
      {
        provider: "google",
        client_id: "123.apps.googleusercontent.com",
        redirect_uris: ["https://example.com/callback"],
        scopes: ["openid"],
      },
      mockClient
    );

    expect(result).toContain("## Recommendations");
    expect(result).toContain("**scopes:** `profile`");
    expect(result).toContain("Add profile scope for user name access");
  });

  it("should pass custom endpoints for generic provider", async () => {
    const mockClient = createMockApiClient(mockOAuthResponse);

    await handleOAuthValidate(
      {
        provider: "generic",
        client_id: "my-client",
        redirect_uris: ["https://example.com/callback"],
        scopes: ["read", "write"],
        token_endpoint: "https://custom.auth/token",
        authorization_endpoint: "https://custom.auth/authorize",
      },
      mockClient
    );

    expect(mockClient.callApi).toHaveBeenCalledWith("/validate/oauth", "POST", {
      provider: "generic",
      client_id: "my-client",
      redirect_uris: ["https://example.com/callback"],
      scopes: ["read", "write"],
      token_endpoint: "https://custom.auth/token",
      authorization_endpoint: "https://custom.auth/authorize",
    });
  });
});

describe("handleCatalog", () => {
  const mockCatalogResponse: CatalogResponse = {
    accelerators: [
      {
        id: "ACC-AI-001",
        name: "Vector Embeddings",
        endpoint: "/embed",
        description: "Generate vector embeddings",
        tier_access: ["free", "developer", "business", "enterprise"],
      },
      {
        id: "ACC-AWS-001",
        name: "CloudFormation Generator",
        endpoint: "/generate/cloudformation",
        description: "Generate CloudFormation templates",
        tier_access: ["developer", "business", "enterprise"],
      },
    ],
    tiers: {
      free: {
        name: "Free",
        price: 0,
        limits: { requestsPerMinute: 10, requestsPerMonth: 100 },
      },
      developer: {
        name: "Developer",
        price: 29,
        limits: { requestsPerMinute: 60, requestsPerMonth: 5000 },
      },
    },
    your_tier: "developer",
  };

  it("should return catalog with accelerators and tiers", async () => {
    const mockClient = createMockApiClient(mockCatalogResponse);

    const result = await handleCatalog(mockClient);

    expect(mockClient.callApi).toHaveBeenCalledWith("/catalog", "GET");

    expect(result).toContain("# S2T Accelerator Catalog");
    expect(result).toContain("**Your Tier:** developer");
    expect(result).toContain("## Available Accelerators");
    expect(result).toContain("### Vector Embeddings (ACC-AI-001)");
    expect(result).toContain("- Endpoint: `/embed`");
    expect(result).toContain(
      "- Available in: free, developer, business, enterprise"
    );
    expect(result).toContain("## Pricing Tiers");
    expect(result).toContain("**Free:** $0/mo - 10 req/min, 100/mo");
    expect(result).toContain("**Developer:** $29/mo - 60 req/min, 5000/mo");
  });

  it("should handle unlimited monthly requests", async () => {
    const unlimitedResponse: CatalogResponse = {
      ...mockCatalogResponse,
      tiers: {
        enterprise: {
          name: "Enterprise",
          price: 299,
          limits: { requestsPerMinute: 1000, requestsPerMonth: null },
        },
      },
    };
    const mockClient = createMockApiClient(unlimitedResponse);

    const result = await handleCatalog(mockClient);

    expect(result).toContain("**Enterprise:** $299/mo - 1000 req/min, unlimited/mo");
  });
});

describe("handleUsage", () => {
  const mockUsageResponse: UsageResponse = {
    tier: "developer",
    email: "test@example.com",
    period: "2026-01",
    usage: {
      requests: 150,
      last_request: "2026-01-24T10:30:00Z",
    },
    limits: {
      requests_per_minute: 60,
      requests_per_month: 5000,
    },
    remaining: {
      requests_this_month: 4850,
    },
    billing: {
      tier_price: 29,
      usage_charges: 0.5,
      period_total: 29.5,
    },
  };

  it("should return usage statistics", async () => {
    const mockClient = createMockApiClient(mockUsageResponse);

    const result = await handleUsage(mockClient);

    expect(mockClient.callApi).toHaveBeenCalledWith("/usage", "GET");

    expect(result).toContain("# S2T API Usage");
    expect(result).toContain("**Account:** test@example.com");
    expect(result).toContain("**Tier:** developer");
    expect(result).toContain("**Period:** 2026-01");
    expect(result).toContain("## Usage");
    expect(result).toContain("- Requests this month: 150");
    expect(result).toContain("- Remaining: 4850");
    expect(result).toContain("- Rate limit: 60/min");
    expect(result).toContain("- Monthly limit: 5000");
    expect(result).toContain("## Billing");
    expect(result).toContain("- Tier price: $29");
    expect(result).toContain("- Usage charges: $0.5");
    expect(result).toContain("- Period total: $29.5");
  });

  it("should handle zero usage", async () => {
    const zeroUsageResponse: UsageResponse = {
      ...mockUsageResponse,
      usage: { requests: 0, last_request: null },
      remaining: { requests_this_month: 5000 },
      billing: { tier_price: 29, usage_charges: 0, period_total: 29 },
    };
    const mockClient = createMockApiClient(zeroUsageResponse);

    const result = await handleUsage(mockClient);

    expect(result).toContain("- Requests this month: 0");
    expect(result).toContain("- Remaining: 5000");
    expect(result).toContain("- Usage charges: $0");
  });
});

describe("handleRiskClassify", () => {
  const mockRiskResponse: RiskClassificationResponse = {
    risk_level: "MEDIUM",
    score: 45,
    factors: [
      { name: "destructiveness", weight: 0.3, value: "moderate", contribution: 15 },
      { name: "reversibility", weight: 0.25, value: "reversible", contribution: 5 },
      { name: "blast_radius", weight: 0.25, value: "local", contribution: 10 },
      { name: "environment", weight: 0.2, value: "development", contribution: 15 },
    ],
    recommendation: "Proceed with logging. Monitor for unexpected side effects.",
    auto_approve: true,
    metadata: { processing_time_ms: 12, model_version: "1.0.0" },
  };

  it("should classify action risk with default environment", async () => {
    const mockClient = createMockApiClient(mockRiskResponse);
    const result = await handleRiskClassify({ action: "npm install express" }, mockClient);

    expect(mockClient.callApi).toHaveBeenCalledWith("/accelerators/risk/classify", "POST", {
      action: "npm install express",
      environment: "local",
      context: "development",
    });
    expect(result).toContain("# Action Risk Classification");
    expect(result).toContain("MEDIUM");
    expect(result).toContain("45");
  });

  it("should return risk factors and recommendation", async () => {
    const mockClient = createMockApiClient(mockRiskResponse);
    const result = await handleRiskClassify({ action: "rm -rf /tmp/cache" }, mockClient);

    expect(result).toContain("destructiveness");
    expect(result).toContain("Proceed with logging");
    expect(result).toContain("36 Production-Ready Tools");
  });

  it("should propagate API errors", async () => {
    const mockClient: ApiClient = {
      callApi: vi.fn().mockRejectedValue(new Error("Classification failed")),
    };
    await expect(handleRiskClassify({ action: "test" }, mockClient)).rejects.toThrow("Classification failed");
  });
});

describe("handleTaskRouting", () => {
  const mockRoutingResponse: TaskRoutingResponse = {
    best_match: {
      agent_id: "deployment-agent",
      name: "Deployment Agent",
      domain: "AWS deployment, CloudFront, S3 sync, infrastructure",
      similarity_score: 0.89,
      capabilities: ["s3-sync", "cloudfront-invalidation", "lambda-deploy"],
    },
    candidates: [
      {
        agent_id: "deployment-agent",
        name: "Deployment Agent",
        domain: "AWS deployment, CloudFront, S3 sync, infrastructure",
        similarity_score: 0.89,
        capabilities: ["s3-sync", "cloudfront-invalidation"],
      },
      {
        agent_id: "lambda-edge-agent",
        name: "Lambda Edge Agent",
        domain: "Lambda@Edge, CloudFront functions",
        similarity_score: 0.72,
        capabilities: ["lambda-edge", "cloudfront-functions"],
      },
    ],
    routing_method: "semantic",
    confidence: 0.89,
    metadata: { agents_evaluated: 54, processing_time_ms: 45 },
  };

  it("should route task to best-matching agent", async () => {
    const mockClient = createMockApiClient(mockRoutingResponse);
    const result = await handleTaskRouting(
      { task_description: "Deploy website to S3 and invalidate CloudFront cache" },
      mockClient
    );

    expect(mockClient.callApi).toHaveBeenCalledWith("/accelerators/agent/route", "POST", {
      task_description: "Deploy website to S3 and invalidate CloudFront cache",
      top_k: 5,
      include_capabilities: true,
    });
    expect(result).toContain("Deployment Agent");
    expect(result).toContain("89");
  });

  it("should return multiple candidates", async () => {
    const mockClient = createMockApiClient(mockRoutingResponse);
    const result = await handleTaskRouting(
      { task_description: "Deploy website", top_k: 3 },
      mockClient
    );

    expect(result).toContain("Deployment Agent");
    expect(result).toContain("Lambda Edge Agent");
    expect(result).toContain("36 Production-Ready Tools");
  });

  it("should propagate API errors", async () => {
    const mockClient: ApiClient = {
      callApi: vi.fn().mockRejectedValue(new Error("Routing failed")),
    };
    await expect(handleTaskRouting({ task_description: "test" }, mockClient)).rejects.toThrow("Routing failed");
  });
});

describe("handlePredictIssues", () => {
  const mockPredictionResponse: SystemPredictionResponse = {
    issues: [
      {
        category: "budget",
        severity: "HIGH",
        description: "Token budget projected to exhaust in 12 days",
        predicted_date: "2026-02-18",
        confidence: 0.85,
        recommended_action: "Increase monthly budget or reduce model usage",
      },
      {
        category: "dependencies",
        severity: "MEDIUM",
        description: "3 npm packages have known vulnerabilities",
        predicted_date: "2026-02-10",
        confidence: 0.92,
        recommended_action: "Run npm audit fix",
      },
    ],
    health_score: 72,
    summary: { total_predictions: 2, critical: 0, high: 1, medium: 1, low: 0 },
    metadata: { analysis_window_days: 30, processing_time_ms: 120 },
  };

  it("should return predictions with health score", async () => {
    const mockClient = createMockApiClient(mockPredictionResponse);
    const result = await handlePredictIssues({}, mockClient);

    expect(mockClient.callApi).toHaveBeenCalledWith("/accelerators/predict/issues", "POST", {
      system_state: undefined,
      analysis_window_days: 30,
    });
    expect(result).toContain("72");
    expect(result).toContain("budget");
  });

  it("should include severity and recommended actions", async () => {
    const mockClient = createMockApiClient(mockPredictionResponse);
    const result = await handlePredictIssues({ analysis_window_days: 60 }, mockClient);

    expect(result).toContain("HIGH");
    expect(result).toContain("Increase monthly budget");
    expect(result).toContain("npm audit fix");
  });

  it("should handle empty system state", async () => {
    const emptyResponse: SystemPredictionResponse = {
      ...mockPredictionResponse,
      issues: [],
      health_score: 100,
      summary: { total_predictions: 0, critical: 0, high: 0, medium: 0, low: 0 },
    };
    const mockClient = createMockApiClient(emptyResponse);
    const result = await handlePredictIssues({}, mockClient);

    expect(result).toContain("100");
    expect(result).toContain("36 Production-Ready Tools");
  });
});

describe("handleAutoRecovery", () => {
  const mockRecoveryResponse: RecoveryResponse = {
    matched: true,
    pattern_id: "ERR-ENOENT-001",
    error_type: "ENOENT",
    confidence: 0.95,
    recovery_steps: [
      { step: 1, action: "Check if parent directory exists", command: "ls -la /path/to/parent", expected_outcome: "Directory listing" },
      { step: 2, action: "Create missing directory", command: "mkdir -p /path/to/file", expected_outcome: "Directory created" },
      { step: 3, action: "Retry original operation", expected_outcome: "Operation succeeds" },
    ],
    historical_success_rate: 0.92,
    metadata: { patterns_checked: 24, processing_time_ms: 8 },
  };

  it("should match known error pattern", async () => {
    const mockClient = createMockApiClient(mockRecoveryResponse);
    const result = await handleAutoRecovery(
      { error_message: "ENOENT: no such file or directory" },
      mockClient
    );

    expect(mockClient.callApi).toHaveBeenCalledWith("/accelerators/recovery/attempt", "POST", {
      error_message: "ENOENT: no such file or directory",
      error_source: undefined,
      stack_trace: undefined,
      auto_execute: false,
    });
    expect(result).toContain("Pattern Found");
    expect(result).toContain("ENOENT");
  });

  it("should return no match for unknown patterns", async () => {
    const noMatchResponse: RecoveryResponse = {
      ...mockRecoveryResponse,
      matched: false,
      pattern_id: null,
      confidence: 0,
      recovery_steps: [],
      historical_success_rate: 0,
    };
    const mockClient = createMockApiClient(noMatchResponse);
    const result = await handleAutoRecovery(
      { error_message: "Unknown custom error XYZ" },
      mockClient
    );

    expect(result).toContain("No Match");
  });

  it("should include confidence and success history", async () => {
    const mockClient = createMockApiClient(mockRecoveryResponse);
    const result = await handleAutoRecovery(
      { error_message: "ENOENT error", error_source: "file-writer" },
      mockClient
    );

    expect(result).toContain("95");
    expect(result).toContain("92");
    expect(result).toContain("36 Production-Ready Tools");
  });
});

describe("handleResilienceExecute", () => {
  const mockResilienceResponse: ResilienceResult = {
    success: true,
    attempts: 2,
    total_latency_ms: 1523,
    circuit_breaker_state: "closed",
    last_error: null,
    metadata: { retry_config: { max_retries: 3, base_delay_ms: 1000, max_delay_ms: 30000 } },
  };

  it("should wrap operation with retry config", async () => {
    const mockClient = createMockApiClient(mockResilienceResponse);
    const result = await handleResilienceExecute(
      { operation_id: "api-call-123" },
      mockClient
    );

    expect(mockClient.callApi).toHaveBeenCalledWith("/accelerators/resilience/execute", "POST", {
      operation_id: "api-call-123",
      max_retries: 3,
      base_delay_ms: 1000,
      circuit_breaker_threshold: 5,
    });
    expect(result).toContain("SUCCESS");
    expect(result).toContain("2");
  });

  it("should report circuit breaker state", async () => {
    const openBreakerResponse: ResilienceResult = {
      ...mockResilienceResponse,
      success: false,
      circuit_breaker_state: "open",
      last_error: "Connection refused",
    };
    const mockClient = createMockApiClient(openBreakerResponse);
    const result = await handleResilienceExecute(
      { operation_id: "api-call-456", max_retries: 5 },
      mockClient
    );

    expect(result).toContain("FAILED");
    expect(result).toContain("open");
    expect(result).toContain("Connection refused");
  });

  it("should return execution metrics", async () => {
    const mockClient = createMockApiClient(mockResilienceResponse);
    const result = await handleResilienceExecute(
      { operation_id: "op-789" },
      mockClient
    );

    expect(result).toContain("1523");
    expect(result).toContain("closed");
    expect(result).toContain("36 Production-Ready Tools");
  });
});

describe("handleAgentMemory", () => {
  const mockMemoryResponse: AgentMemoryResponse = {
    operation: "store",
    success: true,
    entries: [
      {
        key: "last_task",
        value: { type: "deployment", target: "production" },
        namespace: "default",
        created_at: "2026-02-06T10:00:00Z",
        updated_at: "2026-02-06T10:00:00Z",
      },
    ],
    total_entries: 1,
    namespace: "default",
    metadata: { storage_used_bytes: 256, processing_time_ms: 5 },
  };

  it("should store memory with namespace isolation", async () => {
    const mockClient = createMockApiClient(mockMemoryResponse);
    const result = await handleAgentMemory(
      { operation: "store", agent_id: "ceo-agent", key: "last_task", value: { type: "deployment" } },
      mockClient
    );

    expect(mockClient.callApi).toHaveBeenCalledWith("/accelerators/agent/memory", "POST", {
      operation: "store",
      agent_id: "ceo-agent",
      key: "last_task",
      value: { type: "deployment" },
      namespace: "default",
      search_query: undefined,
    });
    expect(result).toContain("store");
  });

  it("should retrieve memory by agent and key", async () => {
    const retrieveResponse: AgentMemoryResponse = {
      ...mockMemoryResponse,
      operation: "retrieve",
    };
    const mockClient = createMockApiClient(retrieveResponse);
    const result = await handleAgentMemory(
      { operation: "retrieve", agent_id: "ceo-agent", key: "last_task" },
      mockClient
    );

    expect(result).toContain("retrieve");
    expect(result).toContain("last_task");
  });

  it("should search memory across namespaces", async () => {
    const searchResponse: AgentMemoryResponse = {
      ...mockMemoryResponse,
      operation: "search",
      entries: [
        { ...mockMemoryResponse.entries[0], key: "match1" },
        { ...mockMemoryResponse.entries[0], key: "match2" },
      ],
      total_entries: 2,
    };
    const mockClient = createMockApiClient(searchResponse);
    const result = await handleAgentMemory(
      { operation: "search", agent_id: "ceo-agent", search_query: "deployment" },
      mockClient
    );

    expect(result).toContain("search");
    expect(result).toContain("2");
  });

  it("should handle missing agent gracefully", async () => {
    const mockClient: ApiClient = {
      callApi: vi.fn().mockRejectedValue(new Error("Agent not found: unknown-agent")),
    };
    await expect(
      handleAgentMemory({ operation: "retrieve", agent_id: "unknown-agent" }, mockClient)
    ).rejects.toThrow("Agent not found");
  });
});

describe("handleAgentTask", () => {
  const mockTaskResponse: TaskSubmissionResponse = {
    task_id: "task-abc123",
    agent_id: "deployment-agent",
    status: "queued",
    queue_position: 3,
    estimated_wait_ms: 15000,
    metadata: { queue_depth: 5, processing_time_ms: 12 },
  };

  it("should submit task with required fields", async () => {
    const mockClient = createMockApiClient(mockTaskResponse);
    const result = await handleAgentTask(
      { agent_id: "deployment-agent", prompt: "Deploy to S3" },
      mockClient
    );

    expect(mockClient.callApi).toHaveBeenCalledWith("/accelerators/agent/task", "POST", {
      agent_id: "deployment-agent",
      prompt: "Deploy to S3",
      priority: "normal",
      trace_id: undefined,
    });
    expect(result).toContain("task-abc123");
    expect(result).toContain("queued");
  });

  it("should return queue position", async () => {
    const mockClient = createMockApiClient(mockTaskResponse);
    const result = await handleAgentTask(
      { agent_id: "deployment-agent", prompt: "Deploy", priority: "high" },
      mockClient
    );

    expect(result).toContain("3");
    expect(result).toContain("36 Production-Ready Tools");
  });

  it("should handle rejected tasks", async () => {
    const rejectedResponse: TaskSubmissionResponse = {
      ...mockTaskResponse,
      status: "rejected",
      queue_position: 0,
      estimated_wait_ms: 0,
    };
    const mockClient = createMockApiClient(rejectedResponse);
    const result = await handleAgentTask(
      { agent_id: "invalid-agent", prompt: "Test" },
      mockClient
    );

    expect(result).toContain("rejected");
  });
});

describe("handleTraceContext", () => {
  const mockTraceResponse: TraceContextResponse = {
    traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
    trace_id: "4bf92f3577b34da6a3ce929d0e0e4736",
    span_id: "00f067aa0ba902b7",
    version: "00",
    created_at: "2026-02-06T10:00:00Z",
    metadata: { format: "W3C Trace Context" },
  };

  it("should generate valid W3C traceparent", async () => {
    const mockClient = createMockApiClient(mockTraceResponse);
    const result = await handleTraceContext({}, mockClient);

    expect(mockClient.callApi).toHaveBeenCalledWith("/accelerators/trace/create", "POST", {
      parent_traceparent: undefined,
      service_name: "s2t-agent",
    });
    expect(result).toContain("4bf92f3577b34da6a3ce929d0e0e4736");
    expect(result).toContain("00f067aa0ba902b7");
  });

  it("should create child span from parent", async () => {
    const mockClient = createMockApiClient(mockTraceResponse);
    const result = await handleTraceContext(
      { parent_traceparent: "00-abc123-def456-01", service_name: "worker" },
      mockClient
    );

    expect(mockClient.callApi).toHaveBeenCalledWith("/accelerators/trace/create", "POST", {
      parent_traceparent: "00-abc123-def456-01",
      service_name: "worker",
    });
    expect(result).toContain("W3C Trace Context");
  });

  it("should include timestamp and version", async () => {
    const mockClient = createMockApiClient(mockTraceResponse);
    const result = await handleTraceContext({}, mockClient);

    expect(result).toContain("00");
    expect(result).toContain("2026-02-06");
    expect(result).toContain("36 Production-Ready Tools");
  });
});

describe("handleFileLock", () => {
  const mockLockResponse: FileLockResponse = {
    acquired: true,
    lock_token: "lock-xyz789",
    file_path: "/tmp/data.json",
    stale_cleaned: false,
    metadata: { wait_time_ms: 0, processing_time_ms: 2 },
  };

  it("should acquire lock and return token", async () => {
    const mockClient = createMockApiClient(mockLockResponse);
    const result = await handleFileLock(
      { file_path: "/tmp/data.json" },
      mockClient
    );

    expect(mockClient.callApi).toHaveBeenCalledWith("/accelerators/lock/acquire", "POST", {
      file_path: "/tmp/data.json",
      operation: "acquire",
      lock_token: undefined,
      timeout_ms: 5000,
    });
    expect(result).toContain("ACQUIRED");
    expect(result).toContain("lock-xyz789");
  });

  it("should detect and clean stale locks", async () => {
    const staleResponse: FileLockResponse = {
      ...mockLockResponse,
      stale_cleaned: true,
      metadata: { wait_time_ms: 100, processing_time_ms: 15 },
    };
    const mockClient = createMockApiClient(staleResponse);
    const result = await handleFileLock(
      { file_path: "/tmp/data.json" },
      mockClient
    );

    expect(result).toContain("ACQUIRED");
    expect(result).toContain("Stale");
  });

  it("should handle blocked lock", async () => {
    const blockedResponse: FileLockResponse = {
      ...mockLockResponse,
      acquired: false,
      lock_token: null,
      holder: "agent-abc",
      metadata: { wait_time_ms: 5000, processing_time_ms: 5002 },
    };
    const mockClient = createMockApiClient(blockedResponse);
    const result = await handleFileLock(
      { file_path: "/tmp/data.json", timeout_ms: 5000 },
      mockClient
    );

    expect(result).toContain("BLOCKED");
    expect(result).toContain("agent-abc");
    expect(result).toContain("36 Production-Ready Tools");
  });
});

describe("handleCliReadiness", () => {
  const mockCliResponse: CliReadinessResponse = {
    ready: true,
    checks: [
      { name: "codex", status: "pass", message: "Codex CLI available", version: "1.2.3" },
      { name: "codex-api-key", status: "pass", message: "API key valid" },
    ],
    degradation_mode: null,
    recommendations: [],
    metadata: { total_checks: 2, processing_time_ms: 3500 },
  };

  it("should validate CLI tool presence", async () => {
    const mockClient = createMockApiClient(mockCliResponse);
    const result = await handleCliReadiness({}, mockClient);

    expect(mockClient.callApi).toHaveBeenCalledWith("/accelerators/cli/validate", "POST", {
      cli_tools: ["codex"],
      validate_api_keys: true,
    });
    expect(result).toContain("READY");
    expect(result).toContain("codex");
    expect(result).toContain("PASS");
  });

  it("should validate API key health", async () => {
    const mockClient = createMockApiClient(mockCliResponse);
    const result = await handleCliReadiness(
      { cli_tools: ["codex", "claude"], validate_api_keys: true },
      mockClient
    );

    expect(result).toContain("API key valid");
    expect(result).toContain("1.2.3");
  });

  it("should return degradation recommendations on failure", async () => {
    const failedResponse: CliReadinessResponse = {
      ...mockCliResponse,
      ready: false,
      checks: [
        { name: "codex", status: "fail", message: "Codex CLI not found" },
        { name: "codex-api-key", status: "warn", message: "Cannot validate without CLI" },
      ],
      degradation_mode: "api-fallback",
      recommendations: ["Install Codex CLI: npm i -g @openai/codex", "Set OPENAI_API_KEY environment variable"],
    };
    const mockClient = createMockApiClient(failedResponse);
    const result = await handleCliReadiness({}, mockClient);

    expect(result).toContain("NOT READY");
    expect(result).toContain("api-fallback");
    expect(result).toContain("Install Codex CLI");
    expect(result).toContain("36 Production-Ready Tools");
  });
});

describe("handleIamPolicyValidate", () => {
  const mockIamResponse: IamPolicyResponse = {
    status: "WARN",
    score: 62,
    summary: {
      statements_analyzed: 3,
      total_findings: 4,
      critical: 1,
      high: 2,
      medium: 1,
      low: 0,
    },
    findings: [
      {
        severity: "CRITICAL",
        code: "WILDCARD_ACTION",
        statement: 0,
        message: "Statement uses wildcard (*) for all actions",
        action: "*",
        resource: "*",
        recommendation: "Replace with specific actions needed",
      },
      {
        severity: "HIGH",
        code: "WILDCARD_RESOURCE",
        statement: 1,
        message: "Statement uses wildcard resource",
        action: "s3:GetObject",
        resource: "*",
        recommendation: "Scope to specific S3 bucket ARNs",
      },
      {
        severity: "HIGH",
        code: "DANGEROUS_ACTION",
        statement: 2,
        message: "Statement allows iam:PassRole",
        action: "iam:PassRole",
        recommendation: "Restrict PassRole to specific roles",
      },
      {
        severity: "MEDIUM",
        code: "MISSING_CONDITION",
        statement: 1,
        message: "No condition keys restrict access",
        recommendation: "Add condition keys for MFA or source IP",
      },
    ],
    suggestions: [
      {
        priority: 1,
        title: "Remove wildcard actions",
        description: "Replace * with specific required actions",
        actions: ["s3:GetObject", "s3:PutObject"],
      },
    ],
    scoped_alternatives: {
      "s3:*": {
        read: ["s3:GetObject", "s3:ListBucket", "s3:GetBucketLocation"],
        write: ["s3:PutObject", "s3:DeleteObject"],
        admin: ["s3:CreateBucket", "s3:DeleteBucket", "s3:PutBucketPolicy"],
      },
    },
    metadata: {
      policy_version: "2012-10-17",
      processing_time_ms: 45,
    },
  };

  it("should validate IAM policy and return findings grouped by severity", async () => {
    const mockClient = createMockApiClient(mockIamResponse);
    const policyDoc = { Version: "2012-10-17", Statement: [{ Effect: "Allow", Action: "*", Resource: "*" }] };

    const result = await handleIamPolicyValidate(
      { policy_document: policyDoc },
      mockClient
    );

    expect(mockClient.callApi).toHaveBeenCalledWith("/validate/iam-policy", "POST", {
      policy_document: policyDoc,
      resource_type: "general",
      suggest_improvements: true,
    });

    expect(result).toContain("# IAM Policy Validation Report");
    expect(result).toContain("WARN");
    expect(result).toContain("62/100");
    expect(result).toContain("Critical");
    expect(result).toContain("WILDCARD_ACTION");
    expect(result).toContain("High");
    expect(result).toContain("WILDCARD_RESOURCE");
    expect(result).toContain("Medium");
    expect(result).toContain("Scoped Alternatives");
    expect(result).toContain("s3:GetObject");
  });

  it("should handle a passing policy with no findings", async () => {
    const passingResponse: IamPolicyResponse = {
      status: "PASS",
      score: 100,
      summary: {
        statements_analyzed: 2,
        total_findings: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
      findings: [],
      suggestions: [],
      metadata: {
        policy_version: "2012-10-17",
        processing_time_ms: 12,
      },
    };
    const mockClient = createMockApiClient(passingResponse);

    const result = await handleIamPolicyValidate(
      { policy_document: "{}", resource_type: "s3" },
      mockClient
    );

    expect(result).toContain("PASS");
    expect(result).toContain("100/100");
    expect(result).not.toContain("## Findings");
    expect(result).not.toContain("## Scoped Alternatives");
  });

  it("should propagate API errors", async () => {
    const mockClient: ApiClient = {
      callApi: vi.fn().mockRejectedValue(new Error("Policy validation failed")),
    };
    await expect(
      handleIamPolicyValidate({ policy_document: "{}" }, mockClient)
    ).rejects.toThrow("Policy validation failed");
  });
});

describe("handleMfaCompliance", () => {
  const mockMfaResponse: MfaComplianceResponse = {
    status: "AT_RISK",
    compliance_score: 55,
    summary: {
      total_findings: 3,
      critical: 1,
      high: 1,
      medium: 1,
      low: 0,
      users_checked: 5,
      policies_checked: 2,
      root_checked: true,
    },
    findings: [
      {
        rule_id: "MFA-001",
        severity: "CRITICAL",
        user: "admin-user",
        finding: "Admin user has console access without MFA",
        recommendation: "Enable MFA for admin-user immediately",
      },
      {
        rule_id: "MFA-003",
        severity: "HIGH",
        user: "dev-user",
        finding: "Privileged user has programmatic access without MFA condition",
        recommendation: "Add aws:MultiFactorAuthPresent condition to policies",
      },
      {
        rule_id: "MFA-005",
        severity: "MEDIUM",
        policy: "DeveloperPolicy",
        finding: "Policy lacks MFA condition for sensitive actions",
        recommendation: "Add MFA condition for iam:* and s3:Delete* actions",
      },
    ],
    recommendations: [
      {
        priority: 1,
        title: "Enable MFA for all admin users",
        description: "All users with admin privileges must have MFA enabled",
        actions: ["Enable virtual MFA for admin-user", "Verify hardware token for root"],
      },
    ],
  };

  it("should return compliance report with score and findings", async () => {
    const mockClient = createMockApiClient(mockMfaResponse);
    const users = [
      { username: "admin-user", has_console_access: true, mfa_enabled: false, is_admin: true },
    ];

    const result = await handleMfaCompliance({ users }, mockClient);

    expect(mockClient.callApi).toHaveBeenCalledWith("/validate/mfa-compliance", "POST", {
      users,
      root_account: undefined,
      policies: undefined,
    });

    expect(result).toContain("# MFA Compliance Report");
    expect(result).toContain("AT_RISK");
    expect(result).toContain("55/100");
    expect(result).toContain("Users checked: 5");
    expect(result).toContain("MFA-001");
    expect(result).toContain("Admin user has console access without MFA");
    expect(result).toContain("Enable MFA for all admin users");
  });

  it("should handle fully compliant state with no findings", async () => {
    const compliantResponse: MfaComplianceResponse = {
      status: "COMPLIANT",
      compliance_score: 100,
      summary: {
        total_findings: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        users_checked: 3,
        policies_checked: 2,
        root_checked: true,
      },
      findings: [],
      recommendations: [],
    };
    const mockClient = createMockApiClient(compliantResponse);

    const result = await handleMfaCompliance({}, mockClient);

    expect(result).toContain("COMPLIANT");
    expect(result).toContain("100/100");
    expect(result).not.toContain("## Findings");
    expect(result).not.toContain("## Recommendations");
  });

  it("should propagate API errors", async () => {
    const mockClient: ApiClient = {
      callApi: vi.fn().mockRejectedValue(new Error("MFA check failed")),
    };
    await expect(
      handleMfaCompliance({ users: [] }, mockClient)
    ).rejects.toThrow("MFA check failed");
  });
});

describe("handleDynamoDbDesign", () => {
  const mockDynamoResponse: DynamoDbDesignResponse = {
    design: {
      table_name: "S2T-SingleTable",
      key_schema: { PK: { type: "S" }, SK: { type: "S" } },
      gsis: [
        { name: "GSI1", partition_key: { name: "GSI1PK", type: "S" }, sort_key: { name: "GSI1SK", type: "S" } },
        { name: "GSI2", partition_key: { name: "GSI2PK", type: "S" } },
      ],
      entity_mappings: [
        { entity: "User", pk: "USER#<userId>", sk: "PROFILE" },
        { entity: "Order", pk: "USER#<userId>", sk: "ORDER#<orderId>" },
      ],
      access_pattern_mappings: [
        { pattern: "Get user by ID", operation: "GetItem", pk: "USER#<id>", sk: "PROFILE" },
        { pattern: "List orders by user", operation: "Query", pk: "USER#<id>", sk: "begins_with(ORDER#)" },
      ],
      sample_items: [
        { PK: "USER#123", SK: "PROFILE", name: "Test User" },
      ],
    },
    cloudformation_template: {
      AWSTemplateFormatVersion: "2010-09-09",
      Resources: { SingleTable: { Type: "AWS::DynamoDB::Table" } },
    },
    summary: {
      entities: 2,
      access_patterns: 2,
      gsis_required: 2,
    },
  };

  it("should generate DynamoDB design with GSIs and entity mappings", async () => {
    const mockClient = createMockApiClient(mockDynamoResponse);
    const entities = [
      { name: "User", attributes: ["userId", "name", "email"] },
      { name: "Order", attributes: ["orderId", "userId", "total"] },
    ];
    const accessPatterns = ["Get user by ID", "List orders by user"];

    const result = await handleDynamoDbDesign(
      { entities, access_patterns: accessPatterns },
      mockClient
    );

    expect(mockClient.callApi).toHaveBeenCalledWith("/generate/dynamodb-design", "POST", {
      entities,
      access_patterns: accessPatterns,
      options: undefined,
    });

    expect(result).toContain("# DynamoDB Single-Table Design");
    expect(result).toContain("S2T-SingleTable");
    expect(result).toContain("Entities:** 2");
    expect(result).toContain("Access Patterns:** 2");
    expect(result).toContain("GSIs Required:** 2");
    expect(result).toContain("GSI1");
    expect(result).toContain("GSI2");
    expect(result).toContain("Entity Mappings");
    expect(result).toContain("CloudFormation Template");
  });

  it("should handle design with no GSIs", async () => {
    const noGsiResponse: DynamoDbDesignResponse = {
      ...mockDynamoResponse,
      design: {
        ...mockDynamoResponse.design,
        gsis: [],
      },
      summary: { entities: 1, access_patterns: 1, gsis_required: 0 },
    };
    const mockClient = createMockApiClient(noGsiResponse);

    const result = await handleDynamoDbDesign(
      { entities: [{ name: "User" }], access_patterns: ["Get user by ID"] },
      mockClient
    );

    expect(result).toContain("GSIs Required:** 0");
    expect(result).not.toContain("## Global Secondary Indexes");
  });

  it("should propagate API errors", async () => {
    const mockClient: ApiClient = {
      callApi: vi.fn().mockRejectedValue(new Error("Design generation failed")),
    };
    await expect(
      handleDynamoDbDesign({ entities: [], access_patterns: [] }, mockClient)
    ).rejects.toThrow("Design generation failed");
  });
});

describe("handleErrorPatterns", () => {
  const mockErrorResponse: ErrorPatternsResponse = {
    summary: {
      total_errors: 150,
      unique_patterns: 5,
      critical_count: 2,
      high_count: 3,
      trend: "increasing",
      trend_change_percent: 25,
    },
    patterns: [
      {
        type: "timeout",
        category: "network",
        severity: "HIGH",
        count: 45,
        percentage: 30,
        common_causes: ["DNS resolution delay", "Backend overloaded"],
        remediation: ["Increase timeout to 30s", "Add retry with backoff"],
        sample_errors: [{ message: "ETIMEDOUT: connection timed out", timestamp: "2026-02-06T10:00:00Z" }],
      },
      {
        type: "auth_failure",
        category: "security",
        severity: "MEDIUM",
        count: 20,
        percentage: 13,
        common_causes: ["Expired tokens", "Invalid credentials"],
        remediation: ["Implement token refresh", "Check credential rotation"],
        sample_errors: [{ message: "401 Unauthorized" }],
      },
    ],
    recommendations: [
      {
        priority: 1,
        category: "network",
        issue: "Timeout errors increasing 25%",
        actions: ["Add circuit breaker pattern", "Scale backend horizontally"],
      },
    ],
  };

  it("should analyze error patterns and return summary with trends", async () => {
    const mockClient = createMockApiClient(mockErrorResponse);
    const errors = [
      { message: "ETIMEDOUT: connection timed out", source: "api-gateway" },
      { message: "401 Unauthorized", source: "auth-service" },
    ];

    const result = await handleErrorPatterns({ errors }, mockClient);

    expect(mockClient.callApi).toHaveBeenCalledWith("/analyze/error-patterns", "POST", {
      errors,
      include_ai_analysis: true,
    });

    expect(result).toContain("# Error Pattern Analysis");
    expect(result).toContain("Total Errors:** 150");
    expect(result).toContain("Unique Patterns:** 5");
    expect(result).toContain("increasing");
    expect(result).toContain("+25%");
    expect(result).toContain("TIMEOUT");
    expect(result).toContain("DNS resolution delay");
    expect(result).toContain("Timeout errors increasing 25%");
  });

  it("should handle empty error logs with no patterns", async () => {
    const emptyResponse: ErrorPatternsResponse = {
      summary: {
        total_errors: 0,
        unique_patterns: 0,
        critical_count: 0,
        high_count: 0,
        trend: "stable",
        trend_change_percent: 0,
      },
      patterns: [],
      recommendations: [],
    };
    const mockClient = createMockApiClient(emptyResponse);

    const result = await handleErrorPatterns({ errors: [] }, mockClient);

    expect(result).toContain("Total Errors:** 0");
    expect(result).toContain("stable");
    expect(result).not.toContain("## Error Patterns");
    expect(result).not.toContain("## Priority Actions");
  });

  it("should propagate API errors", async () => {
    const mockClient: ApiClient = {
      callApi: vi.fn().mockRejectedValue(new Error("Error analysis failed")),
    };
    await expect(
      handleErrorPatterns({ errors: [] }, mockClient)
    ).rejects.toThrow("Error analysis failed");
  });
});

describe("handleDataLakeReadiness", () => {
  const mockDataLakeResponse: DataLakeReadinessResponse = {
    status: "PARTIALLY_READY",
    overall_score: 65,
    summary: {
      ready_for_production: false,
      categories_evaluated: 5,
      total_checks: 22,
      passed: 14,
      failed: 5,
      warnings: 3,
    },
    category_scores: {
      storage: { score: 80, passed: 4, failed: 1 },
      catalog: { score: 75, passed: 3, failed: 1 },
      security: { score: 50, passed: 2, failed: 3 },
      performance: { score: 70, passed: 3, failed: 1 },
      operations: { score: 55, passed: 2, failed: 2 },
    },
    recommendations: [
      {
        priority: 1,
        category: "security",
        title: "Enable encryption at rest",
        items: [
          { check: "sec_001", recommendation: "Enable SSE-S3 or SSE-KMS on all buckets" },
          { check: "sec_003", recommendation: "Enable VPC endpoints for S3 access" },
        ],
      },
    ],
  };

  it("should assess data lake readiness with category scores", async () => {
    const mockClient = createMockApiClient(mockDataLakeResponse);
    const storage = { s3_001: true, s3_002: true, s3_003: false };

    const result = await handleDataLakeReadiness({ storage }, mockClient);

    expect(mockClient.callApi).toHaveBeenCalledWith("/check/data-lake-readiness", "POST", {
      storage,
      catalog: undefined,
      security: undefined,
      performance: undefined,
      operations: undefined,
    });

    expect(result).toContain("# Data Lake Readiness Assessment");
    expect(result).toContain("PARTIALLY_READY");
    expect(result).toContain("65/100");
    expect(result).toContain("Production Ready:** No");
    expect(result).toContain("STORAGE");
    expect(result).toContain("80/100");
    expect(result).toContain("SECURITY");
    expect(result).toContain("50/100");
    expect(result).toContain("Enable encryption at rest");
  });

  it("should handle fully ready data lake with no recommendations", async () => {
    const readyResponse: DataLakeReadinessResponse = {
      status: "READY",
      overall_score: 95,
      summary: {
        ready_for_production: true,
        categories_evaluated: 5,
        total_checks: 22,
        passed: 22,
        failed: 0,
        warnings: 0,
      },
      category_scores: {
        storage: { score: 100, passed: 5, failed: 0 },
        security: { score: 90, passed: 4, failed: 0 },
      },
      recommendations: [],
    };
    const mockClient = createMockApiClient(readyResponse);

    const result = await handleDataLakeReadiness({}, mockClient);

    expect(result).toContain("READY");
    expect(result).toContain("95/100");
    expect(result).toContain("Production Ready:** Yes");
    expect(result).not.toContain("## Recommendations");
  });

  it("should propagate API errors", async () => {
    const mockClient: ApiClient = {
      callApi: vi.fn().mockRejectedValue(new Error("Readiness check failed")),
    };
    await expect(
      handleDataLakeReadiness({}, mockClient)
    ).rejects.toThrow("Readiness check failed");
  });
});

describe("Input validation guards", () => {
  const dummyClient = createMockApiClient({});

  it("handleRiskClassify should reject missing action parameter", async () => {
    await expect(handleRiskClassify({}, dummyClient)).rejects.toThrow(
      "Required parameter 'action' must be a non-empty string"
    );
    await expect(handleRiskClassify({ action: 123 }, dummyClient)).rejects.toThrow(
      "Required parameter 'action' must be a non-empty string"
    );
    await expect(handleRiskClassify({ action: "" }, dummyClient)).rejects.toThrow(
      "Required parameter 'action' must be a non-empty string"
    );
  });

  it("handleTaskRouting should reject missing task_description parameter", async () => {
    await expect(handleTaskRouting({}, dummyClient)).rejects.toThrow(
      "Required parameter 'task_description' must be a non-empty string"
    );
    await expect(handleTaskRouting({ task_description: 42 }, dummyClient)).rejects.toThrow(
      "Required parameter 'task_description' must be a non-empty string"
    );
  });

  it("handleAutoRecovery should reject missing error_message parameter", async () => {
    await expect(handleAutoRecovery({}, dummyClient)).rejects.toThrow(
      "Required parameter 'error_message' must be a non-empty string"
    );
    await expect(handleAutoRecovery({ error_message: null }, dummyClient)).rejects.toThrow(
      "Required parameter 'error_message' must be a non-empty string"
    );
  });

  it("handleResilienceExecute should reject missing operation_id parameter", async () => {
    await expect(handleResilienceExecute({}, dummyClient)).rejects.toThrow(
      "Required parameter 'operation_id' must be a non-empty string"
    );
    await expect(handleResilienceExecute({ operation_id: "" }, dummyClient)).rejects.toThrow(
      "Required parameter 'operation_id' must be a non-empty string"
    );
  });

  it("handleAgentMemory should reject missing operation and agent_id parameters", async () => {
    await expect(handleAgentMemory({}, dummyClient)).rejects.toThrow(
      "Required parameter 'operation' must be a non-empty string"
    );
    await expect(handleAgentMemory({ operation: "store" }, dummyClient)).rejects.toThrow(
      "Required parameter 'agent_id' must be a non-empty string"
    );
  });

  it("handleAgentTask should reject missing agent_id and prompt parameters", async () => {
    await expect(handleAgentTask({}, dummyClient)).rejects.toThrow(
      "Required parameter 'agent_id' must be a non-empty string"
    );
    await expect(handleAgentTask({ agent_id: "agent-1" }, dummyClient)).rejects.toThrow(
      "Required parameter 'prompt' must be a non-empty string"
    );
  });

  it("handleFileLock should reject missing file_path parameter", async () => {
    await expect(handleFileLock({}, dummyClient)).rejects.toThrow(
      "Required parameter 'file_path' must be a non-empty string"
    );
    await expect(handleFileLock({ file_path: 42 }, dummyClient)).rejects.toThrow(
      "Required parameter 'file_path' must be a non-empty string"
    );
  });
});

describe("Error handling", () => {
  it("should propagate API errors", async () => {
    const mockClient: ApiClient = {
      callApi: vi.fn().mockRejectedValue(new Error("API rate limit exceeded")),
    };

    await expect(handleEmbed({ text: "Test" }, mockClient)).rejects.toThrow(
      "API rate limit exceeded"
    );
  });

  it("should handle network errors", async () => {
    const mockClient: ApiClient = {
      callApi: vi.fn().mockRejectedValue(new Error("Network error")),
    };

    await expect(handleCatalog(mockClient)).rejects.toThrow("Network error");
  });
});
